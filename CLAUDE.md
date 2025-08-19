# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Baseball Game Log is a multi-component system for tracking attended baseball games, scraping Statcast data, and generating a web frontend. The project consists of:

1. **Database Layer**: PostgreSQL with Alembic migrations managing game attendance, Statcast events, and scorecard pages
2. **Data Pipeline**: Python scrapers that enrich game data via MLB Stats API and fetch Statcast events via pybaseball
3. **API Layer**: FastAPI backend serving game data
4. **Web Frontend**: Next.js application with data visualizations deployed to Vercel at `baseball.willbaxter.info`

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

# Data pipeline operations
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log python3 scraper/enrich_games.py
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/game_log python3 scraper/statcast_fetcher.py --game 660915 --force
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
# Export all visualization data
python3 scripts/export_json.py              # General game/stats data
python3 scripts/export_wpa_drama.py         # Top WPA moments
python3 scripts/export_heartbeat_data.py    # Game heartbeat timelines
```

## Special Notes

- Alembic migrations use psycopg2 driver but the API uses asyncpg - the alembic env.py handles this conversion automatically
- WPA calculations are **play-quality based** for drama analysis, not team-relative
- Video URLs are fetched from MLB's game feed API using clip UUIDs from Statcast data
- The web frontend consumes pre-exported JSON files rather than hitting the API directly for performance
- Production deployment uses Vercel with custom domain `baseball.willbaxter.info` configured in both Cloudflare DNS and Vercel project settings
- Heartbeat Charts use medical EKG aesthetics with SVG rendering for performance