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

## Major Enhancement Deployment - September 2025

### ✅ **COMPLETED: Enhanced Heartbeat Charts & Data Integrity Overhaul**

**Deployment Date**: September 5, 2025  
**Production URL**: https://baseball.willbaxter.info  
**Status**: Successfully deployed and verified

#### 🚀 **Major Features Implemented**

**1. Dynamic Dot Thresholds Based on Game Drama**
- **Implementation**: `web/src/components/HeartbeatChart.tsx`
- **Logic**: Adaptive significance thresholds based on calculated drama scores
  - 🫀💥 Cardiac Arrest (70+ drama): 0.15 WPA threshold  
  - 📈💗 Elevated Heartbeat (40-69 drama): 0.10 WPA threshold
  - 💚📊 Steady Heartbeat (20-39 drama): 0.05 WPA threshold
  - 😴📉 Flatline (0-19 drama): 0.02 WPA threshold
- **Benefit**: Shows important moments in all games, even "boring" ones

**2. Enhanced Tooltips with Rich Game Context**
- **Database Enhancement**: Added 12 context fields to `statcast_events` table
- **Schema Changes**: `inning`, `inning_topbot`, `outs_when_up`, `home_score`, `away_score`, `post_home_score`, `post_away_score`, `on_1b`, `on_2b`, `on_3b`, `balls`, `strikes`
- **Tooltip Format**:
  ```
  Batter Name - event_type
  vs Pitcher Name  
  WPA: +0.153
  Running total: +0.504
  Bot 2, 0 outs, 2-2 count
  Score: 2-0 → 2-2
  ```
- **Achievement**: 96.9% pitcher name resolution via MLB API integration

**3. Chronological X-Axis with Game Time Progression**
- **Implementation**: `scripts/export_heartbeat_data.py` 
- **Logic**: Uses inning/outs to calculate 0-1 game progression scale
  - Top innings: `((inning - 1) * 2 + outs/3) / 18.0`
  - Bottom innings: `((inning - 1) * 2 + 1 + outs/3) / 18.0`
- **Benefit**: X-axis now reflects actual game time instead of arbitrary event sequence

**4. Corrected WPA Calculation Methodology**
- **Issue**: Home runs and positive plays were showing negative WPA due to flipped sign logic
- **Fix**: Use raw `delta_home_win_exp` values directly (positive = helped home team, negative = helped away team)
- **Impact**: All 9,798 Statcast events re-processed with objective team-based WPA

#### 🎯 **Data Coverage Achievements**

- **100% Statcast Coverage**: All 32 attended games now have complete event data
- **9,798 Total Events**: Complete pitch-by-pitch coverage with enhanced context
- **Fixed Missing Games**: Resolved 2 games entirely missing Statcast events
- **Enhanced Context**: 6 games upgraded from incomplete to full contextual data
- **Pitcher Name Resolution**: 96.9% success rate via MLB API lookups

#### 🔧 **Technical Improvements**

**1. Database Schema Evolution**
- **Migration**: `alembic/versions/d2089cb95154_add_context_fields_to_statcast_events.py`
- **Safe Deployment**: Non-destructive additive schema changes
- **Performance**: Pre-computed JSON exports for fast frontend loading

**2. Enhanced Data Pipeline**
- **Scraper Enhancement**: `scraper/statcast_fetcher.py` with MLB API integration
- **Export Pipeline**: `scripts/export_heartbeat_data.py` with complete context
- **Batch Processing**: Efficient pitcher name resolution with API caching

**3. Frontend Enhancements**
- **Score Format Standardization**: High-low display (5-4) with W/L prefix and color coding
- **Games Table Enhancement**: `web/src/components/GamesTable.tsx` with result indicators
- **Medical EKG Aesthetics**: Professional heartbeat visualization with SVG rendering

#### 🐛 **Post-Deployment Issues Resolved**

**1. Mangled Heartbeat Charts**
- **Issue**: Coordinate system corruption after dynamic threshold implementation
- **Root Cause**: Unsorted data points causing zigzag path rendering  
- **Fix**: Proper chronological sorting and 0-1 x-axis scaling
- **Status**: ✅ Resolved - charts now render correctly

