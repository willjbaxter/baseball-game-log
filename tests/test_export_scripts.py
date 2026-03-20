"""Tests for export helper functions (no database needed)."""

from scripts.export_heartbeat_data import calculate_drama_score, categorize_drama


# ===================== calculate_drama_score =====================


def test_drama_score_empty_list():
    assert calculate_drama_score([]) == 0


def test_drama_score_single_small_event():
    score = calculate_drama_score([{"wpa": 0.05}])
    assert score > 0
    assert score < 100


def test_drama_score_high_drama_events():
    events = [
        {"wpa": 0.4},
        {"wpa": -0.3},
        {"wpa": 0.5},
        {"wpa": -0.2},
        {"wpa": 0.15},
    ]
    score = calculate_drama_score(events)
    # High absolute swings + multiple significant moments -> high score
    assert score > 20


def test_drama_score_capped_at_100():
    # Create extremely volatile events that would exceed 100 without the cap
    events = [{"wpa": 0.9}, {"wpa": -0.9}] * 50
    score = calculate_drama_score(events)
    assert score == 100


# ===================== categorize_drama =====================


def test_categorize_flatline_zero():
    cat = categorize_drama(0)
    assert cat["level"] == "flatline"


def test_categorize_flatline_boundary():
    cat = categorize_drama(19)
    assert cat["level"] == "flatline"


def test_categorize_steady_lower():
    cat = categorize_drama(20)
    assert cat["level"] == "steady"


def test_categorize_steady_upper():
    cat = categorize_drama(39)
    assert cat["level"] == "steady"


def test_categorize_elevated_lower():
    cat = categorize_drama(40)
    assert cat["level"] == "elevated"


def test_categorize_elevated_upper():
    cat = categorize_drama(69)
    assert cat["level"] == "elevated"


def test_categorize_cardiac_lower():
    cat = categorize_drama(70)
    assert cat["level"] == "cardiac_arrest"


def test_categorize_cardiac_100():
    cat = categorize_drama(100)
    assert cat["level"] == "cardiac_arrest"
