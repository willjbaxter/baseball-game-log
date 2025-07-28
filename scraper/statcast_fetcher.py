#!/usr/bin/env python3
"""Fetch Statcast events for attended games and store in DB."""
import os
import sys
from datetime import date
from typing import List
import math
import time
from httpx import HTTPStatusError


def safe_int(val):
    try:
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return None
        return int(round(float(val)))
    except (ValueError, TypeError):
        return None

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


def get_gf_lookup(pk: int) -> dict[str, str]:
    """Return {sv_id: play_id} mapping for a game_pk using Baseball Savant gf feed."""
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
            # gf feed JSON: {'home': [...], 'away': [...]} each item has 'sv_id' and 'play_id'
            for side in ("home", "away"):
                for play in data.get(side, []):
                    sv = play.get("sv_id")
                    pid = play.get("play_id")
                    if sv and pid:
                        lookup[str(sv)] = str(pid)
            _gf_cache[pk] = lookup
            return lookup
        except (httpx.RequestError, httpx.HTTPStatusError):
            tries += 1
            time.sleep(2 * tries)
    # give up
    _gf_cache[pk] = {}
    return {}


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

    Strategy:
    1. Prefer the official MLB StatsAPI /feed/live endpoint as it is
       authoritative and consistent across seasons.
    2. Fallback to ``pybaseball.statcast_single_game`` only if the live feed
       route is unavailable (older spring exhibitions, API outage, etc.).
    """

    if not g.mlb_game_pk:
        return []

    # -------- 1) StatsAPI live feed ---------
    data = fetch_playbyplay_json(g.mlb_game_pk)
    if data and "liveData" in data:
        plays = data["liveData"]["plays"]["allPlays"]
        events: list[StatcastEvent] = []
        for play in plays:
            hd = play.get("hitData")
            if not hd or hd.get("launchSpeed") is None:
                continue  # skip non-batted-ball events

            # try to pull sv_id for mapping if no playId
            clip_uuid = play.get("playId")
            if not clip_uuid:
                # sv_id lives on the first pitch event if available
                try:
                    sv_candidate = play["playEvents"][0].get("svId")
                except (IndexError, KeyError, TypeError):
                    sv_candidate = None
                if sv_candidate:
                    lookup = get_gf_lookup(g.mlb_game_pk)
                    clip_uuid = lookup.get(str(sv_candidate))

            events.append(
                StatcastEvent(
                    mlb_game_pk=g.mlb_game_pk,
                    event_datetime=str(
                        play.get("playEndTime") or play.get("playStartTime") or ""
                    ),
                    batter_name=str(play["matchup"]["batter"].get("fullName") or ""),
                    pitcher_name=str(play["matchup"]["pitcher"].get("fullName") or ""),
                    pitch_type=play.get("details", {}).get("type", {}).get("code"),
                    launch_speed=safe_int(hd.get("launchSpeed")),
                    launch_angle=safe_int(hd.get("launchAngle")),
                    estimated_ba=safe_int(hd.get("estimatedBA") * 1000)
                    if hd.get("estimatedBA")
                    else None,
                    description=play.get("result", {}).get("event"),
                    clip_uuid=clip_uuid,
                )
            )

        if events:
            return events

    # -------- 2) pybaseball fallback ---------
    try:
        df: pd.DataFrame | None = sc_game(g.mlb_game_pk)
    except Exception as e:
        print(f"pybaseball error pk {g.mlb_game_pk}: {e}")
        df = None

    if df is None or df.empty:
        return []

    events: list[StatcastEvent] = []
    for _, row in df.iterrows():
        # pybaseball uses numeric pitcher id – coerce to str for consistency
        # WPA: delta_home_win_exp is change in home team's win expectancy.
        # --- WPA ---
        d_home = row.get("delta_home_win_exp")
        wpa_val = None
        if d_home is not None and d_home == d_home:  # not NaN
            bos_is_home = g.home_team_id == 111  # 111 = Red Sox
            wpa_val = round(float(d_home) if bos_is_home else -float(d_home), 6)

        clip_uuid = row.get("play_id") or row.get("play_guid")
        if not clip_uuid and row.get("sv_id"):
            lookup = get_gf_lookup(g.mlb_game_pk)
            clip_uuid = lookup.get(str(row.get("sv_id")))

        events.append(
            StatcastEvent(
                mlb_game_pk=g.mlb_game_pk,
                event_datetime=str(row.get("game_date")),
                batter_name=str(row.get("player_name") or ""),
                pitcher_name=str(row.get("pitcher") or ""),
                pitch_type=row.get("pitch_type"),
                launch_speed=safe_int(row.get("launch_speed")),
                launch_angle=safe_int(row.get("launch_angle")),
                estimated_ba=safe_int(row.get("estimated_ba_using_speedangle")),
                description=row.get("description"),
                wpa=wpa_val,
                clip_uuid=clip_uuid,
            )
        )

    return events


def run():
    db = SessionLocal()
    try:
        # Only pull Statcast for games the user actually attended.
        games = (
            db.query(Game)
            .filter(Game.attended.is_(True), Game.mlb_game_pk.isnot(None))
            .all()
        )
        total_inserted = 0
        for g in games:
            events = fetch_statcast_for_game(g)
            if not events:
                continue
            with db.no_autoflush:
                for ev in events:
                    exists = db.query(StatcastEvent).filter(
                        StatcastEvent.mlb_game_pk == ev.mlb_game_pk,
                        StatcastEvent.event_datetime == ev.event_datetime,
                        StatcastEvent.batter_name == ev.batter_name,
                    ).first()
                    if not exists:
                        db.add(ev)
                        total_inserted += 1
            db.commit()
            print(f"{g.date} {g.away_team}@{g.home_team} → inserted {len(events)} events")
        print(f"✅ Done. Inserted {total_inserted} statcast events.")
    finally:
        db.close()


if __name__ == "__main__":
    run() 