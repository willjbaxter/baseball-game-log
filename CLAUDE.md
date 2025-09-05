# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Baseball Game Log is a multi-component system for tracking attended baseball games, scraping Statcast data, and generating a web frontend. The project consists of:

1. **Database Layer**: PostgreSQL with Alembic migrations managing game attendance, Statcast events, and scorecard pages
2. **Data Pipeline**: Python scrapers that enrich game data via MLB Stats API and fetch Statcast events via pybaseball
3. **API Layer**: FastAPI backend serving game data  
4. **Web Frontend**: Next.js application with data visualizations deployed to Vercel at `baseball.willbaxter.info`

**Current Status**: 32 attended games tracked (2013-2025) with complete Statcast analytics including WPA drama analysis and revolutionary Heartbeat Charts visualization.

## Database Architecture

The system uses PostgreSQL with three main tables:
- `games`: Core game attendance records with MLB game PKs, scores, venue info
- `statcast_events`: Individual pitch/batted ball events with advanced metrics (launch angle, exit velocity, WPA)
- `scorecard_pages`: Linked scorecard images and notes

Database connection defaults to `postgresql+psycopg2://postgres:postgres@localhost:5433/game_log` but respects `DATABASE_URL` environment variable.

## Common Development Commands

### Database Operations
```bash
# Run migrations (use local postgres on port 5433)
export DATABASE_URL="postgresql+psycopg2://postgres:postgres@localhost:5433/game_log"
alembic upgrade head

# Alternative with full path to alembic in venv
./venv/bin/python -m alembic upgrade head
```

### Python Development
```bash
# Run tests
PYTHONPATH=. pytest -q tests/

# Run specific test
PYTHONPATH=. DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log pytest -v tests/test_data_integrity.py::test_statcast_clip_coverage_reasonable

# Code formatting and linting
ruff check
black .

# Data pipeline operations (requires PYTHONPATH for imports)
PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log python3 scraper/enrich_games.py
PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log python3 scraper/statcast_fetcher.py --game 660915 --force
```

### Web Development
```bash
# Next.js development
cd web
npm run dev

# Build and export static site
npm run build

# Linting
npm run lint

# Deploy to production (auto-deploys on push to main via Vercel GitHub integration)
# Manual deploy: vercel --prod
```

### Docker Operations
```bash
# Start local postgres and API
docker compose up -d

# Execute commands in running containers
docker compose exec db psql -U postgres -d game_log
```

## Data Pipeline Architecture

### Game Enrichment Flow
1. `scraper/enrich_games.py` - Queries MLB Stats API to populate `mlb_game_pk`, final scores, venue data
2. `scraper/statcast_fetcher.py` - Uses pybaseball to fetch pitch-by-pitch Statcast data
3. `scripts/export_json.py` - Exports aggregated data to JSON files for static site generation

### Key Data Sources
- **MLB Stats API**: Official game data, scores, venue information
- **Baseball Savant**: Video clip UUIDs and direct MP4 URLs via game feed API
- **pybaseball**: Statcast event data including launch angle, exit velocity, WPA

## Testing

The test suite uses pytest with a session-scoped database fixture. Tests require a running PostgreSQL instance and respect the `DATABASE_URL` environment variable.

Run tests with: `PYTHONPATH=. pytest -q`

## Environment Configuration

Key environment variables:
- `DATABASE_URL`: Database connection string (defaults to local postgres on port 5433)
- Python path often needs to be set: `PYTHONPATH=.` for imports to work correctly

## WPA Drama Analysis Implementation

### Play-Quality Based WPA Calculation
The system uses a unique **play-quality based WPA approach** rather than traditional team-based calculations:

- **Positive WPA**: Exciting/skillful plays regardless of team (home runs, doubles, triples, walks)
- **Negative WPA**: Disappointing/failed plays regardless of team (errors, strikeouts, double plays)
- **Implementation**: `scraper/statcast_fetcher.py` converts team-based `delta_home_win_exp` to play-quality using event types

This creates a team-agnostic drama measurement where Anthony Santander's HR gets +0.503 WPA (exciting) rather than negative (hurts Red Sox).

### Heartbeat Charts Visualization 🫀📈
Revolutionary EKG-style game drama visualization showing WPA swings as medical heartbeats:

