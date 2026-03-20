from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.models import Game, StatcastEvent
from config import SessionLocal, is_barrel
from scraper.players import normalize_player_name, resolve_pitcher_display

app = FastAPI(title="Baseball Game Log API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    """FastAPI dependency that yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}


@app.get("/games")
async def list_games(db: Session = Depends(get_db)):
    """List all attended games."""
    games = (
        db.query(Game)
        .filter(Game.attended.is_(True))
        .order_by(Game.date.desc())
        .all()
    )
    return {
        "games": [
            {
                "id": game.id,
                "date": str(game.date),
                "home_team": game.home_team,
                "away_team": game.away_team,
                "home_score": game.home_score,
                "away_score": game.away_score,
                "venue": getattr(game, "venue_name", None) or getattr(game, "venue", None),
                "source": game.source,
            }
            for game in games
        ],
        "total": len(games),
    }


# ---------------- Statcast API -----------------


@app.get("/statcast/longest-homers")
async def longest_homers(
    limit: int = Query(default=100, le=500),
    year: int | None = None,
    db: Session = Depends(get_db),
):
    """Return longest home runs (distance desc) across attended games."""
    query = (
        db.query(StatcastEvent, Game)
        .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
        .filter(Game.attended.is_(True))
        .filter(StatcastEvent.hit_distance_sc.isnot(None))
        .filter(StatcastEvent.event_type == "home_run")
    )

    if year is not None:
        from sqlalchemy import extract

        query = query.filter(extract("year", Game.date) == year)

    rows = query.order_by(StatcastEvent.hit_distance_sc.desc()).limit(limit).all()
    return {
        "homers": [
            {
                "distance": ev.hit_distance_sc,
                "launch_speed": ev.launch_speed,
                "launch_angle": ev.launch_angle,
                "batter": normalize_player_name(ev.batter_name),
                "pitcher": resolve_pitcher_display(ev.pitcher_name),
                "date": g.date.isoformat(),
                "game_pk": ev.mlb_game_pk,
            }
            for ev, g in rows
        ]
    }


# --------- WPA endpoints ----------


@app.get("/statcast/wpa/leaders")
async def wpa_leaders(
    limit: int = Query(default=10, le=100),
    db: Session = Depends(get_db),
):
    """Return top hitters by cumulative WPA across attended games."""
    rows = (
        db.query(
            StatcastEvent.batter_name.label("player"),
            func.sum(StatcastEvent.wpa).label("wpa"),
        )
        .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
        .filter(Game.attended.is_(True), StatcastEvent.wpa.isnot(None))
        .filter(StatcastEvent.wpa.between(-1.0, 1.0))
        .group_by(StatcastEvent.batter_name)
        .order_by(func.sum(StatcastEvent.wpa).desc())
        .limit(limit)
        .all()
    )
    return {"leaders": [{"player": r.player, "wpa": round(r.wpa, 3)} for r in rows]}


@app.get("/statcast/wpa/player/{player_name}")
async def player_wpa_breakdown(player_name: str, db: Session = Depends(get_db)):
    """Return game-by-game WPA breakdown for a specific player."""
    rows = (
        db.query(
            StatcastEvent.wpa,
            StatcastEvent.event_datetime,
            StatcastEvent.event_type,
            StatcastEvent.raw_description,
            Game.date,
            Game.home_team,
            Game.away_team,
        )
        .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
        .filter(
            Game.attended.is_(True),
            StatcastEvent.batter_name == player_name,
            StatcastEvent.wpa.isnot(None),
        )
        .order_by(Game.date.desc(), StatcastEvent.event_datetime)
        .all()
    )

    games: dict[str, dict] = {}
    for row in rows:
        game_key = f"{row.date}_{row.away_team}@{row.home_team}"
        if game_key not in games:
            games[game_key] = {
                "date": str(row.date),
                "matchup": f"{row.away_team} @ {row.home_team}",
                "events": [],
                "total_wpa": 0,
            }
        games[game_key]["events"].append(
            {
                "wpa": round(row.wpa, 3),
                "description": row.event_type or row.raw_description,
                "event_datetime": row.event_datetime,
            }
        )
        games[game_key]["total_wpa"] += row.wpa

    game_list = sorted(games.values(), key=lambda x: x["date"], reverse=True)
    for game in game_list:
        game["total_wpa"] = round(game["total_wpa"], 3)

    return {
        "player": player_name,
        "games": game_list,
        "total_wpa": round(sum(g["total_wpa"] for g in game_list), 3),
    }


@app.get("/statcast/barrel-map")
async def barrel_map_data(year: int | None = None, db: Session = Depends(get_db)):
    """Return exit velocity vs launch angle data for barrel map visualization."""
    query = (
        db.query(
            StatcastEvent.launch_speed,
            StatcastEvent.launch_angle,
            StatcastEvent.batter_name,
            StatcastEvent.pitcher_name,
            StatcastEvent.event_type,
            StatcastEvent.raw_description,
            StatcastEvent.hit_distance_sc,
            Game.date,
            Game.home_team,
            Game.away_team,
        )
        .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
        .filter(
            Game.attended.is_(True),
            StatcastEvent.launch_speed.isnot(None),
            StatcastEvent.launch_angle.isnot(None),
        )
    )

    if year is not None:
        from sqlalchemy import extract

        query = query.filter(extract("year", Game.date) == year)

    rows = query.all()

    def _categorize(event_type: str | None) -> str:
        et = (event_type or "").lower()
        if et == "home_run":
            return "home_run"
        if any(w in et for w in ("out", "error", "fielders_choice")):
            return "out"
        return "hit"

    batted_balls = [
        {
            "exit_velocity": row.launch_speed,
            "launch_angle": row.launch_angle,
            "batter": row.batter_name,
            "pitcher": resolve_pitcher_display(row.pitcher_name),
            "outcome": _categorize(row.event_type),
            "is_barrel": is_barrel(row.launch_angle, row.launch_speed),
            "date": str(row.date),
            "matchup": f"{row.away_team} @ {row.home_team}",
            "description": row.event_type or row.raw_description,
            "distance": row.hit_distance_sc,
        }
        for row in rows
    ]

    return {"batted_balls": batted_balls, "total_balls": len(batted_balls)}
