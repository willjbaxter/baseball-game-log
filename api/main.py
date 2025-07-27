from fastapi import FastAPI
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Game

app = FastAPI(title="Baseball Game Log API")

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
                    "venue": game.venue,
                    "source": game.source,
                }
                for game in games
            ],
            "total": len(games)
        }
    finally:
        db.close()