**Data Export Pipeline**:
```bash
# Generate heartbeat data from WPA events
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log python3 scripts/export_heartbeat_data.py
```

**Drama Categories**:
- 🫀💥 **Cardiac Arrest** (70+ drama): High volatility, many significant moments
- 📈💗 **Elevated Heartbeat** (40-69 drama): Moderate drama with notable swings  
- 💚📊 **Steady Heartbeat** (20-39 drama): Some excitement but generally stable
- 😴📉 **Flatline** (0-19 drama): Low excitement, minimal WPA swings

**Technical Implementation**:
- `scripts/export_heartbeat_data.py`: Calculates cumulative WPA timelines and drama scores
- `web/src/components/HeartbeatChart.tsx`: SVG-based EKG visualization with medical aesthetics
- **Drama Score Formula**: `(total_absolute_WPA * 10) + (significant_moments * 5) + (volatility * 20)`
- **Interactive Features**: Single game view, stacked comparison, hover tooltips, year filtering

**Data Files**:
- `web/public/heartbeat_data.json`: Pre-exported game drama data for static site
- `web/public/drama_index.json`: Top 50 WPA moments for Drama Index tab

### Data Export Scripts
```bash
# Export all visualization data (requires PYTHONPATH and DATABASE_URL)
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages python3 scripts/export_json.py web/public/              # General game/stats data
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages python3 scripts/export_wpa_drama.py         # Top WPA moments
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages python3 scripts/export_heartbeat_data.py    # Game heartbeat timelines
```

## Adding New Games Process

### Recommended Workflow for Future Games

**IMPORTANT**: Wait 24+ hours after game completion before adding games to ensure Statcast data is available.

1. **Add game to local database first** (avoid GitHub Actions overwriting local data):
   ```bash
   # Add game manually to local database with auto-fetch from MLB API
   DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages python3 -c "
   import httpx
   from sqlalchemy import create_engine, text
   from datetime import datetime
   import os
   
   game_pk = XXXXX  # Replace with actual game PK
   url = f'https://statsapi.mlb.com/api/v1/schedule?sportId=1&gamePk={game_pk}&hydrate=team'
   resp = httpx.get(url, timeout=10)
   data = resp.json()
   game = data['dates'][0]['games'][0]
   
   # Extract and insert game details
   date = datetime.fromisoformat(game['officialDate']).strftime('%Y-%m-%d')
   home_team = game['teams']['home']['team']['abbreviation']
   away_team = game['teams']['away']['team']['abbreviation']
   home_score = game['teams']['home'].get('score')
   away_score = game['teams']['away'].get('score')
   venue_name = game['venue']['name']
   
   engine = create_engine(os.getenv('DATABASE_URL'))
   with engine.connect() as conn:
       conn.execute(text('''INSERT INTO games (mlb_game_pk, date, home_team, away_team, home_score, away_score, venue_name, attended)
           VALUES (:pk, :date, :home_team, :away_team, :home_score, :away_score, :venue_name, true)'''), 
           {'pk': game_pk, 'date': date, 'home_team': home_team, 'away_team': away_team, 
            'home_score': home_score, 'away_score': away_score, 'venue_name': venue_name})
       conn.commit()
   print(f'Added game {game_pk}: {date} {away_team} @ {home_team} {away_score}-{home_score}')
   "
   ```

2. **Fetch Statcast data**:
   ```bash
   PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log python3 scraper/statcast_fetcher.py --game XXXXX --force
   ```

3. **Run complete data export pipeline**:
   ```bash
   DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages python3 scripts/export_json.py web/public/
   DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages python3 scripts/export_heartbeat_data.py
   DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages python3 scripts/export_wpa_drama.py
   ```

4. **Deploy to production**:
   ```bash
   cd web
   npm run build
   # Auto-deploys via Vercel GitHub integration when pushed to main
   ```

### Statcast Data Availability Timing
- **Typical lag**: 24+ hours after game completion
- **Test confirmed**: Game 776505 (Sept 1st, 2025) had no Statcast data when checked Sept 2nd
- **pybaseball behavior**: Defaults to "yesterday's date" - optimized for next-day data availability  
- **Recommendation**: Add games 24-48 hours after completion to ensure full data availability

