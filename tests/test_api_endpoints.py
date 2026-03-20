"""Tests for all FastAPI endpoints using TestClient against the live database."""

import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


# --------------- /health ---------------

def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# --------------- /games ---------------

def test_games_returns_200_with_expected_keys():
    response = client.get("/games")
    assert response.status_code == 200
    data = response.json()
    assert "games" in data
    assert "total" in data
    assert data["total"] > 0


# --------------- /statcast/longest-homers ---------------

def test_longest_homers_returns_200():
    response = client.get("/statcast/longest-homers")
    assert response.status_code == 200
    data = response.json()
    assert "homers" in data
    if data["homers"]:
        item = data["homers"][0]
        assert "distance" in item
        assert "batter" in item
        assert "pitcher" in item


def test_longest_homers_respects_limit():
    response = client.get("/statcast/longest-homers?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["homers"]) <= 5


# --------------- /statcast/barrel-map ---------------

def test_barrel_map_returns_200():
    response = client.get("/statcast/barrel-map")
    assert response.status_code == 200
    data = response.json()
    assert "batted_balls" in data


# --------------- /statcast/wpa/leaders ---------------

def test_wpa_leaders_returns_200():
    response = client.get("/statcast/wpa/leaders")
    assert response.status_code == 200
    data = response.json()
    assert "leaders" in data


def test_wpa_leaders_respects_limit():
    response = client.get("/statcast/wpa/leaders?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["leaders"]) <= 5


# --------------- /statcast/wpa/player ---------------

def test_wpa_player_with_real_name(db_session):
    """Pick the most-common batter in the DB and verify the endpoint returns data."""
    from sqlalchemy import func
    from api.models import StatcastEvent, Game

    row = (
        db_session.query(StatcastEvent.batter_name)
        .join(Game, StatcastEvent.mlb_game_pk == Game.mlb_game_pk)
        .filter(
            Game.attended.is_(True),
            StatcastEvent.wpa.isnot(None),
            StatcastEvent.batter_name.isnot(None),
            StatcastEvent.batter_name != "",
        )
        .group_by(StatcastEvent.batter_name)
        .order_by(func.count(StatcastEvent.id).desc())
        .first()
    )
    assert row is not None, "No batter with WPA data found in DB"
    player_name = row[0]

    response = client.get(f"/statcast/wpa/player/{player_name}")
    assert response.status_code == 200
    data = response.json()
    assert data["player"] == player_name
    assert len(data["games"]) > 0


def test_wpa_player_nonexistent_returns_empty():
    response = client.get("/statcast/wpa/player/NonexistentPlayer999")
    assert response.status_code == 200
    data = response.json()
    assert data["games"] == []
