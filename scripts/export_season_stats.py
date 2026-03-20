#!/usr/bin/env python3
"""Export per-season aggregate stats for the season stats dashboard.

Outputs web/public/season_stats.json with a list of season objects, each containing:
- games attended, W/L record
- total HRs witnessed, longest HR, highest exit velo
- drama stats (most dramatic game, avg drama score)
- venue breakdown
- top WPA moment
- barrel count
"""

import json
from collections import defaultdict

from sqlalchemy import text

from config import engine


def main():
    print("Exporting season stats...")

    with engine.connect() as conn:
        # --- Games + W/L ---
        games_rows = conn.execute(text("""
            SELECT mlb_game_pk, date, home_team, away_team,
                   home_score, away_score, venue_name,
                   EXTRACT(YEAR FROM date)::int AS season
            FROM games
            WHERE attended = true
            ORDER BY date
        """)).fetchall()

        # --- HRs ---
        hr_rows = conn.execute(text("""
            SELECT se.hit_distance_sc, se.launch_speed, se.launch_angle,
                   se.batter_name, se.pitcher_name,
                   g.date, g.home_team, g.away_team, g.mlb_game_pk,
                   EXTRACT(YEAR FROM g.date)::int AS season
            FROM statcast_events se
            JOIN games g ON se.mlb_game_pk = g.mlb_game_pk
            WHERE g.attended = true AND se.event_type = 'home_run'
            ORDER BY se.hit_distance_sc DESC
        """)).fetchall()

        # --- Barrels ---
        barrel_rows = conn.execute(text("""
            SELECT EXTRACT(YEAR FROM g.date)::int AS season, COUNT(*) AS barrel_count
            FROM statcast_events se
            JOIN games g ON se.mlb_game_pk = g.mlb_game_pk
            WHERE g.attended = true
              AND se.launch_speed >= 98
              AND se.launch_angle BETWEEN 8 AND 50
            GROUP BY season
        """)).fetchall()
        barrels_by_season = {int(r.season): r.barrel_count for r in barrel_rows}

        # --- Top WPA moment per season ---
        wpa_rows = conn.execute(text("""
            SELECT DISTINCT ON (season)
                   EXTRACT(YEAR FROM g.date)::int AS season,
                   se.wpa, se.batter_name, se.event_type, se.raw_description,
                   g.date, g.home_team, g.away_team
            FROM statcast_events se
            JOIN games g ON se.mlb_game_pk = g.mlb_game_pk
            WHERE g.attended = true AND se.wpa IS NOT NULL
            ORDER BY season, ABS(se.wpa) DESC
        """)).fetchall()
        top_wpa_by_season = {}
        for r in wpa_rows:
            top_wpa_by_season[int(r.season)] = {
                "wpa": float(r.wpa),
                "batter": r.batter_name,
                "event_type": r.event_type,
                "description": r.raw_description,
                "date": r.date.isoformat(),
                "matchup": f"{r.away_team} @ {r.home_team}",
            }

        # --- Load drama scores from heartbeat data ---
        drama_by_pk = {}
        try:
            with open("web/public/heartbeat_data.json") as f:
                for game in json.load(f):
                    drama_by_pk[game["game_pk"]] = {
                        "drama_score": game["drama_score"],
                        "drama_category": game["drama_category"],
                        "matchup": game["matchup"],
                        "date": game["date"],
                        "score": game["score"],
                    }
        except FileNotFoundError:
            print("Warning: heartbeat_data.json not found, drama stats will be empty")

    # --- Build per-season stats ---
    seasons: dict[int, dict] = {}

    for g in games_rows:
        s = int(g.season)
        if s not in seasons:
            seasons[s] = {
                "season": s,
                "games_attended": 0,
                "wins": 0,
                "losses": 0,
                "venues": defaultdict(int),
                "home_runs": [],
                "longest_hr": None,
                "highest_exit_velo": None,
                "barrel_count": barrels_by_season.get(s, 0),
                "top_wpa_moment": top_wpa_by_season.get(s),
                "most_dramatic_game": None,
                "avg_drama_score": 0,
                "drama_scores": [],
            }

        entry = seasons[s]
        entry["games_attended"] += 1
        entry["venues"][g.venue_name or "Unknown"] += 1

        # W/L from the perspective of the home team you saw
        # (simplified: did the team with the higher score win?)
        if g.home_score is not None and g.away_score is not None:
            if g.home_score > g.away_score:
                entry["wins"] += 1
            else:
                entry["losses"] += 1

        # Drama
        pk = g.mlb_game_pk
        if pk in drama_by_pk:
            d = drama_by_pk[pk]
            entry["drama_scores"].append(d["drama_score"])
            if entry["most_dramatic_game"] is None or d["drama_score"] > entry["most_dramatic_game"]["drama_score"]:
                entry["most_dramatic_game"] = d

    # Add HR stats per season
    for hr in hr_rows:
        s = int(hr.season)
        if s not in seasons:
            continue
        entry = seasons[s]
        hr_info = {
            "distance": hr.hit_distance_sc,
            "exit_velo": hr.launch_speed,
            "batter": hr.batter_name,
            "date": hr.date.isoformat(),
            "matchup": f"{hr.away_team} @ {hr.home_team}",
        }
        entry["home_runs"].append(hr_info)
        if entry["longest_hr"] is None or (hr.hit_distance_sc or 0) > (entry["longest_hr"]["distance"] or 0):
            entry["longest_hr"] = hr_info
        if entry["highest_exit_velo"] is None or (hr.launch_speed or 0) > (entry["highest_exit_velo"]["exit_velo"] or 0):
            entry["highest_exit_velo"] = hr_info

    # Finalize
    result = []
    for s in sorted(seasons.keys(), reverse=True):
        entry = seasons[s]
        entry["total_home_runs"] = len(entry["home_runs"])
        del entry["home_runs"]  # Don't need full list in summary
        entry["venues"] = dict(entry["venues"])
        if entry["drama_scores"]:
            entry["avg_drama_score"] = round(sum(entry["drama_scores"]) / len(entry["drama_scores"]), 1)
        del entry["drama_scores"]
        result.append(entry)

    output_path = "web/public/season_stats.json"
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Exported {len(result)} seasons to {output_path}")
    for entry in result:
        print(f"  {entry['season']}: {entry['games_attended']} games, {entry['total_home_runs']} HRs, "
              f"avg drama {entry['avg_drama_score']}")


if __name__ == "__main__":
    main()
