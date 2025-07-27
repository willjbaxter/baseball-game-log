from sqlalchemy import Column, Integer, String, Date, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    home_team = Column(String(3), nullable=False)  # BOS, NYY, etc.
    away_team = Column(String(3), nullable=False)
    home_score = Column(Integer, nullable=True)  # May be null until enriched
    away_score = Column(Integer, nullable=True)
    venue = Column(String(100), nullable=True)  # "Fenway Park", "Yankee Stadium"
    attended = Column(Boolean, default=False)
    source = Column(String(50), nullable=True)  # "ballpark_app", "scorecard", "manual"
    mlb_game_pk = Column(Integer, nullable=True)  # Official MLB game ID

    # Relationships
    scorecards = relationship("ScorecardPage", back_populates="game")

    def __repr__(self):
        return f"<Game {self.date} {self.away_team}@{self.home_team}>"


class ScorecardPage(Base):
    __tablename__ = "scorecard_pages"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    image_url = Column(String(255), nullable=True)  # S3 or local path
    notes = Column(Text, nullable=True)

    # Relationships
    game = relationship("Game", back_populates="scorecards")

    def __repr__(self):
        return f"<ScorecardPage game_id={self.game_id}>" 