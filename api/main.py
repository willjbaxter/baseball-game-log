from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Game
from api.models import StatcastEvent
import re, httpx
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
        games = db.query(Game).filter(Game.attended == True).order_by(Game.date.desc()).all()
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


@app.get("/statcast/hardest-hit")
async def hardest_hit(limit: int = 100):
    """Return hardest-hit balls (EV desc) across attended games."""
    db = SessionLocal()
    try:
        rows = (
            db.query(StatcastEvent, Game)
            .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
            .filter(Game.attended.is_(True))
            .filter(StatcastEvent.launch_speed.isnot(None))
            .order_by(StatcastEvent.launch_speed.desc())
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

            video_url = None
            if ev.clip_uuid:
                video_url = f"https://fastball-clips.mlb.com/{ev.mlb_game_pk}/home/{ev.clip_uuid}.mp4"

            result.append(
                {
                    "launch_speed": ev.launch_speed,
                    "launch_angle": ev.launch_angle,
                    "batter": batter,
                    "pitcher": pitcher,
                    "date": g.date.isoformat(),
                    "game_pk": ev.mlb_game_pk,
                    "video_url": video_url,
                }
            )
        return {"events": result}
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
            .group_by(StatcastEvent.batter_name)
            .order_by(func.sum(StatcastEvent.wpa).desc())
            .limit(limit)
            .all()
        )
        return {"leaders": [{"player": r.player, "wpa": round(r.wpa,3)} for r in rows]}
    finally:
        db.close()
