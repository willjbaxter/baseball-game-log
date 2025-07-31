from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import pytest

@pytest.fixture(scope="session")
def db_session():
    """Yield a SQLAlchemy Session bound to DATABASE_URL env var.
    The CI workflow spins up Postgres & sets DATABASE_URL accordingly.
    """
    url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5433/game_log",
    )
    if "+asyncpg" in url:
        url = url.replace("+asyncpg", "+psycopg2")
    engine = create_engine(url)
    Session = sessionmaker(bind=engine)
    sess = Session()
    try:
        yield sess
    finally:
        sess.close() 