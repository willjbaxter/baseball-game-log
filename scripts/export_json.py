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

    # Hardest-hit balls (top 100 EV)
    hh_sql = text(
        """
        SELECT mlb_game_pk AS game_pk,
               batter_name,
               launch_speed,
               launch_angle,
               event_datetime
        FROM statcast_events se
        JOIN games g ON g.mlb_game_pk = se.mlb_game_pk
        WHERE g.attended IS TRUE
          AND launch_speed IS NOT NULL
        ORDER BY launch_speed DESC
        LIMIT 100;
        """
    )
    hardest = pd.read_sql(hh_sql, engine)
    dump(hardest, out_dir / "hardest_hits.json")

    # Lifetime WPA leaders (top 25)
    wpa_sql = text(
        """
        SELECT batter_name,
               ROUND(SUM(wpa), 3) AS lifetime_wpa
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


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: export_json.py <output_dir>")
        sys.exit(1)
    export_all(Path(sys.argv[1]).resolve()) 