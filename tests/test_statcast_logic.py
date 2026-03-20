"""Tests for pure functions: sort_statcast_dataframe, safe_int, normalize_player_name, is_barrel.

No database connection required.
"""

import math

import pandas as pd
import pytest

from config import is_barrel
from scraper.players import normalize_player_name
from scraper.statcast_fetcher import safe_int, sort_statcast_dataframe


# ===================== sort_statcast_dataframe =====================


def test_sort_empty_dataframe():
    df = pd.DataFrame()
    result = sort_statcast_dataframe(df)
    assert result.empty


def test_sort_none_dataframe():
    result = sort_statcast_dataframe(None)
    assert result is None


def test_sort_inning_ordering():
    df = pd.DataFrame(
        {
            "inning": [3, 1, 2],
            "inning_topbot": ["Top", "Top", "Top"],
            "at_bat_number": [5, 1, 3],
            "pitch_number": [1, 1, 1],
        }
    )
    result = sort_statcast_dataframe(df)
    assert list(result["inning"]) == [1, 2, 3]


def test_sort_top_before_bot():
    df = pd.DataFrame(
        {
            "inning": [1, 1],
            "inning_topbot": ["Bot", "Top"],
            "at_bat_number": [1, 1],
            "pitch_number": [1, 1],
        }
    )
    result = sort_statcast_dataframe(df)
    assert list(result["inning_topbot"]) == ["Top", "Bot"]


def test_sort_at_bat_and_pitch_subsorting():
    df = pd.DataFrame(
        {
            "inning": [1, 1, 1, 1],
            "inning_topbot": ["Top", "Top", "Top", "Top"],
            "at_bat_number": [2, 1, 1, 2],
            "pitch_number": [1, 2, 1, 2],
        }
    )
    result = sort_statcast_dataframe(df)
    assert list(result["at_bat_number"]) == [1, 1, 2, 2]
    assert list(result["pitch_number"]) == [1, 2, 1, 2]


# ===================== safe_int =====================


def test_safe_int_normal():
    assert safe_int(5) == 5


def test_safe_int_float():
    assert safe_int(3.7) == 4


def test_safe_int_none():
    assert safe_int(None) is None


def test_safe_int_nan():
    assert safe_int(float("nan")) is None


def test_safe_int_string():
    assert safe_int("abc") is None


# ===================== normalize_player_name =====================


def test_normalize_last_comma_first():
    assert normalize_player_name("Devers, Rafael") == "Rafael Devers"


def test_normalize_passthrough():
    assert normalize_player_name("Rafael Devers") == "Rafael Devers"


def test_normalize_empty():
    assert normalize_player_name("") == ""


def test_normalize_nan_string():
    assert normalize_player_name("nan") == ""


def test_normalize_none():
    assert normalize_player_name(None) == ""


# ===================== is_barrel =====================


def test_barrel_exact_boundary_true():
    # 8 degrees, 98 mph -> True (min boundaries)
    assert is_barrel(8, 98) is True


def test_barrel_angle_too_low():
    assert is_barrel(7, 98) is False


def test_barrel_max_angle_boundary():
    assert is_barrel(50, 98) is True


def test_barrel_angle_too_high():
    assert is_barrel(51, 98) is False


def test_barrel_velo_too_low():
    assert is_barrel(30, 97) is False


def test_barrel_none_angle():
    assert is_barrel(None, 100) is False


def test_barrel_none_velo():
    assert is_barrel(30, None) is False


def test_barrel_both_none():
    assert is_barrel(None, None) is False
