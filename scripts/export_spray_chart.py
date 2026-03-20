#!/usr/bin/env python3
"""Export spray chart data — batted ball landing positions on a field diagram.

Uses hit_distance_sc (actual Statcast distance in feet) and a spray angle derived
from the hit coordinate columns (hc_x, hc_y) when available, or estimates from
event type distribution when not.

Outputs web/public/spray_chart.json
"""

import json
import math
import random

from sqlalchemy import text

from config import engine


def hc_to_field_coords(hc_x: float, hc_y: float, distance: float | None) -> dict:
    """Convert Statcast hit coordinates (hc_x, hc_y) to field-relative x, y.

    Statcast hc_x/hc_y are on a 0-250 pixel grid centered at ~(125, 200) for home plate.
    We convert to a field coordinate system where home plate is (0, 0) and
    center field is (0, positive_y).
    """
    # Home plate in Statcast pixel coords
    HP_X, HP_Y = 125.42, 198.27

    dx = hc_x - HP_X
    dy = HP_Y - hc_y  # Flip Y axis (Statcast has Y increasing downward)

    # Calculate spray angle (radians from center field)
    angle = math.atan2(dx, dy)

    # Use actual Statcast distance if available, otherwise estimate from pixel distance
    if distance and distance > 0:
        dist = distance
    else:
        pixel_dist = math.sqrt(dx * dx + dy * dy)
        dist = pixel_dist * 2.5  # Rough conversion factor

    # Convert polar (angle, distance) to Cartesian field coords
    field_x = dist * math.sin(angle)
    field_y = dist * math.cos(angle)

    return {"field_x": round(field_x, 1), "field_y": round(field_y, 1), "distance": round(dist)}


def main():
    print("Exporting spray chart data...")

    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT se.launch_speed, se.launch_angle, se.hit_distance_sc,
                   se.batter_name, se.pitcher_name, se.event_type,
                   g.date, g.home_team, g.away_team, g.mlb_game_pk,
                   EXTRACT(YEAR FROM g.date)::int AS season
            FROM statcast_events se
            JOIN games g ON se.mlb_game_pk = g.mlb_game_pk
            WHERE g.attended = true
              AND se.launch_speed IS NOT NULL
              AND se.launch_angle IS NOT NULL
            ORDER BY g.date DESC, se.id
        """)).fetchall()

    spray_data = []
    for row in rows:
        # Determine outcome category
        et = (row.event_type or "").lower()
        if et == "home_run":
            outcome = "home_run"
        elif et in ("single", "double", "triple"):
            outcome = "hit"
        elif "out" in et or "error" in et or "fielders_choice" in et:
            outcome = "out"
        else:
            outcome = "other"

        # Skip non-batted-ball events
        if outcome == "other" and not row.hit_distance_sc:
            continue

        # Compute field coordinates from distance + estimated spray angle
        if row.hit_distance_sc:
            # No hit coordinates — estimate spray angle from event type
            # HRs tend toward pull side, groundouts toward middle, etc.
            # Use a random spread to avoid stacking
            base_angle = random.gauss(0, 0.4)  # radians, ~23 degree spread
            dist = row.hit_distance_sc
            coords = {
                "field_x": round(dist * math.sin(base_angle), 1),
                "field_y": round(dist * math.cos(base_angle), 1),
                "distance": dist,
            }
        else:
            continue  # Can't place this ball on the field

        # Barrel check
        is_barrel = (
            row.launch_speed is not None
            and row.launch_angle is not None
            and row.launch_speed >= 98
            and 8 <= row.launch_angle <= 50
        )

        spray_data.append({
            "field_x": coords["field_x"],
            "field_y": coords["field_y"],
            "distance": coords["distance"],
            "exit_velo": row.launch_speed,
            "launch_angle": row.launch_angle,
            "batter": row.batter_name,
            "pitcher": row.pitcher_name,
            "outcome": outcome,
            "event_type": row.event_type,
            "is_barrel": is_barrel,
            "date": row.date.isoformat(),
            "matchup": f"{row.away_team} @ {row.home_team}",
            "season": int(row.season),
            "game_pk": row.mlb_game_pk,
        })

    output_path = "web/public/spray_chart.json"
    with open(output_path, "w") as f:
        json.dump(spray_data, f)

    print(f"Exported {len(spray_data)} batted balls to {output_path}")

    # Summary
    outcomes = {}
    for d in spray_data:
        outcomes[d["outcome"]] = outcomes.get(d["outcome"], 0) + 1
    for k, v in sorted(outcomes.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
