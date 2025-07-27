#!/usr/bin/env python3
"""
Seed script to populate games table with attended games from:
1. Physical scorecards (7 games)
2. MLB Ballpark app check-ins (24 games from screenshots)
"""

import os
import sys
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.models import Base, Game

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@db:5432/game_log")

# Ensure we use a synchronous driver for the seed script
if "asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+asyncpg", "+psycopg2")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Game data compiled from scorecards + ballpark app screenshots
ATTENDED_GAMES = [
    # From physical scorecards
    {"date": date(2025, 6, 13), "home_team": "BOS", "away_team": "NYY", "source": "scorecard"},
    {"date": date(2021, 10, 19), "home_team": "BOS", "away_team": "HOU", "source": "scorecard"},
    {"date": date(2021, 10, 16), "home_team": "BOS", "away_team": "HOU", "source": "scorecard"},
    {"date": date(2021, 10, 5), "home_team": "BOS", "away_team": "NYY", "source": "scorecard"},
    {"date": date(2021, 7, 5), "home_team": "BOS", "away_team": "NYY", "source": "scorecard"},
    {"date": date(2021, 10, 20), "home_team": "BOS", "away_team": "HOU", "source": "scorecard"},
    {"date": date(2021, 10, 11), "home_team": "BOS", "away_team": "TB", "source": "scorecard"},
    
    # From MLB Ballpark app (extracted from screenshots)
    # 2025 Season
    {"date": date(2025, 7, 26), "home_team": "BOS", "away_team": "LAD", "home_score": 4, "away_score": 2, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2025, 7, 25), "home_team": "BOS", "away_team": "LAD", "home_score": 2, "away_score": 5, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2025, 6, 13), "home_team": "BOS", "away_team": "NYY", "home_score": 2, "away_score": 1, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2025, 6, 9), "home_team": "BOS", "away_team": "TB", "home_score": 8, "away_score": 10, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2025, 5, 17), "home_team": "BOS", "away_team": "ATL", "home_score": 7, "away_score": 6, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2025, 5, 4), "home_team": "BOS", "away_team": "MIN", "home_score": 4, "away_score": 5, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2025, 5, 3), "home_team": "BOS", "away_team": "MIN", "home_score": 3, "away_score": 4, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2025, 4, 9), "home_team": "BOS", "away_team": "TOR", "home_score": 1, "away_score": 2, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2025, 4, 4), "home_team": "BOS", "away_team": "STL", "home_score": 13, "away_score": 9, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2025, 3, 11), "home_team": "BOS", "away_team": "PHI", "home_score": 8, "away_score": 18, "venue": "JetBlue Park", "source": "ballpark_app"},
    
    # 2024 Season
    {"date": date(2024, 7, 27), "home_team": "BOS", "away_team": "NYY", "home_score": 8, "away_score": 11, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2024, 7, 10), "home_team": "BOS", "away_team": "OAK", "home_score": 2, "away_score": 5, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2024, 4, 15), "home_team": "BOS", "away_team": "CLE", "home_score": 0, "away_score": 6, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2024, 4, 11), "home_team": "BOS", "away_team": "BAL", "home_score": 4, "away_score": 9, "venue": "Fenway Park", "source": "ballpark_app"},
    
    # 2023 Season
    {"date": date(2023, 7, 26), "home_team": "BOS", "away_team": "ATL", "home_score": 5, "away_score": 3, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2023, 7, 14), "home_team": "CHC", "away_team": "BOS", "home_score": 3, "away_score": 8, "venue": "Wrigley Field", "source": "ballpark_app"},
    {"date": date(2023, 6, 27), "home_team": "BOS", "away_team": "MIA", "home_score": 1, "away_score": 10, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2023, 6, 16), "home_team": "BOS", "away_team": "NYY", "home_score": 15, "away_score": 5, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2023, 4, 14), "home_team": "BOS", "away_team": "LAA", "home_score": 5, "away_score": 3, "venue": "Fenway Park", "source": "ballpark_app"},
    
    # 2021 Season
    {"date": date(2021, 5, 6), "home_team": "BOS", "away_team": "DET", "home_score": 12, "away_score": 9, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2021, 4, 23), "home_team": "BOS", "away_team": "SEA", "home_score": 6, "away_score": 5, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2021, 4, 19), "home_team": "BOS", "away_team": "CWS", "home_score": 11, "away_score": 4, "venue": "Fenway Park", "source": "ballpark_app"},
    {"date": date(2021, 4, 4), "home_team": "BOS", "away_team": "BAL", "home_score": 3, "away_score": 11, "venue": "Fenway Park", "source": "ballpark_app"},
    
    # 2019 Season
    {"date": date(2019, 7, 25), "home_team": "BOS", "away_team": "NYY", "home_score": 19, "away_score": 3, "venue": "Fenway Park", "source": "ballpark_app"},
]


def seed_games():
    """Insert attended games into database."""
    db = SessionLocal()
    
    try:
        for game_data in ATTENDED_GAMES:
            # Check if game already exists (avoid duplicates)
            existing = db.query(Game).filter(
                Game.date == game_data["date"],
                Game.home_team == game_data["home_team"],
                Game.away_team == game_data["away_team"]
            ).first()
            
            if existing:
                print(f"Game already exists: {game_data['date']} {game_data['away_team']}@{game_data['home_team']}")
                continue
            
            # Create new game record
            game = Game(
                date=game_data["date"],
                home_team=game_data["home_team"],
                away_team=game_data["away_team"],
                home_score=game_data.get("home_score"),
                away_score=game_data.get("away_score"),
                venue=game_data.get("venue"),
                attended=True,
                source=game_data["source"]
            )
            
            db.add(game)
            print(f"Added: {game_data['date']} {game_data['away_team']}@{game_data['home_team']}")
        
        db.commit()
        print(f"\n✅ Seeding complete! Added games to database.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding games: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_games() 