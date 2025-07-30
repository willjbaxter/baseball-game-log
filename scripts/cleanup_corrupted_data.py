#!/usr/bin/env python3
"""Clean up corrupted WPA/EV/LA data where identical values are shared across different outcomes."""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5433/game_log")

def main():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Find corrupted data - events where same player has identical WPA/EV/LA for different outcomes
        print("🔍 Finding corrupted data...")
        
        corrupted_events = db.execute(text('''
            WITH corrupted_groups AS (
                SELECT 
                    se.batter_name,
                    se.wpa,
                    se.launch_speed,
                    se.launch_angle,
                    COUNT(*) as event_count,
                    COUNT(DISTINCT se.description) as different_outcomes,
                    array_agg(se.id) as event_ids
                FROM statcast_events se 
                JOIN games g ON se.mlb_game_pk = g.mlb_game_pk 
                WHERE g.attended = true 
                AND se.wpa IS NOT NULL
                AND se.launch_speed IS NOT NULL
                AND se.launch_angle IS NOT NULL
                GROUP BY se.batter_name, se.wpa, se.launch_speed, se.launch_angle
                HAVING COUNT(DISTINCT se.description) > 1 
                AND COUNT(*) > 2
            )
            SELECT * FROM corrupted_groups ORDER BY event_count DESC
        '''))
        
        corrupted_groups = corrupted_events.fetchall()
        print(f"Found {len(corrupted_groups)} corrupted data groups")
        
        total_corrupted_events = 0
        
        for group in corrupted_groups:
            batter, wpa, ev, la, count, outcomes, event_ids = group
            total_corrupted_events += count
            print(f"  {batter}: {count} events, {outcomes} outcomes, WPA:{wpa}, EV:{ev}, LA:{la}")
            
            # For each corrupted group, keep only the first event and delete the rest
            # This is a conservative approach - we could try to be smarter about which to keep
            if len(event_ids) > 1:
                events_to_delete = event_ids[1:]  # Keep first, delete rest
                
                for event_id in events_to_delete:
                    db.execute(text('DELETE FROM statcast_events WHERE id = :id'), {'id': event_id})
                    
                print(f"    Deleted {len(events_to_delete)} duplicate events, kept 1")
        
        print(f"\n🧹 Cleanup summary:")
        print(f"  - Found {len(corrupted_groups)} corrupted groups")
        print(f"  - Total corrupted events: {total_corrupted_events}")
        print(f"  - Events deleted: {total_corrupted_events - len(corrupted_groups)}")
        print(f"  - Events kept: {len(corrupted_groups)}")
        
        # Commit the changes
        db.commit()
        print("✅ Cleanup completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()