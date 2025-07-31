#!/usr/bin/env python3
"""Manual fix for games with null scores using data from enriched_games.json"""

import os
import sys
import json

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.models import Game

# Database connection  
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5433/game_log"
)
if "+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+asyncpg", "+psycopg2")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def fix_null_games():
    """Manually update null games with enriched data."""
    db = SessionLocal()
    
    try:
        # Load enriched data
        with open("scraper/enriched_games.json", "r") as f:
            enriched_data = json.load(f)
        
        # Create lookup dict
        enriched_lookup = {
            (row["date"], row["home_team"], row["away_team"]): row
            for row in enriched_data
        }
        
        # Find games with null scores or missing mlb_game_pk
        null_games = (
            db.query(Game)
            .filter(
                (Game.home_score.is_(None)) | (Game.mlb_game_pk.is_(None))
            )
            .all()
        )
        
        print(f"Found {len(null_games)} games with missing data")
        
        fixed = 0
        for game in null_games:
            key = (game.date.isoformat(), game.home_team, game.away_team)
            
            if key in enriched_lookup:
                enriched = enriched_lookup[key]
                
                print(f"Fixing {game.date} {game.away_team}@{game.home_team}")
                
                game.mlb_game_pk = enriched["mlb_game_pk"]
                game.home_score = enriched["home_score"]
                game.away_score = enriched["away_score"]
                game.venue_name = enriched["venue"]
                
                fixed += 1
                
                print(f"  → pk={game.mlb_game_pk} score={game.away_score}-{game.home_score}")
            else:
                print(f"No enriched data found for {game.date} {game.away_team}@{game.home_team}")
        
        db.commit()
        print(f"\n✅ Fixed {fixed} games!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error fixing games: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_null_games()