#!/usr/bin/env python3
"""
Seed script to populate games table with attended games from:
1. Physical scorecards (7 games)
2. MLB Ballpark app check-ins (24 games from screenshots)
"""

import os
import sys
import json
from datetime import date
# Standard SQLAlchemy imports
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Team ID mapping
from scraper.team_ids import TEAM_ID

from api.models import Game

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@db:5432/game_log")

# Ensure we use a synchronous driver for the seed script
if "asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+asyncpg", "+psycopg2")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_games():
    """Insert attended games into database from JSON file."""
    db = SessionLocal()
    
    try:
        # Load enriched data once into a dict keyed by (date, home, away)
        with open("scraper/enriched_games.json", "r") as f:
            enriched_rows = {
                (row["date"], row["home_team"], row["away_team"]): row
                for row in json.load(f)
            }

        added = 0

        for key, row in enriched_rows.items():
            g_date, home_team, away_team = key

            # Deduplicate by primary identifiers (date + teams)
            exists = (
                db.query(Game)
                .filter(
                    Game.date == date.fromisoformat(g_date),
                    Game.home_team == home_team,
                    Game.away_team == away_team,
                )
                .first()
            )

            if exists:
                print(
                    f"Game already exists: {g_date} {away_team}@{home_team} (pk={exists.mlb_game_pk})"
                )
                continue

            game = Game(
                date=date.fromisoformat(g_date),
                home_team=home_team,
                away_team=away_team,
                source=row.get("source", "manual"),
                attended=True,

                # Enriched fields
                mlb_game_pk=row.get("mlb_game_pk"),
                home_score=row.get("home_score"),
                away_score=row.get("away_score"),
                venue_name=row.get("venue"),
                venue_id=row.get("venue_id"),
                weather=row.get("weather"),

                # Team IDs (for future matching)
                home_team_id=TEAM_ID.get(home_team),
                away_team_id=TEAM_ID.get(away_team),
            )

            db.add(game)
            added += 1
            print(f"Added: {g_date} {away_team}@{home_team}")

        db.commit()
        print(f"\n✅ Seeding complete! Added {added} new games to database.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding games: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_games() 