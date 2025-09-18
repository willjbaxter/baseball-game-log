#!/usr/bin/env python3
"""Fetch Statcast events for attended games and store in DB."""

import math
import os
import sys
import time
from typing import List


import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.models import Game, StatcastEvent

# Optional: pybaseball may need env var no_ssl
# pybaseball single game endpoint is more reliable than daily range
from pybaseball import statcast_single_game as sc_game
import httpx

# Cache Savant game-feed per game_pk to avoid refetching
_gf_cache: dict[int, dict[str, str]] = {}


def sort_statcast_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Return DataFrame sorted in true chronological order.

    Statcast exports occasionally return plays grouped by inning but in reverse order
    inside the half-inning. We stabilise the ordering so downstream consumers (DB
    writes, WPA export) see the correct progression of events.
    """

    if df is None or df.empty:
        return df

    working = df.copy()
    working["_row_order"] = list(range(len(working)))

    if "inning_topbot" in working.columns:
        working["_inning_half"] = working["inning_topbot"].map({"Top": 0, "Bot": 1}).fillna(0)
    else:
        working["_inning_half"] = 0

    sort_columns: List[str] = []
    if "inning" in working.columns:
        sort_columns.append("inning")
    sort_columns.append("_inning_half")
    if "at_bat_number" in working.columns:
        sort_columns.append("at_bat_number")
    if "pitch_number" in working.columns:
        sort_columns.append("pitch_number")
    if "sv_id" in working.columns:
        sort_columns.append("sv_id")
    sort_columns.append("_row_order")

    working = working.sort_values(sort_columns, kind="mergesort")
    return working.drop(columns=["_row_order", "_inning_half"], errors="ignore")


def safe_int(val):
    try:
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return None
        return int(round(float(val)))
    except (ValueError, TypeError):
        return None


def normalize_player_name(name: str) -> str:
    """Convert player names to consistent format for matching."""
    if not name or name == 'nan':
        return ""
    
    name = str(name).strip()
    
    # If name is in "Last, First" format, convert to "First Last"
    if ',' in name:
        parts = name.split(',', 1)
        if len(parts) == 2:
            last, first = parts[0].strip(), parts[1].strip()
            return f"{first} {last}"
    
    return name


def lookup_player_name(player_id: int) -> str:
    """Look up player name from MLB API using player ID."""
    if not player_id or pd.isna(player_id):
        return ""
        
    url = f"https://statsapi.mlb.com/api/v1/people/{int(player_id)}"
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        full_name = data['people'][0]['fullName']
        return full_name
    except Exception:
        # If lookup fails, return the ID as string
        return str(int(player_id))


def get_gf_lookup(pk: int) -> dict[str, str]:
    """Return {sv_id: play_id} mapping for a game_pk using Baseball Savant gf feed.

    Savant's JSON schema has changed over the years.  As of 2024+ the payload looks like::

        {
          "team_home": [...],
          "team_away": [...],
          ...
        }

    Each element in those arrays contains ``play_id`` (always) and ``sv_id`` (often for recent
    seasons).  Earlier seasons expose *only* ``play_id``.  We only populate the mapping when an
    ``sv_id`` is present – callers fall back to StatsAPI ``playId`` when Savant cannot map.
    """

    if pk in _gf_cache:
        return _gf_cache[pk]

    url = f"https://baseballsavant.mlb.com/gf?game_pk={pk}"
    tries = 0
    while tries < 3:
        try:
            resp = httpx.get(url, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            lookup: dict[str, str] = {}

            # Iterate through all lists in the JSON to find play data
            for key in data:
                if isinstance(data[key], list):
                    for play in data[key]:
                        if isinstance(play, dict):
                            pid = play.get("play_id") or play.get("playId")
                            sv = play.get("sv_id") or play.get("svId")
                            if sv and pid:
                                lookup[str(sv)] = str(pid)

            _gf_cache[pk] = lookup
            return lookup
        except (httpx.RequestError, httpx.HTTPStatusError) as e: # More specific exception handling
            print(f"DEBUG: HTTP error for pk {pk}: {e}") # Debug logging
            tries += 1
            time.sleep(2 * tries)
        except Exception as e:
            print(f"DEBUG: Unexpected error for pk {pk}: {e}") # Debug logging
            # permanent failure – memoise empty so we don't re-hit inside same run
            _gf_cache[pk] = {}
            return {}

    # permanent failure – memoise empty so we don't re-hit inside same run
    _gf_cache[pk] = {}
    return {}


def get_clip_from_statsapi(game_pk: int, play_id: str) -> str | None:
    """Return the MP4 URL for a given playId from the StatsAPI content endpoint."""
    url = f"https://statsapi.mlb.com/api/v1/game/{game_pk}/content"
    try:
        r = httpx.get(url, timeout=10)
        r.raise_for_status()
        # Note: 'highlights' -> 'highlights' is correct, not a typo.
        for item in r.json().get("highlights", {}).get("highlights", {}).get("items", []):
            if item.get("playId") == play_id:
                # Find the highest-resolution MP4 available.
                mp4_urls = [
                    p["url"]
                    for p in item.get("playbacks", [])
                    if p.get("url", "").endswith(".mp4")
                ]
                if mp4_urls:
                    return max(mp4_urls)
    except Exception:
        pass  # Silently fail, as this is a fallback.
    return None


def fetch_playbyplay_json(pk: int):
    url = f"https://statsapi.mlb.com/api/v1.1/game/{pk}/feed/live"
    try:
        resp = httpx.get(url, timeout=20)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"playByPlay fetch failed for {pk}: {e}")
        return None


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@db:5432/game_log")
if "+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+asyncpg", "+psycopg2")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def fetch_statcast_for_game(g: Game) -> List[StatcastEvent]:
    """Return StatcastEvent objects for a single gamePk.
    
    NEW: Captures ALL plays (not just batted balls) to get complete WPA data.

    Strategy:
    1. Prefer the official MLB StatsAPI /feed/live endpoint as it is
       authoritative and consistent across seasons.
    2. Fallback to ``pybaseball.statcast_single_game`` only if the live feed
       route is unavailable (older spring exhibitions, API outage, etc.).
    """

    if not g.mlb_game_pk:
        return []

    # -------- 1) Use pybaseball as primary source (per user guidance) ---------
    try:
        df: pd.DataFrame | None = sc_game(g.mlb_game_pk)
        if df is not None and not df.empty:
            df = sort_statcast_dataframe(df)
            print(f"✅ pybaseball: Found {len(df)} Statcast events for game {g.mlb_game_pk}")
            
            events: list[StatcastEvent] = []
            for _, row in df.iterrows():
                # Normalize the player name for consistent matching
                batter_raw = str(row.get("player_name", ""))
                batter = normalize_player_name(batter_raw)
                
                # Skip if no batter name
                if not batter or batter == 'nan':
                    continue
                    
                # Get WPA data - use objective team-based WPA (delta_home_win_exp)
                d_home = row.get("delta_home_win_exp")
                wpa_val = None
                if d_home is not None and pd.notna(d_home):
                    # Use the raw delta_home_win_exp value as WPA
                    # Positive = helped home team, Negative = helped away team
                    wpa_val = round(float(d_home), 6)
                
                # Get absolute win probability values
                home_win_exp_val = None
                away_win_exp_val = None
                home_wp = row.get("home_win_exp")
                if home_wp is not None and pd.notna(home_wp):
                    home_win_exp_val = round(float(home_wp), 4)
                    away_win_exp_val = round(1.0 - float(home_wp), 4)
                
                # Get exit velocity, launch angle, and distance
                launch_speed = row.get("launch_speed")
                launch_angle = row.get("launch_angle")
                hit_distance = row.get("hit_distance_sc")
                
                ev_val = None
                la_val = None
                distance_val = None
                if launch_speed is not None and pd.notna(launch_speed):
                    ev_val = round(float(launch_speed))
                if launch_angle is not None and pd.notna(launch_angle):
                    la_val = round(float(launch_angle))
                if hit_distance is not None and pd.notna(hit_distance):
                    distance_val = round(float(hit_distance))

                # Get clip UUID for video
                clip_uuid = None
                play_id = row.get("play_id") or row.get("play_guid")
                sv_id = row.get("sv_id")
                
                if play_id and pd.notna(play_id):
                    clip_uuid = play_id
                elif sv_id and pd.notna(sv_id):
                    lookup = get_gf_lookup(g.mlb_game_pk)
                    clip_uuid = lookup.get(str(sv_id))

                # Get context fields for enhanced tooltips
                inning_val = safe_int(row.get("inning"))
                inning_topbot_val = str(row.get("inning_topbot", "")) if pd.notna(row.get("inning_topbot")) else None
                outs_val = safe_int(row.get("outs_when_up"))
                home_score_val = safe_int(row.get("home_score"))
                away_score_val = safe_int(row.get("away_score"))
                post_home_score_val = safe_int(row.get("post_home_score"))
                post_away_score_val = safe_int(row.get("post_away_score"))
                
                # Baserunners (clean up NaN values)
                on_1b_val = str(row.get("on_1b", "")) if pd.notna(row.get("on_1b")) else None
                on_2b_val = str(row.get("on_2b", "")) if pd.notna(row.get("on_2b")) else None
                on_3b_val = str(row.get("on_3b", "")) if pd.notna(row.get("on_3b")) else None
                
                # Count
                balls_val = safe_int(row.get("balls"))
                strikes_val = safe_int(row.get("strikes"))

                # Resolve pitcher name from ID
                pitcher_id = row.get("pitcher")
                pitcher_name = lookup_player_name(pitcher_id) if pitcher_id and pd.notna(pitcher_id) else ""

                events.append(
                    StatcastEvent(
                        mlb_game_pk=g.mlb_game_pk,
                        event_datetime=str(row.get("game_date", "")),
                        batter_name=batter,
                        pitcher_name=pitcher_name,
                        pitch_type=str(row.get("pitch_type", "")),
                        launch_speed=ev_val,
                        launch_angle=la_val,
                        estimated_ba=safe_int(row.get("estimated_ba_using_speedangle")),
                        raw_description=str(row.get("description", "")),
                        event_type=str(row.get("events", "")),
                        wpa=wpa_val,
                        hit_distance_sc=distance_val,
                        clip_uuid=clip_uuid,
                        # Context fields
                        inning=inning_val,
                        inning_topbot=inning_topbot_val,
                        outs_when_up=outs_val,
                        home_score=home_score_val,
                        away_score=away_score_val,
                        post_home_score=post_home_score_val,
                        post_away_score=post_away_score_val,
                        on_1b=on_1b_val,
                        on_2b=on_2b_val,
                        on_3b=on_3b_val,
                        balls=balls_val,
                        strikes=strikes_val,
                        # Win probability fields
                        home_win_exp=home_win_exp_val,
                        away_win_exp=away_win_exp_val,
                    )
                )
            
            if events:
                print(f"✅ Created {len(events)} events from pybaseball data")
                return events
            
    except Exception as e:
        print(f"⚠️ pybaseball fetch failed: {e}")
        # Fall back to StatsAPI method

    # -------- 2) pybaseball fallback (if StatsAPI completely fails) ---------
    try:
        df: pd.DataFrame | None = sc_game(g.mlb_game_pk)
    except Exception as e:
        print(f"pybaseball error pk {g.mlb_game_pk}: {e}")
        df = None

    if df is None or df.empty:
        return []

    df = sort_statcast_dataframe(df)

    print(f"DEBUG: pybaseball dataframe for game {g.mlb_game_pk}:")
    print(df.head().to_string())
    print(df.columns)

    events: list[StatcastEvent] = []
    for _, row in df.iterrows():
        # Handle pybaseball column name changes
        ls = row.get("launch_speed") or row.get("launch_speed_value")
        la = row.get("launch_angle") or row.get("launch_angle_value")

        if pd.isna(ls):
            continue

        # Get WPA data - use objective team-based WPA (delta_home_win_exp)
        d_home = row.get("delta_home_win_exp")
        wpa_val = None
        if d_home is not None and pd.notna(d_home):
            # Use the raw delta_home_win_exp value as WPA
            # Positive = helped home team, Negative = helped away team
            wpa_val = round(float(d_home), 6)
        
        # Get absolute win probability values (fallback section)
        home_win_exp_val = None
        away_win_exp_val = None
        home_wp = row.get("home_win_exp")
        if home_wp is not None and pd.notna(home_wp):
            home_win_exp_val = round(float(home_wp), 4)
            away_win_exp_val = round(1.0 - float(home_wp), 4)

        clip_uuid = None
        video_url = None

        play_id = row.get("play_id") or row.get("play_guid")
        sv_id = row.get("sv_id")
        at_bat_number = row.get("at_bat_number")

        if play_id and pd.notna(play_id):
            clip_uuid = play_id
        elif sv_id and pd.notna(sv_id):
            lookup = get_gf_lookup(g.mlb_game_pk)
            clip_uuid = lookup.get(str(sv_id))
        
        if not clip_uuid and at_bat_number and pd.notna(at_bat_number):
            video_url = get_clip_from_statsapi(g.mlb_game_pk, str(int(at_bat_number)))

        if clip_uuid:
            video_url = f"https://fastball-clips.mlb.com/{g.mlb_game_pk}/home/{clip_uuid}.mp4"

        # Get distance from hit_distance_sc
        distance_val = None
        hit_distance = row.get("hit_distance_sc")
        if hit_distance is not None and pd.notna(hit_distance):
            distance_val = safe_int(hit_distance)

        # Get context fields for enhanced tooltips (fallback section)
        inning_val = safe_int(row.get("inning"))
        inning_topbot_val = str(row.get("inning_topbot", "")) if pd.notna(row.get("inning_topbot")) else None
        outs_val = safe_int(row.get("outs_when_up"))
        home_score_val = safe_int(row.get("home_score"))
        away_score_val = safe_int(row.get("away_score"))
        post_home_score_val = safe_int(row.get("post_home_score"))
        post_away_score_val = safe_int(row.get("post_away_score"))
        
        # Baserunners (clean up NaN values)
        on_1b_val = str(row.get("on_1b", "")) if pd.notna(row.get("on_1b")) else None
        on_2b_val = str(row.get("on_2b", "")) if pd.notna(row.get("on_2b")) else None
        on_3b_val = str(row.get("on_3b", "")) if pd.notna(row.get("on_3b")) else None
        
        # Count
        balls_val = safe_int(row.get("balls"))
        strikes_val = safe_int(row.get("strikes"))

        # Resolve pitcher name from ID (fallback section)
        pitcher_id = row.get("pitcher")
        pitcher_name = lookup_player_name(pitcher_id) if pitcher_id and pd.notna(pitcher_id) else ""

        events.append(
            StatcastEvent(
                mlb_game_pk=g.mlb_game_pk,
                event_datetime=str(row.get("game_date", "")),
                batter_name=str(row.get("player_name", "")),
                pitcher_name=pitcher_name,
                pitch_type=str(row.get("pitch_type", "")),
                launch_speed=safe_int(ls),
                launch_angle=safe_int(la),
                estimated_ba=safe_int(row.get("estimated_ba_using_speedangle")),
                raw_description=str(row.get("description", "")),
                event_type=str(row.get("events", "")),
                wpa=wpa_val,
                hit_distance_sc=distance_val,
                clip_uuid=clip_uuid,
                video_url=video_url,
                # Context fields
                inning=inning_val,
                inning_topbot=inning_topbot_val,
                outs_when_up=outs_val,
                home_score=home_score_val,
                away_score=away_score_val,
                post_home_score=post_home_score_val,
                post_away_score=post_away_score_val,
                on_1b=on_1b_val,
                on_2b=on_2b_val,
                on_3b=on_3b_val,
                balls=balls_val,
                strikes=strikes_val,
                # Win probability fields
                home_win_exp=home_win_exp_val,
                away_win_exp=away_win_exp_val,
            )
        )

    return events


def run():
    import argparse
    parser = argparse.ArgumentParser(description="Fetch Statcast data for attended games.")
    parser.add_argument("--game", type=int, help="Fetch data for a single gamePk.")
    parser.add_argument("--force", action="store_true", help="Force re-fetch of data even if it exists.")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        games_query = db.query(Game).filter(Game.attended.is_(True), Game.mlb_game_pk.isnot(None))
        if args.game:
            games_query = games_query.filter(Game.mlb_game_pk == args.game)
        
        games_to_process = games_query.order_by(Game.date).all()
        
        total_inserted = 0
        failed_games = []

        for g in games_to_process:
            if not args.force:
                exists = db.query(StatcastEvent).filter(StatcastEvent.mlb_game_pk == g.mlb_game_pk).first()
                if exists:
                    print(f"Game {g.mlb_game_pk} already has data. Skipping. Use --force to re-process.")
                    continue
            
            if args.force:
                deleted_count = db.query(StatcastEvent).filter(StatcastEvent.mlb_game_pk == g.mlb_game_pk).delete()
                if deleted_count > 0:
                    print(f"Game {g.mlb_game_pk}: --force provided, deleted {deleted_count} old events.")
                db.commit()

            try:
                events = fetch_statcast_for_game(g)
                if not events:
                    print(f"⚠️  {g.date} {g.away_team}@{g.home_team} (pk={g.mlb_game_pk}) → Statcast not available; skipping")
                    continue

                db.add_all(events)
                db.commit()
                total_inserted += len(events)
                print(f"{g.date} {g.away_team}@{g.home_team} → inserted {len(events)} events")

            except Exception as e:
                print(f"❌ Game {g.mlb_game_pk} ({g.date}) failed: {e}")
                failed_games.append(g.mlb_game_pk)
                db.rollback()

    finally:
        db.close()

    print(f"✅ Done. Inserted {total_inserted} total statcast events.")
    if failed_games:
        print(f"⚠ Failed games: {failed_games}")


if __name__ == "__main__":
    run() 
