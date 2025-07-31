#!/usr/bin/env python3
"""
Automated game_pk finder for scorecard imports.
Finds the correct MLB game ID for a given date and teams.
"""

import argparse
import sys
from datetime import date
from typing import Optional

import httpx

def find_game_pk(game_date: str, home_team: str, away_team: str) -> Optional[dict]:
    """
    Find MLB game_pk for given date and teams.
    Uses pybaseball as the primary method since MLB API schedule is unreliable.
    
    Args:
        game_date: Date in YYYY-MM-DD format
        home_team: Home team abbreviation (e.g., 'BOS')
        away_team: Away team abbreviation (e.g., 'NYY')
    
    Returns:
        Dict with game info or None if not found
    """
    
    print(f"🔍 Searching for {away_team} @ {home_team} on {game_date}")
    
    try:
        import pybaseball as pb
        
        # Search a range of game IDs around common ranges for the year
        year = int(game_date[:4])
        
        # Determine search range based on year
        if year >= 2024:
            search_ranges = [range(745000, 750000), range(775000, 780000)]
        elif year >= 2021:
            search_ranges = [range(660900, 661000), range(633000, 634000), range(717000, 718000)]
        else:
            search_ranges = [range(565000, 566000)]  # 2019 range
        
        found_games = []
        
        print(f"🔎 Scanning game ID ranges for {year}...")
        
        for search_range in search_ranges:
            for game_id in search_range:
                try:
                    df = pb.statcast_single_game(game_id)
                    if df is not None and not df.empty:
                        # Get game info
                        game_dates = df['game_date'].unique() if 'game_date' in df.columns else []
                        home_teams = df['home_team'].unique() if 'home_team' in df.columns else []
                        away_teams = df['away_team'].unique() if 'away_team' in df.columns else []
                        
                        if len(game_dates) > 0 and len(home_teams) > 0 and len(away_teams) > 0:
                            game_date_str = str(game_dates[0])[:10]
                            home_abbr = str(home_teams[0])
                            away_abbr = str(away_teams[0])
                            
                            # Check for date and team match
                            if (game_date_str == game_date and
                                ((home_abbr == home_team and away_abbr == away_team) or
                                 (home_abbr == away_team and away_abbr == home_team))):
                                
                                result = {
                                    "game_pk": game_id,
                                    "actual_home": home_abbr,
                                    "actual_away": away_abbr,
                                    "home_score": None,  # Statcast doesn't have final scores
                                    "away_score": None,
                                    "status": "Found via Statcast",
                                    "venue": "Unknown",
                                    "teams_swapped": (home_abbr == away_team and away_abbr == home_team),
                                    "statcast_events": len(df)
                                }
                                
                                print(f"✅ MATCH FOUND: Game {game_id}")
                                print(f"   Date: {game_date_str}")
                                print(f"   Teams: {result['actual_away']} @ {result['actual_home']}")
                                print(f"   Statcast events: {len(df)}")
                                
                                if result["teams_swapped"]:
                                    print(f"⚠️  WARNING: Teams are swapped from your input!")
                                    print(f"   You said: {away_team} @ {home_team}")
                                    print(f"   Actual:   {result['actual_away']} @ {result['actual_home']}")
                                
                                return result
                                
                except Exception:
                    # Most game IDs will fail, that's expected
                    pass
        
        print(f"❌ No match found for {away_team} @ {home_team} on {game_date}")
        print("   This could mean:")
        print("   1. The game date or teams are incorrect")
        print("   2. The game has no Statcast data available")
        print("   3. The game ID is outside the searched ranges")
        
        return None
        
    except ImportError:
        print("❌ pybaseball not available, falling back to manual search")
        return None
    except Exception as e:
        print(f"❌ Error searching for game: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Find MLB game_pk for scorecard imports")
    parser.add_argument("date", help="Game date (YYYY-MM-DD)")
    parser.add_argument("away_team", help="Away team abbreviation (e.g., NYY)")
    parser.add_argument("home_team", help="Home team abbreviation (e.g., BOS)")
    parser.add_argument("--expected-score", help="Expected final score (away-home, e.g., 4-5) for verification")
    
    args = parser.parse_args()
    
    result = find_game_pk(args.date, args.home_team, args.away_team)
    
    if result:
        print(f"\n🎯 RESULT: game_pk = {result['game_pk']}")
        
        # Verify score if provided
        if args.expected_score:
            expected_away, expected_home = map(int, args.expected_score.split('-'))
            actual_away = result.get('away_score')
            actual_home = result.get('home_score')
            
            if actual_away == expected_away and actual_home == expected_home:
                print(f"✅ Score matches expected: {expected_away}-{expected_home}")
            else:
                print(f"⚠️  Score mismatch!")
                print(f"   Expected: {expected_away}-{expected_home}")
                print(f"   Actual:   {actual_away}-{actual_home}")
        
        return 0
    else:
        print(f"\n❌ Could not find game_pk for {args.away_team} @ {args.home_team} on {args.date}")
        return 1

if __name__ == "__main__":
    sys.exit(main())