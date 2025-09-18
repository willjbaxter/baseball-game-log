#!/usr/bin/env python3
"""
Backfill win probability data for all attended games.
This script re-fetches Statcast data to ensure home_win_exp values are populated.
"""

import os
import time
from sqlalchemy import create_engine, text
from scraper.statcast_fetcher import fetch_statcast_for_game
from api.models import Game, StatcastEvent
from api.database import SessionLocal

def main():
    database_url = os.getenv('DATABASE_URL', 'postgresql+psycopg2://postgres:postgres@localhost:5433/game_log')
    engine = create_engine(database_url)
    
    db = SessionLocal()
    
    try:
        # Get all games that need win probability data
        with engine.connect() as conn:
            games_query = text('''
                SELECT DISTINCT g.mlb_game_pk
                FROM games g
                LEFT JOIN (
                    SELECT mlb_game_pk, COUNT(home_win_exp) as wp_count
                    FROM statcast_events
                    GROUP BY mlb_game_pk
                    HAVING COUNT(home_win_exp) > 0
                ) se ON g.mlb_game_pk = se.mlb_game_pk
                WHERE g.attended = true 
                    AND g.mlb_game_pk IS NOT NULL
                    AND (se.wp_count IS NULL OR se.wp_count = 0)
                ORDER BY g.mlb_game_pk DESC
            ''')
            games_to_update = conn.execute(games_query).fetchall()
        
        total_games = len(games_to_update)
        print(f"Found {total_games} games needing win probability backfill")
        
        if total_games == 0:
            print("✅ All games already have win probability data!")
            return
        
        success_count = 0
        failed_games = []
        
        for i, row in enumerate(games_to_update, 1):
            game_pk = row.mlb_game_pk
            print(f"\n[{i}/{total_games}] Processing game {game_pk}...")
            
            # Get the game object
            game = db.query(Game).filter(Game.mlb_game_pk == game_pk).first()
            if not game:
                print(f"  ⚠️  Game {game_pk} not found in database")
                continue
            
            try:
                # Delete existing events
                deleted = db.query(StatcastEvent).filter(StatcastEvent.mlb_game_pk == game_pk).delete()
                if deleted > 0:
                    print(f"  Deleted {deleted} existing events")
                db.commit()
                
                # Fetch fresh data with win probability
                events = fetch_statcast_for_game(game)
                
                if events:
                    db.add_all(events)
                    db.commit()
                    
                    # Verify win probability was captured
                    wp_check = db.query(StatcastEvent).filter(
                        StatcastEvent.mlb_game_pk == game_pk,
                        StatcastEvent.home_win_exp.isnot(None)
                    ).count()
                    
                    if wp_check > 0:
                        print(f"  ✅ Added {len(events)} events with {wp_check} WP values")
                        success_count += 1
                    else:
                        print(f"  ⚠️  Added {len(events)} events but no WP data found")
                        failed_games.append(game_pk)
                else:
                    print("  ⚠️  No Statcast data available")
                    failed_games.append(game_pk)
                    
            except Exception as e:
                print(f"  ❌ Error: {e}")
                failed_games.append(game_pk)
                db.rollback()
            
            # Rate limiting to be nice to the API
            if i < total_games:
                time.sleep(2)
        
        print("\n" + "=" * 60)
        print("BACKFILL COMPLETE")
        print(f"✅ Successfully updated: {success_count}/{total_games} games")
        
        if failed_games:
            print(f"❌ Failed games: {failed_games}")
            
    finally:
        db.close()

if __name__ == "__main__":
    main()
