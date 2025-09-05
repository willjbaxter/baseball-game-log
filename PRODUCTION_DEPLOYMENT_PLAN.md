# Production Deployment Plan - Enhanced Heartbeat Charts & Data Integrity

## Summary of Changes

This deployment includes major enhancements to the baseball game log application:

### ✅ **Data Integrity Improvements**
- **100% Statcast Coverage**: All 32 attended games now have complete Statcast data (9,798 events)
- **96.9% Pitcher Name Resolution**: Enhanced MLB API integration for player name lookup
- **Complete Contextual Data**: All events include inning, outs, score context, and situational data

### ✅ **Enhanced Heartbeat Charts**
- **Dynamic Dot Thresholds**: Adaptive significance thresholds based on game drama levels
- **Chronological X-Axis**: Fixed temporal positioning using inning/outs progression  
- **Rich Tooltips**: Comprehensive game context (pitcher vs batter, situation, score changes)
- **Corrected WPA Values**: Fixed team-based calculation methodology

### ✅ **UI/UX Improvements**
- **Consistent Score Format**: High-low display (5-4) across all components
- **Medical EKG Aesthetics**: Professional heartbeat visualization styling
- **Enhanced Performance**: Pre-computed JSON exports for fast loading

## Safe Deployment Strategy

### Phase 1: Pre-Deployment Verification ✅ **COMPLETED**

```bash
# Verify local build works
cd web && npm run build
# ✅ Build successful

# Verify data integrity
DATABASE_URL=... python3 -c "verify_data_coverage()"
# ✅ 32/32 games with complete data
# ✅ 9,798 Statcast events with enhanced context
# ✅ 96.9% pitcher name resolution
```

### Phase 2: Database Safety (Critical for Production DB)

**IMPORTANT**: Production database contains live data that CANNOT be lost.

#### Option A: Non-Destructive Migration (RECOMMENDED)
```bash
# 1. Backup production database BEFORE any changes
pg_dump $PROD_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run Alembic migrations (safe, additive only)
DATABASE_URL=$PROD_DATABASE_URL alembic upgrade head

# 3. Populate enhanced data WITHOUT --force flag (preserves existing data)
DATABASE_URL=$PROD_DATABASE_URL python3 scraper/statcast_fetcher.py

# 4. Export enhanced JSON files
DATABASE_URL=$PROD_DATABASE_URL python3 scripts/export_heartbeat_data.py
DATABASE_URL=$PROD_DATABASE_URL python3 scripts/export_json.py web/public/
```

#### Option B: Complete Refresh (ONLY if production DB backup confirmed)
```bash
# 1. MANDATORY backup first
pg_dump $PROD_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Drop and recreate schema (DESTRUCTIVE)
# 3. Re-run all attended games with --force
# 4. Export all data fresh
```

### Phase 3: Frontend Deployment

```bash
# 1. Test build locally
cd web
npm run build
npm start  # Test production build

# 2. Deploy via Vercel (automatic on git push)
git add .
git commit -m "feat: enhanced heartbeat charts with complete data coverage

Major enhancements:
- 100% Statcast data coverage (9,798 events across 32 games)  
- Dynamic dot thresholds based on drama levels
- Chronological x-axis with proper game time progression
- Enhanced tooltips with pitcher names and game context
- Corrected WPA calculations and consistent score formatting
- Complete situational data (inning, outs, score context)

Data integrity improvements:
- Fixed 2 games missing Statcast events entirely (ALCS 2021, CLE 2024)
- Enhanced 6 games with incomplete contextual data
- 96.9% pitcher name resolution via MLB API integration
- Bulletproof future game addition workflow

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
# ✅ Auto-deploys to baseball.willbaxter.info via Vercel GitHub integration
```

### Phase 4: Post-Deployment Verification

```bash
# 1. Verify application loads at baseball.willbaxter.info
# 2. Test heartbeat charts with enhanced tooltips
# 3. Verify score format shows high-low consistently  
# 4. Test dynamic dot thresholds across drama levels
# 5. Confirm chronological x-axis progression
```

## Future Game Addition Workflow

### ✅ **Enhanced Workflow for New Games**

```bash
# 1. Add game to local database (wait 24+ hours after game completion)
DATABASE_URL=... python3 -c "
game_pk = XXXXX  # MLB game PK
# Auto-fetch from MLB API and insert with full context
"

# 2. Fetch complete Statcast data with enhanced context
DATABASE_URL=... python3 scraper/statcast_fetcher.py --game XXXXX --force
# ✅ Now includes pitcher name resolution, inning/outs context

# 3. Export all data formats
DATABASE_URL=... python3 scripts/export_heartbeat_data.py
DATABASE_URL=... python3 scripts/export_json.py web/public/

# 4. Deploy
cd web && npm run build
git add . && git commit -m "Add game PK: XXXXX 🤖 Generated with [Claude Code](https://claude.ai/code)"
git push origin main
```

### ✅ **Data Completeness Guarantees**

The enhanced statcast fetcher now ensures:
- **Pitcher Name Resolution**: MLB API lookups for all player IDs
- **Complete Context**: Inning, outs, score progression, base runners
- **WPA Accuracy**: Corrected team-based calculations  
- **Situational Tooltips**: Rich game context for every significant moment

## Rollback Strategy

If deployment issues occur:

### Database Rollback
```bash
# Restore from backup (if database was modified)
psql $PROD_DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

### Frontend Rollback  
```bash
# Revert git commit
git revert HEAD
git push origin main
# ✅ Auto-deploys previous version via Vercel
```

## Risk Assessment

### 🟢 **Low Risk**
- Frontend changes (React components, styling)
- JSON data exports (cached, non-destructive)
- Vercel deployment (automatic rollback available)

### 🟡 **Medium Risk**  
- Database schema changes (use Alembic migrations)
- Statcast data refresh (use backups)

### 🔴 **High Risk**
- Complete database recreation (ONLY with confirmed backups)
- Production database modifications without backups

## Success Metrics

Post-deployment verification checklist:
- [ ] All 32 games display enhanced heartbeat charts
- [ ] Dynamic dot thresholds work across drama levels  
- [ ] Tooltips show pitcher names (>95% coverage expected)
- [ ] Scores display in high-low format everywhere
- [ ] X-axis shows chronological game progression
- [ ] No console errors or broken functionality
- [ ] Performance remains fast (<2s load time)

---

**CRITICAL**: Always backup production database before any modifications. This deployment includes significant data enhancements that cannot be easily reverted without backups.