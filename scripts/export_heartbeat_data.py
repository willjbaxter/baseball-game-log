#!/usr/bin/env python3
"""
Export game heartbeat data for EKG-style WPA visualization
"""

import os
import json
from sqlalchemy import create_engine, text

def calculate_drama_score(wpa_events):
    """Calculate a drama score for a game based on WPA volatility"""
    if not wpa_events:
        return 0
    
    # Drama score components:
    # 1. Total absolute WPA swing
    total_swing = sum(abs(event['wpa']) for event in wpa_events)
    
    # 2. Number of significant moments (|WPA| > 0.1)
    significant_moments = len([e for e in wpa_events if abs(e['wpa']) > 0.1])
    
    # 3. Volatility (standard deviation of WPA)
    wpa_values = [event['wpa'] for event in wpa_events]
    if len(wpa_values) > 1:
        mean_wpa = sum(wpa_values) / len(wpa_values)
        variance = sum((x - mean_wpa) ** 2 for x in wpa_values) / len(wpa_values)
        volatility = variance ** 0.5
    else:
        volatility = 0
    
    # Combine into drama score (0-100 scale)
    drama_score = min(100, (total_swing * 10) + (significant_moments * 5) + (volatility * 20))
    return round(drama_score, 1)

def categorize_drama(drama_score):
    """Categorize game drama level"""
    if drama_score >= 70:
        return {"level": "cardiac_arrest", "emoji": "🫀💥", "color": "#ef4444", "label": "Cardiac Arrest"}
    elif drama_score >= 40:
        return {"level": "elevated", "emoji": "📈💗", "color": "#f97316", "label": "Elevated Heartbeat"}
    elif drama_score >= 20:
        return {"level": "steady", "emoji": "💚📊", "color": "#22c55e", "label": "Steady Heartbeat"}
    else:
        return {"level": "flatline", "emoji": "😴📉", "color": "#6b7280", "label": "Flatline"}

