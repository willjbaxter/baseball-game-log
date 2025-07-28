from sqlalchemy import Column, Integer, String, Date, Boolean, Text, ForeignKey, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    home_team = Column(String(3), nullable=False)  # BOS, NYY, etc.
    away_team = Column(String(3), nullable=False)
    home_team_id = Column(Integer, nullable=True)  # 111 for BOS
    away_team_id = Column(Integer, nullable=True)
    home_score = Column(Integer, nullable=True)  # May be null until enriched
    away_score = Column(Integer, nullable=True)
    venue_id = Column(Integer, nullable=True)
    venue_name = Column(String(100), nullable=True)
    weather = Column(JSONB, nullable=True)
    attended = Column(Boolean, default=False)
    source = Column(String(50), nullable=True)  # "ballpark_app", "scorecard", "manual"
    mlb_game_pk = Column(Integer, nullable=True)  # Official MLB game ID

    # Relationships
    scorecards = relationship("ScorecardPage", back_populates="game")

    def __repr__(self):
        return f"<Game pk={self.mlb_game_pk} date={self.date} away={self.away_team} home={self.home_team}>"


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


# ---------------- Statcast Event Model ---------------- #

class StatcastEvent(Base):
    __tablename__ = "statcast_events"

    id = Column(Integer, primary_key=True, index=True)
    mlb_game_pk = Column(Integer, nullable=False)
    event_datetime = Column(String(30), nullable=False)
    batter_name = Column(String(100), nullable=True)
    pitcher_name = Column(String(100), nullable=True)
    pitch_type = Column(String(10), nullable=True)
    launch_speed = Column(Integer, nullable=True)  # EV mph
    launch_angle = Column(Integer, nullable=True)
    estimated_ba = Column(Integer, nullable=True)  # xBA *1000
    description = Column(Text, nullable=True)
    wpa = Column(Float, nullable=True)  # Win Probability Added relative to Red Sox
    clip_uuid = Column(String(40), nullable=True)
    video_url = Column(Text, nullable=True)  # Direct URL to MP4

    def __repr__(self):
        return f"<StatcastEvent game_pk={self.mlb_game_pk} ev={self.launch_speed}>" 