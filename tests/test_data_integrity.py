import datetime as _dt
from sqlalchemy import func
from api.models import Game


def test_no_missing_pks(db_session):
    missing = (
        db_session.query(Game)
        .filter(
            Game.attended.is_(True),
            Game.date <= _dt.date.today(),
            Game.mlb_game_pk.is_(None),
        )
        .count()
    )
    assert missing == 0, f"{missing} attended games missing mlb_game_pk"


def test_unique_game_pk(db_session):
    dups = (
        db_session.query(Game.mlb_game_pk, func.count(Game.id))
        .group_by(Game.mlb_game_pk)
        .having(func.count(Game.id) > 1)
        .all()
    )
    assert not dups, f"duplicate game_pk rows: {dups}"


def test_statcast_only_attended(db_session):
    from api.models import StatcastEvent  # local import to avoid circular

    rows = (
        db_session.query(StatcastEvent)
        .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
        .filter(Game.attended.isnot(True))
        .limit(1)
        .all()
    )
    assert not rows, "Statcast contains events from unattended games"


def test_all_statcast_have_clip(db_session):
    from api.models import StatcastEvent

    missing = (
        db_session.query(StatcastEvent)
        .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
        .filter(Game.attended.is_(True), StatcastEvent.clip_uuid.is_(None))
        .count()
    )
    assert missing == 0, f"{missing} attended Statcast rows missing clip_uuid" 