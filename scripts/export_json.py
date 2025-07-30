#!/usr/bin/env python3
"""Export selected datasets from the Postgres DB to JSON files.

Usage:
    python scripts/export_json.py <output_dir>

The script expects DATABASE_URL env var pointing to the same DB used by the ingester.
"""
import json
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text
import pandas as pd

# ---------------------------------------------------------------------------
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("DATABASE_URL env var is required", file=sys.stderr)
    sys.exit(1)

# Convert asyncpg URL to psycopg2 for pandas compatibility
if "+asyncpg" in DB_URL:
    DB_URL = DB_URL.replace("+asyncpg", "+psycopg2")

engine = create_engine(DB_URL)

# ---------------------------------------------------------------------------

def dump(df: pd.DataFrame, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_json(out_path, orient="records", date_format="iso")
    print(f"Wrote {len(df):,} rows → {out_path.relative_to(Path.cwd())}")


def export_all(out_dir: Path):
    # Games table (basic fields for listing)
    games_sql = text(
        """
        SELECT mlb_game_pk       AS game_pk,
               date,
               home_team,
               away_team,
               home_score,
               away_score,
               attended
        FROM games
        WHERE attended IS TRUE
        ORDER BY date DESC;
        """
    )
    games = pd.read_sql(games_sql, engine)
    dump(games, out_dir / "games.json")

    # Longest home runs (top 100 by distance)
    longest_hr_sql = text(
        """
        SELECT se.mlb_game_pk AS game_pk,
               se.batter_name,
               se.pitcher_name,
               se.hit_distance_sc AS distance,
               se.launch_speed,
               se.launch_angle,
               g.date,
               g.home_team,
               g.away_team
        FROM statcast_events se
        JOIN games g ON g.mlb_game_pk = se.mlb_game_pk
        WHERE g.attended IS TRUE
          AND se.event_type = 'home_run'
          AND se.hit_distance_sc IS NOT NULL
        ORDER BY se.hit_distance_sc DESC
        LIMIT 100;
        """
    )
    longest_hrs = pd.read_sql(longest_hr_sql, engine)
    dump(longest_hrs, out_dir / "longest_homers.json")

    # Lifetime WPA leaders (top 25)
    wpa_sql = text(
        """
        SELECT batter_name,
               ROUND(SUM(wpa)::numeric, 3) AS lifetime_wpa
        FROM statcast_events se
        JOIN games g USING (mlb_game_pk)
        WHERE g.attended IS TRUE
          AND wpa IS NOT NULL
        GROUP BY batter_name
        ORDER BY lifetime_wpa DESC
        LIMIT 25;
        """
    )
    wpa = pd.read_sql(wpa_sql, engine)
    dump(wpa, out_dir / "wpa_leaders.json")

    # WPA sparkline per game (cumulative over plays)
    spark_data = []
    with engine.connect() as conn:
        game_pks = [row[0] for row in conn.execute(text("SELECT mlb_game_pk FROM games WHERE attended IS TRUE"))]
        for pk in game_pks:
            df = pd.read_sql(
                text(
                    """
                    SELECT event_datetime, wpa
                    FROM statcast_events
                    WHERE mlb_game_pk = :pk AND wpa IS NOT NULL
                    ORDER BY event_datetime
                    """
                ),
                conn,
                params={"pk": pk},
            )
            if df.empty:
                continue
            df["cum"] = df["wpa"].cumsum().round(3)
            spark_data.append({"game_pk": pk, "series": df["cum"].tolist()})

    dump(pd.DataFrame(spark_data), out_dir / "wpa_sparkline.json")

    # Barrel map data (exit velocity vs launch angle)
    barrel_sql = text(
        """
        SELECT se.launch_speed,
               se.launch_angle,
               se.batter_name,
               se.event_type,
               se.raw_description,
               g.date,
               g.home_team,
               g.away_team
        FROM statcast_events se
        JOIN games g ON g.mlb_game_pk = se.mlb_game_pk
        WHERE g.attended IS TRUE
          AND se.launch_speed IS NOT NULL
          AND se.launch_angle IS NOT NULL
        ORDER BY g.date DESC, se.event_datetime;
        """
    )
    barrel_data = pd.read_sql(barrel_sql, engine)
    
    # Add outcome categorization
    def categorize_outcome(event_type):
        if not event_type:
            return "hit"
        event_type = event_type.lower()
        if event_type == "home_run":
            return "home_run"
        elif any(word in event_type for word in ["out", "error", "fielders_choice"]):
            return "out"
        elif event_type in ["single", "double", "triple"]:
            return "hit"
        else:
            return "hit"
    
    def is_barrel(row):
        ev = row['launch_speed']
        la = row['launch_angle']
        if ev and la:
            return (8 <= la <= 50) and (ev >= 98)
        return False
    
    barrel_data['outcome'] = barrel_data['event_type'].apply(categorize_outcome)
    barrel_data['is_barrel'] = barrel_data.apply(is_barrel, axis=1)
    barrel_data['matchup'] = barrel_data['away_team'] + ' @ ' + barrel_data['home_team']
    barrel_data['description'] = barrel_data['event_type'].fillna(barrel_data['raw_description'])
    
    dump(barrel_data, out_dir / "barrel_map.json")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: export_json.py <output_dir>")
        sys.exit(1)
    export_all(Path(sys.argv[1]).resolve()) 