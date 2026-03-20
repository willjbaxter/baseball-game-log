"""Extended data-integrity tests against the live database.

Uses the session-scoped ``db_session`` fixture from conftest.py.
"""

import datetime as _dt

from api.models import Game, StatcastEvent


def test_wpa_values_in_range(db_session):
    """All stored WPA values must be between -1 and 1."""
    bad = (
        db_session.query(StatcastEvent)
        .filter(
            StatcastEvent.wpa.isnot(None),
            ~StatcastEvent.wpa.between(-1.0, 1.0),
        )
        .count()
    )
    assert bad == 0, f"{bad} statcast events have WPA outside [-1, 1]"


def test_no_blank_batter_name(db_session):
    """Every statcast event should have a non-empty batter_name."""
    bad = (
        db_session.query(StatcastEvent)
        .filter(
            (StatcastEvent.batter_name.is_(None))
            | (StatcastEvent.batter_name == "")
        )
        .count()
    )
    assert bad == 0, f"{bad} statcast events have blank/empty batter_name"


def test_launch_speed_range(db_session):
    """Launch speed should be 0-130 mph when present."""
    bad = (
        db_session.query(StatcastEvent)
        .filter(
            StatcastEvent.launch_speed.isnot(None),
            ~StatcastEvent.launch_speed.between(0, 130),
        )
        .count()
    )
    assert bad == 0, f"{bad} events have launch_speed outside 0-130"


def test_launch_angle_range(db_session):
    """Launch angle should be -90 to 90 degrees when present."""
    bad = (
        db_session.query(StatcastEvent)
        .filter(
            StatcastEvent.launch_angle.isnot(None),
            ~StatcastEvent.launch_angle.between(-90, 90),
        )
        .count()
    )
    assert bad == 0, f"{bad} events have launch_angle outside -90 to 90"


def test_past_attended_games_have_scores(db_session):
    """All attended games with dates in the past should have scores filled in."""
    missing = (
        db_session.query(Game)
        .filter(
            Game.attended.is_(True),
            Game.date < _dt.date.today(),
            (Game.home_score.is_(None) | Game.away_score.is_(None)),
        )
        .count()
    )
    assert missing == 0, f"{missing} past attended games are missing scores"


def test_statcast_events_reference_valid_games(db_session):
    """Every statcast event's mlb_game_pk should match a row in the games table."""
    orphans = (
        db_session.query(StatcastEvent.mlb_game_pk)
        .outerjoin(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
        .filter(Game.id.is_(None))
        .group_by(StatcastEvent.mlb_game_pk)
        .count()
    )
    assert orphans == 0, f"{orphans} distinct game_pk(s) in statcast_events have no matching game"