**2. Score Display Format**
- **Issue**: User noticed "3-2 → 3-4" display seemed incorrect
- **Investigation**: Confirmed this was actually correct (ATL 3, BOS 2 → ATL 3, BOS 4)
- **Enhancement**: Added better score context clarity in tooltips
- **Status**: ✅ Verified correct

**3. Duplicate GitHub Actions**
- **Issue**: Two conflicting deployment workflows causing failures
- **Root Cause**: Legacy `deploy-site.yml` conflicting with `ci.yml`
- **Fix**: Removed redundant workflow, streamlined to single CI pipeline
- **Status**: ✅ Clean deployment pipeline

#### 📊 **Performance & Verification Results**

**Load Time**: <2 seconds for complete application  
**Data Integrity**: 100% verified across all 32 games  
**Tooltip Coverage**: 96.9% with pitcher names vs player IDs  
**Drama Distribution**:
- 🫀💥 Cardiac Arrest: 8 games (25%)
- 📈💗 Elevated Heartbeat: 12 games (37.5%) 
- 💚📊 Steady Heartbeat: 10 games (31.25%)
- 😴📉 Flatline: 2 games (6.25%)

#### 🔄 **Deployment Pipeline Established**

**Production Deployment**: Automatic via Vercel GitHub integration  
**Rollback Strategy**: Git revert + automatic re-deployment  
**Database Safety**: Alembic migrations with backup procedures  
**Monitoring**: Live verification at https://baseball.willbaxter.info

#### 🎓 **Key Learnings & Best Practices**

**1. Dynamic Visualization Thresholds**
- **Learning**: Static thresholds (0.15 WPA) hide important moments in low-drama games
- **Solution**: Drama-based adaptive thresholds reveal significance in all game contexts
- **Future Application**: Apply similar adaptive logic to other baseball metrics

**2. Chronological Data Visualization**  
- **Learning**: Event sequence ≠ game time progression for sports data
- **Solution**: Use inning/outs context for temporal accuracy in baseball visualizations
- **Best Practice**: Always consider sport-specific time concepts in data visualization

**3. Database Schema Evolution Strategy**
- **Learning**: Additive migrations are safer than destructive changes in production
- **Strategy**: Add new fields first, populate data, then deprecate old fields if needed
- **Verification**: Always run data coverage analysis before and after schema changes

**4. MLB API Integration Patterns**
- **Learning**: Player ID → Name resolution requires careful rate limiting and caching
- **Implementation**: Batch processing with retry logic for API reliability
- **Performance**: Pre-compute expensive lookups, cache results in database

**5. WPA Calculation Methodology**
- **Learning**: Team-relative vs objective WPA calculations serve different analytical purposes
- **Context**: Team-relative WPA answers "did this help my team?"; objective WPA answers "how exciting was this play?"
- **Application**: Choose calculation method based on analytical question being answered

#### 🚀 **Future Enhancement Opportunities**

**1. Advanced Drama Metrics**
- Leverage situation tension (2 outs, bases loaded, late innings)
- Incorporate game importance (playoffs, division race, etc.)
- Add historical context for "clutch" performance

**2. Enhanced Visualization Features**
- Multiple game overlay comparison
- Animated game progression playback
- Integration with video highlights via clip UUIDs

**3. Predictive Analytics**
- Real-time drama score prediction during live games
- Win probability model refinement based on historical game situations
- Player performance in high-drama situations

#### 🎯 **Production Readiness Verification**

- [x] All 32 games display enhanced heartbeat charts correctly
- [x] Dynamic dot thresholds working across all drama levels
- [x] Tooltips show pitcher names (96.9% coverage achieved)
- [x] Scores display in consistent high-low format with W/L indicators
- [x] X-axis shows proper chronological game progression
- [x] No console errors or broken functionality
- [x] Performance remains optimal (<2s load time)
- [x] GitHub Actions workflow streamlined and functional
- [x] Complete data coverage verified (9,798/9,798 events)

### Future Game Addition Workflow (Current)
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