### Recent Development & Fixes (September 2025)

#### Enhanced Heartbeat Tooltips Implementation 🎯
- **Feature**: Implemented rich contextual tooltips for heartbeat chart visualization
- **Database Schema**: Added 12 context fields to `StatcastEvent` model (inning, outs, score, baserunners, count)
- **Pitcher Name Resolution**: Added MLB API integration to resolve player IDs to actual pitcher names
- **Enhanced Export**: Updated `export_heartbeat_data.py` to include game situation context
- **Frontend Enhancement**: Improved `HeartbeatChart.tsx` with comprehensive tooltip display
- **Performance**: Uses pre-computed JSON export for fast client-side rendering

**Enhanced Tooltip Format:**
```
Player Name - event_type
vs Pitcher Name  
WPA: +0.153
Running total: +0.504
Bot 2, 0 outs, 2-2 count
Score: 2-0 → 2-2
```

#### Data Integrity & WPA Corrections
- **WPA Fix**: Corrected WPA calculation from Boston-relative to objective team-based values
- **Issue**: Home runs and triples were incorrectly showing negative WPA due to flipped sign logic
- **Solution**: Use raw `delta_home_win_exp` values (positive = helped home team, negative = helped away team)
- **Impact**: All 32 games re-processed with corrected WPA values (9,798 total events)

#### Current Enhanced Tooltip Coverage
- **Status**: 70.9% of statcast events have enhanced tooltips (6,740/9,512 events)
- **Fully Enhanced Games**: TB@BOS, NYY@BOS, LAD@BOS, KC@BOS with proper pitcher names and context
- **Remaining**: 29.1% still show player IDs pending MLB API resolution batch processing

## Production Deployment Next Steps

### 1. Complete Enhanced Tooltip Rollout (Optional)
```bash
# Process remaining games with pitcher name resolution (time-intensive due to MLB API calls)
PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log python3 scraper/statcast_fetcher.py --force

# Re-export all data with enhanced context
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages python3 scripts/export_heartbeat_data.py
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages python3 scripts/export_json.py web/public/
```

### 2. Production Deployment Pipeline
```bash
# 1. Verify frontend builds successfully
cd web && npm run build

# 2. Commit all changes
git add .
git commit -m "feat: enhanced heartbeat tooltips with game context and pitcher names

- Add contextual fields to StatcastEvent model (inning, outs, score, count)
- Implement MLB API pitcher name resolution
- Fix WPA calculation to use objective team-based values  
- Enhance HeartbeatChart tooltips with rich game context
- Remove Drama Index tab (replaced by improved Heartbeat Charts)

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# 3. Push to production
git push origin main

# 4. Verify auto-deployment on Vercel
# Check https://baseball.willbaxter.info for updated tooltips
```

### 3. Post-Deployment Verification
- **Test enhanced tooltips** on recent games (2025 season)
- **Verify WPA values** show correct signs (home runs positive for home team, negative for away team)  
- **Confirm pitcher names** appear instead of player IDs on processed games
- **Check drama scores** reflect corrected WPA calculations

### 4. Future Game Addition Workflow (Updated)
```bash
# For new games, use enhanced statcast fetcher with pitcher name resolution
PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log python3 scraper/statcast_fetcher.py --game XXXXX --force

# Export with enhanced context 
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log PYTHONPATH=/Users/willbaxter/Hobbyist/baseball-game-log/venv/lib/python3.13/site-packages python3 scripts/export_heartbeat_data.py
```

## Special Notes

- Alembic migrations use psycopg2 driver but the API uses asyncpg - the alembic env.py handles this conversion automatically
- WPA calculations are **play-quality based** for drama analysis, not team-relative
- Video URLs are fetched from MLB's game feed API using clip UUIDs from Statcast data
- The web frontend consumes pre-exported JSON files rather than hitting the API directly for performance
- Production deployment uses Vercel with custom domain `baseball.willbaxter.info` configured in both Cloudflare DNS and Vercel project settings
- Heartbeat Charts use medical EKG aesthetics with SVG rendering for performance
- **CRITICAL**: GitHub Actions workflow overwrites local JSON files - always add games locally first, then commit changes