def main():
    database_url = os.getenv('DATABASE_URL', 'postgresql+psycopg2://postgres:postgres@localhost:5433/game_log')
    engine = create_engine(database_url)
    
    print("Exporting Heartbeat Chart data...")
    
    with engine.connect() as conn:
        # First get all attended games
        games_query = text('''
            SELECT mlb_game_pk, date, home_team, away_team, home_score, away_score, attended
            FROM games 
            WHERE attended = true
            ORDER BY date
        ''')
        all_games = conn.execute(games_query).fetchall()
        
        # Then get games with WPA events - filter out non-events
        wpa_query = text('''
            SELECT 
                g.mlb_game_pk,
                g.date,
                g.home_team,
                g.away_team,
                g.home_score,
                g.away_score,
                se.wpa,
                se.home_win_exp,
                se.away_win_exp,
                se.batter_name,
                se.pitcher_name,
                se.event_type,
                se.raw_description,
                se.event_datetime,
                se.inning,
                se.inning_topbot,
                se.outs_when_up,
                se.home_score as event_home_score,
                se.away_score as event_away_score,
                se.post_home_score,
                se.post_away_score,
                se.on_1b,
                se.on_2b,
                se.on_3b,
                se.balls,
                se.strikes
            FROM games g
            LEFT JOIN statcast_events se ON g.mlb_game_pk = se.mlb_game_pk
            WHERE g.attended = true 
                AND se.wpa IS NOT NULL
                AND se.event_type NOT IN ('nan', '')
                AND se.event_type IS NOT NULL
            ORDER BY g.date, g.mlb_game_pk, se.inning,
                    CASE WHEN se.inning_topbot = 'Top' THEN 0 ELSE 1 END,
                    se.outs_when_up,
                    se.event_datetime,
                    se.id
        ''')
        results = conn.execute(wpa_query).fetchall()
        
        # Group by game
        games_data = {}
        for row in results:
            game_pk = row.mlb_game_pk
            
            if game_pk not in games_data:
                games_data[game_pk] = {
                    'game_pk': game_pk,
                    'date': row.date.isoformat() if hasattr(row.date, 'isoformat') else str(row.date),
                    'home_team': row.home_team,
                    'away_team': row.away_team,
                    'home_score': row.home_score,
                    'away_score': row.away_score,
                    'wpa_events': []
                }
            
            # Build context string for tooltip
            context_parts = []
            if row.inning and row.inning_topbot:
                context_parts.append(f"{row.inning_topbot} {row.inning}")
            if row.outs_when_up is not None:
                outs_text = "out" if row.outs_when_up == 1 else "outs"
                context_parts.append(f"{row.outs_when_up} {outs_text}")
            if row.balls is not None and row.strikes is not None:
                context_parts.append(f"{row.balls}-{row.strikes} count")
            
            situation = ", ".join(context_parts) if context_parts else "Unknown situation"
            
            # Score context - show higher score first with team indicator
            score_context = ""
            if row.event_home_score is not None and row.event_away_score is not None:
                # Format: higher-lower TEAM
                pre_higher = max(row.event_home_score, row.event_away_score)
                pre_lower = min(row.event_home_score, row.event_away_score)
                pre_leader = row.home_team if row.event_home_score > row.event_away_score else row.away_team if row.event_away_score > row.event_home_score else "TIE"
                
                if row.post_home_score is not None and row.post_away_score is not None:
                    post_higher = max(row.post_home_score, row.post_away_score)
                    post_lower = min(row.post_home_score, row.post_away_score)
                    post_leader = row.home_team if row.post_home_score > row.post_away_score else row.away_team if row.post_away_score > row.post_home_score else "TIE"
                    
                    # Only show score change if it actually changed
                    if row.event_home_score != row.post_home_score or row.event_away_score != row.post_away_score:
                        score_context = f"Score: {pre_higher}-{pre_lower} {pre_leader} → {post_higher}-{post_lower} {post_leader}"
                    else:
                        score_context = f"Score: {pre_higher}-{pre_lower} {pre_leader}"
                else:
                    score_context = f"Score: {pre_higher}-{pre_lower} {pre_leader}"
            
            games_data[game_pk]['wpa_events'].append({
                'wpa': float(row.wpa),
                'home_win_exp': float(row.home_win_exp) if row.home_win_exp is not None else None,
                'away_win_exp': float(row.away_win_exp) if row.away_win_exp is not None else None,
                'batter_name': row.batter_name,
                'pitcher_name': row.pitcher_name,
                'event_type': row.event_type,
                'description': row.raw_description,
                'timestamp': str(row.event_datetime) if row.event_datetime else None,
                'situation': situation,
                'score_context': score_context,
                'inning': row.inning,
                'inning_topbot': row.inning_topbot,
                'outs': row.outs_when_up
            })
        
        # Add games without WPA data as flatline games
        for game_row in all_games:
            game_pk = game_row.mlb_game_pk
            if game_pk not in games_data:
                games_data[game_pk] = {
                    'game_pk': game_pk,
                    'date': game_row.date.isoformat() if hasattr(game_row.date, 'isoformat') else str(game_row.date),
                    'home_team': game_row.home_team,
                    'away_team': game_row.away_team,
                    'home_score': game_row.home_score,
                    'away_score': game_row.away_score,
                    'wpa_events': []  # Empty for flatline games
                }
        
        # Calculate win probability curves and drama scores
        heartbeat_data = []
        for game_pk, game_data in games_data.items():
            wpa_events = game_data['wpa_events']
            
            # Build win probability timeline
            heartbeat_points = []
            drama_events = []

            valid_events = [
                e for e in wpa_events
                if e.get('home_win_exp') is not None
            ]

            if valid_events:
                starting_prob = max(0.0, min(1.0, float(valid_events[0]['home_win_exp'])))
                heartbeat_points.append({
                    'x': 0,
                    'y': starting_prob,
                    'wpa': 0.0,
                    'batter': 'Game Start',
                    'pitcher': '',
                    'event': 'game_start',
                    'description': 'First Pitch',
                    'situation': 'Top 1, 0 outs',
                    'score_context': 'Score: 0-0'
                })

                total_events = len(valid_events)
                current_prob = starting_prob

                for idx, event in enumerate(valid_events, start=1):
                    pre_prob = event.get('home_win_exp')
                    if pre_prob is None:
                        pre_prob = current_prob
                    pre_prob = max(0.0, min(1.0, float(pre_prob)))

                    delta = float(event.get('wpa') or 0.0)
                    post_prob = max(0.0, min(1.0, pre_prob + delta))

                    drama_events.append({'wpa': delta})

                    heartbeat_points.append({
                        'x': idx / total_events,
                        'y': post_prob,
                        'prev_y': pre_prob,
                        'wpa': delta,
                        'batter': event['batter_name'],
                        'pitcher': event['pitcher_name'],
                        'event': event['event_type'],
                        'description': event['description'],
                        'situation': event['situation'],
                        'score_context': event['score_context']
                    })

                    current_prob = post_prob

                if not drama_events:
                    drama_events = [{'wpa': 0.0}]
            else:
                # Flatline game - show at 50% (no data available)
                heartbeat_points = [
                    {'x': 0, 'y': 0.5, 'wpa': 0.0, 'batter': 'No data', 'event': 'game_start', 'description': 'Game start'},
                    {'x': 1, 'y': 0.5, 'wpa': 0.0, 'batter': 'No data', 'event': 'game_end', 'description': 'Game end - no WPA data available'}
                ]
                drama_events = [{'wpa': 0.0}]
                valid_events = []

            # Calculate drama score from actual home-team win probability deltas
            drama_score = calculate_drama_score(drama_events)
            drama_category = categorize_drama(drama_score)
            
            # Game result - check if Red Sox won
            # For away games, check if away team (BOS) won
            # For home games, check if home team (BOS) won
            if game_data['away_team'] == 'BOS':
                # Red Sox are away
                won = game_data['away_score'] > game_data['home_score']
            else:
                # Red Sox are home
                won = game_data['home_score'] > game_data['away_score']
            
            # Format score as higher-lower always
            high_score = max(game_data['home_score'], game_data['away_score'])
            low_score = min(game_data['home_score'], game_data['away_score'])
            
            heartbeat_data.append({
                'game_pk': game_pk,
                'date': game_data['date'],
                'matchup': f"{game_data['away_team']} @ {game_data['home_team']}",
                'home_team': game_data['home_team'],  # Include home team for win probability display
                'score': f"{high_score}-{low_score}",
                'result': 'W' if won else 'L',
                'drama_score': drama_score,
                'drama_category': drama_category,
                'total_events': len(valid_events),
                'heartbeat_points': heartbeat_points
            })
        
        # Sort by drama score (most dramatic first)
        heartbeat_data.sort(key=lambda x: x['drama_score'], reverse=True)
        
        # Write to web/public directory
        output_path = 'web/public/heartbeat_data.json'
        with open(output_path, 'w') as f:
            json.dump(heartbeat_data, f, indent=2)
        
        print(f"Exported {len(heartbeat_data)} games to {output_path}")
        
        # Print summary
        print("\n=== Drama Level Summary ===")
        drama_counts = {}
        for game in heartbeat_data:
            level = game['drama_category']['level']
            drama_counts[level] = drama_counts.get(level, 0) + 1
        
        for level, count in drama_counts.items():
            category = categorize_drama(50 if level == 'elevated' else 80 if level == 'cardiac_arrest' else 30 if level == 'steady' else 10)
            print(f"{category['emoji']} {category['label']}: {count} games")
        
        print("\nTop 3 Most Dramatic Games:")
        for i, game in enumerate(heartbeat_data[:3], 1):
            cat = game['drama_category']
            print(f"{i}. {cat['emoji']} {game['matchup']} ({game['date']}) - Drama: {game['drama_score']}")

if __name__ == '__main__':
    main()
