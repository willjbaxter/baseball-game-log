"""Shared player name lookup and normalization utilities.

Used by api/main.py, scraper/statcast_fetcher.py, and scripts/export_json.py.
"""

from __future__ import annotations

import functools
import logging

import httpx

logger = logging.getLogger(__name__)

MLB_PEOPLE_URL = "https://statsapi.mlb.com/api/v1/people/{pid}"


@functools.lru_cache(maxsize=2048)
def lookup_player(pid: int) -> str:
    """Resolve an MLB player ID to their full name via the Stats API.

    Results are cached for the lifetime of the process.
    Returns the string player ID on failure so callers always get something displayable.
    """
    try:
        resp = httpx.get(MLB_PEOPLE_URL.format(pid=pid), timeout=10)
        resp.raise_for_status()
        return resp.json()["people"][0]["fullName"]
    except (httpx.HTTPError, KeyError, IndexError) as exc:
        logger.warning("Could not resolve player ID %s: %s", pid, exc)
        return str(pid)


def normalize_player_name(name: str | None) -> str:
    """Convert 'Last, First' → 'First Last'. Pass-through for other formats."""
    if not name or name == "nan":
        return ""
    name = str(name).strip()
    if "," in name:
        last, first = name.split(",", 1)
        return f"{first.strip()} {last.strip()}"
    return name


def resolve_pitcher_display(pitcher_name: str | None) -> str:
    """Return a display-ready pitcher name.

    If the stored value is a numeric ID, resolve it via the API.
    If it's in 'Last, First' format, normalize it.
    """
    if not pitcher_name:
        return ""
    if pitcher_name.isdigit():
        return lookup_player(int(pitcher_name))
    return normalize_player_name(pitcher_name)
