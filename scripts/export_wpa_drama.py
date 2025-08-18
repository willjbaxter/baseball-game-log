#!/usr/bin/env python3
"""
Export top WPA moments (Drama Index) to JSON for the web frontend
"""

import os
import json
from sqlalchemy import create_engine, text

def main():
    database_url = os.getenv('DATABASE_URL', 'postgresql+psycopg2://postgres:postgres@localhost:5433/game_log')
    engine = create_engine(database_url)
    
    print("Exporting Drama Index (WPA moments)...")
    
    with engine.connect() as conn:
        # Get top WPA swings with game context
        query = text('''
            SELECT 
                se.wpa,
                se.batter_name,
                se.pitcher_name,
                se.event_type,
                se.raw_description,
                se.mlb_game_pk,
                se.clip_uuid,
                se.video_url,
                g.date,
                g.home_team,
                g.away_team,
                g.home_score,
                g.away_score
            FROM statcast_events se
            JOIN games g ON se.mlb_game_pk = g.mlb_game_pk
            WHERE se.wpa IS NOT NULL
            ORDER BY ABS(se.wpa) DESC
            LIMIT 50
        ''')
        results = conn.execute(query).fetchall()
        
        # Convert to JSON-serializable format
        drama_events = []
        for row in results:
            drama_events.append({
                'wpa': float(row.wpa),
                'batter_name': row.batter_name,
                'pitcher_name': row.pitcher_name,
                'event_type': row.event_type,
                'raw_description': row.raw_description,
                'mlb_game_pk': row.mlb_game_pk,
                'clip_uuid': row.clip_uuid,
                'video_url': row.video_url,
                'date': row.date.isoformat() if hasattr(row.date, 'isoformat') else str(row.date),
                'home_team': row.home_team,
                'away_team': row.away_team,
                'home_score': row.home_score,
                'away_score': row.away_score
            })
        
        # Write to web/public directory
        output_path = 'web/public/drama_index.json'
        with open(output_path, 'w') as f:
            json.dump(drama_events, f, indent=2)
        
        print(f"Exported {len(drama_events)} drama moments to {output_path}")

if __name__ == '__main__':
    main()