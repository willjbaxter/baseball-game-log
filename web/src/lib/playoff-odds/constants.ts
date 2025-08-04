// Constants for MLB Playoff Odds Engine

export const MLB_TEAMS = {
  // American League East
  'BOS': { name: 'Red Sox', fullName: 'Boston Red Sox', division: 'ALE', league: 'AL' },
  'NYY': { name: 'Yankees', fullName: 'New York Yankees', division: 'ALE', league: 'AL' },
  'TB': { name: 'Rays', fullName: 'Tampa Bay Rays', division: 'ALE', league: 'AL' },
  'TOR': { name: 'Blue Jays', fullName: 'Toronto Blue Jays', division: 'ALE', league: 'AL' },
  'BAL': { name: 'Orioles', fullName: 'Baltimore Orioles', division: 'ALE', league: 'AL' },
  
  // American League Central
  'CWS': { name: 'White Sox', fullName: 'Chicago White Sox', division: 'ALC', league: 'AL' },
  'CLE': { name: 'Guardians', fullName: 'Cleveland Guardians', division: 'ALC', league: 'AL' },
  'DET': { name: 'Tigers', fullName: 'Detroit Tigers', division: 'ALC', league: 'AL' },
  'KC': { name: 'Royals', fullName: 'Kansas City Royals', division: 'ALC', league: 'AL' },
  'MIN': { name: 'Twins', fullName: 'Minnesota Twins', division: 'ALC', league: 'AL' },
  
  // American League West
  'HOU': { name: 'Astros', fullName: 'Houston Astros', division: 'ALW', league: 'AL' },
  'LAA': { name: 'Angels', fullName: 'Los Angeles Angels', division: 'ALW', league: 'AL' },
  'OAK': { name: 'Athletics', fullName: 'Oakland Athletics', division: 'ALW', league: 'AL' },
  'SEA': { name: 'Mariners', fullName: 'Seattle Mariners', division: 'ALW', league: 'AL' },
  'TEX': { name: 'Rangers', fullName: 'Texas Rangers', division: 'ALW', league: 'AL' },
  
  // National League East
  'ATL': { name: 'Braves', fullName: 'Atlanta Braves', division: 'NLE', league: 'NL' },
  'MIA': { name: 'Marlins', fullName: 'Miami Marlins', division: 'NLE', league: 'NL' },
  'NYM': { name: 'Mets', fullName: 'New York Mets', division: 'NLE', league: 'NL' },
  'PHI': { name: 'Phillies', fullName: 'Philadelphia Phillies', division: 'NLE', league: 'NL' },
  'WSH': { name: 'Nationals', fullName: 'Washington Nationals', division: 'NLE', league: 'NL' },
  
  // National League Central
  'CHC': { name: 'Cubs', fullName: 'Chicago Cubs', division: 'NLC', league: 'NL' },
  'CIN': { name: 'Reds', fullName: 'Cincinnati Reds', division: 'NLC', league: 'NL' },
  'MIL': { name: 'Brewers', fullName: 'Milwaukee Brewers', division: 'NLC', league: 'NL' },
  'PIT': { name: 'Pirates', fullName: 'Pittsburgh Pirates', division: 'NLC', league: 'NL' },
  'STL': { name: 'Cardinals', fullName: 'St. Louis Cardinals', division: 'NLC', league: 'NL' },
  
  // National League West
  'ARI': { name: 'Diamondbacks', fullName: 'Arizona Diamondbacks', division: 'NLW', league: 'NL' },
  'COL': { name: 'Rockies', fullName: 'Colorado Rockies', division: 'NLW', league: 'NL' },
  'LAD': { name: 'Dodgers', fullName: 'Los Angeles Dodgers', division: 'NLW', league: 'NL' },
  'SD': { name: 'Padres', fullName: 'San Diego Padres', division: 'NLW', league: 'NL' },
  'SF': { name: 'Giants', fullName: 'San Francisco Giants', division: 'NLW', league: 'NL' },
} as const;

export const DIVISIONS = {
  'ALE': ['BOS', 'NYY', 'TB', 'TOR', 'BAL'],
  'ALC': ['CWS', 'CLE', 'DET', 'KC', 'MIN'],
  'ALW': ['HOU', 'LAA', 'OAK', 'SEA', 'TEX'],
  'NLE': ['ATL', 'MIA', 'NYM', 'PHI', 'WSH'],
  'NLC': ['CHC', 'CIN', 'MIL', 'PIT', 'STL'],
  'NLW': ['ARI', 'COL', 'LAD', 'SD', 'SF'],
} as const;

export const LEAGUES = {
  'AL': ['ALE', 'ALC', 'ALW'],
  'NL': ['NLE', 'NLC', 'NLW'],
} as const;

// Playoff structure (2025 format)
export const PLAYOFF_SPOTS = {
  DIVISION_WINNERS: 3, // Per league
  WILD_CARDS: 3, // Per league
  TOTAL_PER_LEAGUE: 6,
} as const;

// Model constants
export const MODEL_CONSTANTS = {
  // Pythagorean exponent for baseball
  PYTHAGOREAN_GAMMA: 1.83,
  
  // Home field advantage in win probability
  HOME_FIELD_ADVANTAGE: 0.054,
  
  // Recency weights for team strength
  TEAM_STRENGTH_WEIGHTS: {
    LAST_30: 0.5,
    LAST_90: 0.35,
    PROJECTION: 0.15,
  },
  
  // Simulation parameters
  DEFAULT_SIMULATIONS: 20000,
  MIN_SIMULATIONS: 1000,
  MAX_SIMULATIONS: 100000,
  
  // Cache TTL (milliseconds)
  CACHE_TTL: {
    ODDS: 6 * 60 * 60 * 1000, // 6 hours
    GAME_DATA: 30 * 60 * 1000, // 30 minutes
    STANDINGS: 2 * 60 * 60 * 1000, // 2 hours
  },
  
  // API rate limits
  MLB_API_RATE_LIMIT: 100, // requests per minute
  
  // Regression coefficients (fitted on historical data)
  GAME_ODDS_COEFFICIENTS: {
    INTERCEPT: 0.0,
    FIP_DIFF: 0.082,
    HOME_FIELD: 0.054,
    BULLPEN_DELTA: 0.031,
    FATIGUE: -0.015,
  },
} as const;

// MLB Stats API endpoints
export const MLB_API_ENDPOINTS = {
  BASE: 'https://statsapi.mlb.com/api/v1',
  SCHEDULE: '/schedule',
  STANDINGS: '/standings',
  TEAMS: '/teams',
  PEOPLE: '/people',
  STATS: '/stats',
} as const;

export const SEASON_LENGTH = 162;
export const CURRENT_SEASON = 2025;