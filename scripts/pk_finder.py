#!/usr/bin/env python3
"""
Automated game_pk finder for scorecard imports.
Finds the correct MLB game ID for a given date and teams.
"""

import argparse
import sys
from typing import Optional


def find_game_pk(game_date: str, home_team: str, away_team: str) -> Optional[dict]:
    """
    Find MLB game_pk for given date and teams using MLB API.
    
    Args:
        game_date: Date in YYYY-MM-DD format
        home_team: Home team abbreviation (e.g., 'BOS')
        away_team: Away team abbreviation (e.g., 'NYY')
    
    Returns:
        Dict with game info or None if not found
    """
    
    print(f"🔍 Searching for {away_team} @ {home_team} on {game_date}")
    
    try:
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__))))
        
        import httpx
        from scraper.team_ids import TEAM_ID
        
        # Get team IDs
        home_team_id = TEAM_ID.get(home_team)
        away_team_id = TEAM_ID.get(away_team)
        
        if not home_team_id or not away_team_id:
            print(f"❌ Unknown team abbreviation: {home_team} or {away_team}")
            return None
        
        # Use MLB API to find games for the date
        url = f"https://statsapi.mlb.com/api/v1/schedule"
        params = {
            "sportId": 1,
            "date": game_date,
            "teamId": home_team_id,
            "opponentId": away_team_id,
            "hydrate": "team,linescore,flags"
        }
        
        print(f"🔎 Querying MLB API for {game_date}...")
        response = httpx.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if not data.get("dates") or not data["dates"][0].get("games"):
            print(f"❌ No games found for {away_team} @ {home_team} on {game_date}")
            return None
        
        game = data["dates"][0]["games"][0]
        
        result = {
            "game_pk": game["gamePk"],
            "actual_home": game["teams"]["home"]["team"]["abbreviation"],
            "actual_away": game["teams"]["away"]["team"]["abbreviation"],
            "home_score": game["teams"]["home"].get("score"),
            "away_score": game["teams"]["away"].get("score"),
            "status": game["status"]["detailedState"],
            "venue": game["venue"]["name"],
            "teams_swapped": False,
            "statcast_events": None
        }
        
        print(f"✅ MATCH FOUND: Game {result['game_pk']}")
        print(f"   Date: {game_date}")
        print(f"   Teams: {result['actual_away']} @ {result['actual_home']}")
        print(f"   Status: {result['status']}")
        print(f"   Venue: {result['venue']}")
        if result['home_score'] is not None:
            print(f"   Score: {result['actual_away']} {result['away_score']} - {result['actual_home']} {result['home_score']}")
        
        return result
        
    except httpx.RequestError as e:
        print(f"❌ MLB API request failed: {e}")
        return None
    except ImportError:
        print("❌ httpx library not available")
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
                print("⚠️  Score mismatch!")
                print(f"   Expected: {expected_away}-{expected_home}")
                print(f"   Actual:   {actual_away}-{actual_home}")
        
        return 0
    else:
        print(f"\n❌ Could not find game_pk for {args.away_team} @ {args.home_team} on {args.date}")
        return 1

if __name__ == "__main__":
    sys.exit(main())