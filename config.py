"""Centralized configuration for the baseball-game-log project.

All modules should import DATABASE_URL, engine, and SessionLocal from here
instead of constructing their own.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5433/game_log",
)

# Normalize asyncpg → psycopg2 (Docker passes asyncpg URL to API container)
if "+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+asyncpg", "+psycopg2")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Barrel detection constants
BARREL_MIN_LAUNCH_ANGLE = 8
BARREL_MAX_LAUNCH_ANGLE = 50
BARREL_MIN_EXIT_VELO = 98


def is_barrel(launch_angle: float | None, exit_velo: float | None) -> bool:
    """Return True if the batted ball qualifies as a barrel."""
    if launch_angle is None or exit_velo is None:
        return False
    return (BARREL_MIN_LAUNCH_ANGLE <= launch_angle <= BARREL_MAX_LAUNCH_ANGLE) and (
        exit_velo >= BARREL_MIN_EXIT_VELO
    )
