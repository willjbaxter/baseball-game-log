#!/usr/bin/env python3
"""Enrich games with gamePk, final score, venue using MLB Stats API.
Only updates rows that are missing mlb_game_pk.
"""

import os
import sys
from datetime import date
import logging

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.models import Game
from scraper.team_ids import TEAM_ID

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg2://postgres:postgres@db:5432/game_log"
)
if "+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+asyncpg", "+psycopg2")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule"


def _find_match(items: list[dict], home_id: int, away_id: int) -> dict | None:
    """Return the game dict where (home, away) == ids."""
    for item in items:
        h = item["teams"]["home"]["team"]["id"]
        a = item["teams"]["away"]["team"]["id"]
        if (h, a) == (home_id, away_id):
            return item
    return None


def fetch_game_meta(game_date: date, home_id: int, away_id: int) -> dict | None:
    """Fetch game metadata for a specific matchup.

    Strategy:
    1. Call schedule endpoint with explicit ``teamId`` and ``opponentId`` filters – this
       dramatically narrows results and eliminates ambiguous matches on postseason dates.
    2. If the targeted call returns nothing (e.g., historical quirk, preseason), fallback
       to a broad date query and perform manual matching.
    """

    params = {
        "sportId": 1,
        "date": game_date.isoformat(),
        "teamId": home_id,
        "opponentId": away_id,
        "hydrate": "team,linescore,flags",
    }

    try:
        resp = httpx.get(SCHEDULE_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        items = data.get("dates", [{}])[0].get("games", []) if data.get("dates") else []
        if not items:
            # Fallback broad search
            broad_params = {
                "sportId": 1,
                "date": game_date.isoformat(),
            }
            resp = httpx.get(SCHEDULE_URL, params=broad_params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            items = data.get("dates", [{}])[0].get("games", []) if data.get("dates") else []

        item = _find_match(items, home_id, away_id)
        if not item:
            return None

        return {
            "game_pk": item["gamePk"],
            "home_score": item["teams"]["home"].get("score"),
            "away_score": item["teams"]["away"].get("score"),
            "venue_id": item["venue"]["id"],
            "venue_name": item["venue"]["name"],
            "weather": item.get("weather", {}),
        }

    except (httpx.RequestError, KeyError, IndexError) as e:
        logger.error(f"API request failed for {game_date}: {e}")
        return None


def enrich_games() -> None:
    """Enrich games with MLB Stats API data."""
    db = SessionLocal()
    try:
        games: list[Game] = (
            db.query(Game)
            .filter(
                (Game.home_score.is_(None)) | (Game.mlb_game_pk.is_(None))
            )
            .all()
        )

        logger.info(f"Found {len(games)} games to enrich")

        for g in games:
            # Skip future games - MLB hasn't published schedule yet
            if g.date > date.today():
                logger.info(f"Future game {g.date} – skipping gamePk lookup")
                continue

            home_id = g.home_team_id or TEAM_ID.get(g.home_team)
            away_id = g.away_team_id or TEAM_ID.get(g.away_team)
            
            if home_id is None or away_id is None:
                logger.warning(f"Unknown team ID for {g.home_team} or {g.away_team}")
                continue

            meta = fetch_game_meta(g.date, home_id, away_id)
            
            if meta is None:
                logger.warning(f"No match for {g.date} ({g.away_team} @ {g.home_team})")
                continue

            # Update game with enriched data
            g.mlb_game_pk = meta["game_pk"]
            g.home_score = meta["home_score"]
            g.away_score = meta["away_score"]
            g.venue_id = meta["venue_id"]
            g.venue_name = meta["venue_name"]
            g.weather = meta["weather"]
            
            logger.info(
                f"✅ {g.date} {g.away_team}@{g.home_team} → pk {g.mlb_game_pk} "
                f"{g.away_score}-{g.home_score} at {g.venue_name}"
            )

        db.commit()
        logger.info("🎉 Enrichment complete")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error enriching games: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    enrich_games() 