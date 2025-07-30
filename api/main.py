from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Game
from api.models import StatcastEvent

import httpx
from sqlalchemy import func

name_cache: dict[int,str] = {}

def lookup_player(pid: int) -> str:
    if pid in name_cache:
        return name_cache[pid]
    url = f"https://statsapi.mlb.com/api/v1/people/{pid}"
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        full = data["people"][0]["fullName"]
        name_cache[pid] = full
        return full
    except Exception:
        return str(pid)

# Removed bogus distance calculation - now using real Statcast hit_distance_sc

app = FastAPI(title="Baseball Game Log API")

# Allow CORS for browser calls from Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/game_log")
if "+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+asyncpg", "+psycopg2")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}


@app.get("/games")
async def list_games():
    """List all attended games."""
    db = SessionLocal()
    try:
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
            "total": len(games)
        }
    finally:
        db.close()


# ---------------- Statcast API -----------------


@app.get("/statcast/longest-homers")
async def longest_homers(limit: int = 100):
    """Return longest home runs (distance desc) across attended games."""
    db = SessionLocal()
    try:
        # Get home runs with actual Statcast distance data
        rows = (
            db.query(StatcastEvent, Game)
            .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
            .filter(Game.attended.is_(True))
            .filter(StatcastEvent.hit_distance_sc.isnot(None))
            .filter(StatcastEvent.event_type == 'home_run')
            .order_by(StatcastEvent.hit_distance_sc.desc())
            .limit(limit)
            .all()
        )
        result = []
        for ev, g in rows:
            # Normalize names
            batter = ev.batter_name or ""
            if "," in batter:
                last, first = [part.strip() for part in batter.split(",", 1)]
                batter = f"{first} {last}"
            pitcher = ev.pitcher_name or ""
            if pitcher.isdigit():
                pitcher = lookup_player(int(pitcher))
            elif "," in pitcher:
                last, first = [part.strip() for part in pitcher.split(",",1)]
                pitcher = f"{first} {last}"

            result.append(
                {
                    "distance": ev.hit_distance_sc,  # Use real Statcast distance
                    "launch_speed": ev.launch_speed,
                    "launch_angle": ev.launch_angle,
                    "batter": batter,
                    "pitcher": pitcher,
                    "date": g.date.isoformat(),
                    "game_pk": ev.mlb_game_pk,
                }
            )
        
        return {"homers": result}  # Already sorted by distance DESC in query
    finally:
        db.close()


# --------- WPA endpoints ----------


@app.get("/statcast/wpa/leaders")
async def wpa_leaders(limit: int = 10):
    """Return top hitters by cumulative WPA across attended games."""
    db = SessionLocal()
    try:
        rows = (
            db.query(
                StatcastEvent.batter_name.label("player"),
                func.sum(StatcastEvent.wpa).label("wpa")
            )
            .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
            .filter(Game.attended.is_(True), StatcastEvent.wpa.isnot(None))
            # Basic data validation: exclude extreme outlier WPA values that indicate corruption
            .filter(StatcastEvent.wpa.between(-1.0, 1.0))
            .group_by(StatcastEvent.batter_name)
            .order_by(func.sum(StatcastEvent.wpa).desc())
            .limit(limit)
            .all()
        )
        return {"leaders": [{"player": r.player, "wpa": round(r.wpa,3)} for r in rows]}
    finally:
        db.close()


@app.get("/statcast/wpa/player/{player_name}")
async def player_wpa_breakdown(player_name: str):
    """Return game-by-game WPA breakdown for a specific player."""
    db = SessionLocal()
    try:
        rows = (
            db.query(
                StatcastEvent.wpa,
                StatcastEvent.event_datetime,
                StatcastEvent.event_type,
                StatcastEvent.raw_description,
                Game.date,
                Game.home_team,
                Game.away_team
            )
            .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
            .filter(
                Game.attended.is_(True),
                StatcastEvent.batter_name == player_name,
                StatcastEvent.wpa.isnot(None)
            )
            .order_by(Game.date.desc(), StatcastEvent.event_datetime)
            .all()
        )
        
        # Group by game
        games = {}
        for row in rows:
            game_key = f"{row.date}_{row.away_team}@{row.home_team}"
            if game_key not in games:
                games[game_key] = {
                    "date": str(row.date),
                    "matchup": f"{row.away_team} @ {row.home_team}",
                    "events": [],
                    "total_wpa": 0
                }
            games[game_key]["events"].append({
                "wpa": round(row.wpa, 3),
                "description": row.event_type or row.raw_description,
                "event_datetime": row.event_datetime
            })
            games[game_key]["total_wpa"] += row.wpa
        
        # Convert to list and round totals
        game_list = []
        for game in games.values():
            game["total_wpa"] = round(game["total_wpa"], 3)
            game_list.append(game)
        
        # Sort by date descending
        game_list.sort(key=lambda x: x["date"], reverse=True)
        
        return {
            "player": player_name,
            "games": game_list,
            "total_wpa": round(sum(game["total_wpa"] for game in game_list), 3)
        }
    finally:
        db.close()


@app.get("/statcast/barrel-map")
async def barrel_map_data():
    """Return exit velocity vs launch angle data for barrel map visualization."""
    db = SessionLocal()
    try:
        rows = (
            db.query(
                StatcastEvent.launch_speed,
                StatcastEvent.launch_angle,
                StatcastEvent.batter_name,
                StatcastEvent.event_type,
                StatcastEvent.raw_description,
                Game.date,
                Game.home_team,
                Game.away_team
            )
            .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
            .filter(
                Game.attended.is_(True),
                StatcastEvent.launch_speed.isnot(None),
                StatcastEvent.launch_angle.isnot(None)
            )
            .all()
        )
        
        # Categorize outcomes for color coding
        batted_balls = []
        for row in rows:
            # Determine outcome category from event_type
            event_type = row.event_type.lower() if row.event_type else ""
            
            if event_type == "home_run":
                outcome = "home_run"
            elif any(word in event_type for word in ["out", "error", "fielders_choice"]):
                outcome = "out"  
            elif event_type in ["single", "double", "triple"]:
                outcome = "hit"
            else:
                outcome = "hit"  # Default for other batted balls
            
            # Determine if it's a "barrel" (ideal launch conditions)
            ev = row.launch_speed
            la = row.launch_angle
            is_barrel = False
            if ev and la:
                # Barrel definition: roughly 8-50 degree launch angle, 98+ mph exit velo
                is_barrel = (8 <= la <= 50) and (ev >= 98)
            
            batted_balls.append({
                "exit_velocity": ev,
                "launch_angle": la,
                "batter": row.batter_name,
                "outcome": outcome,
                "is_barrel": is_barrel,
                "date": str(row.date),
                "matchup": f"{row.away_team} @ {row.home_team}",
                "description": row.event_type or row.raw_description
            })
        
        return {
            "batted_balls": batted_balls,
            "total_balls": len(batted_balls)
        }
    finally:
        db.close()
