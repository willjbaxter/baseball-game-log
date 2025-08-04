// Types for MLB Playoff Odds Engine

export interface Team {
  id: string; // 'BOS', 'NYY', etc.
  name: string;
  fullName: string;
  division: 'ALE' | 'ALC' | 'ALW' | 'NLE' | 'NLC' | 'NLW';
  league: 'AL' | 'NL';
}

export interface TeamPerformance {
  teamId: string;
  date: string;
  rs30d: number; // Runs scored last 30 days
  ra30d: number; // Runs allowed last 30 days
  rs90d: number; // Runs scored last 90 days
  ra90d: number; // Runs allowed last 90 days
  pythagoreanWpct: number; // Pythagorean win percentage
  trueTalent: number; // Current team strength rating
}

export interface Pitcher {
  id: string;
  name: string;
  fip: number; // Fielding Independent Pitching
  war: number; // Wins Above Replacement
  era: number;
  ip: number; // Innings pitched
  fatigue: number; // Fatigue units (for relievers)
}

export interface Game {
  gamePk: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homePitcher?: Pitcher;
  awayPitcher?: Pitcher;
  homeWinProb?: number;
  completed: boolean;
  homeScore?: number;
  awayScore?: number;
}

export interface BullpenFatigue {
  teamId: string;
  date: string;
  fatigueUnits: number;
  eraAdjustment: number;
}

export interface InjuryRisk {
  playerId: string;
  playerName: string;
  teamId: string;
  date: string;
  injuryRisk: number; // Daily probability 0-1
  daysOnILPredicted: number;
  impactOnTeam: number; // WAR impact if injured
}

export interface PlayoffOdds {
  teamId: string;
  teamName: string;
  division: string;
  league: string;
  currentRecord: {
    wins: number;
    losses: number;
  };
  projectedRecord: {
    wins: number;
    losses: number;
    winsMedian: number;
    winsP5: number; // 5th percentile
    winsP95: number; // 95th percentile
  };
  playoffPct: number; // 0-1
  divisionPct: number; // 0-1
  wildcardPct: number; // 0-1
  wsPct: number; // World Series win probability 0-1
  trueTalent: number; // Current team strength
  strengthOfSchedule: number;
  lastUpdated: string;
}

export interface SimulationResult {
  date: string;
  teams: PlayoffOdds[];
  totalSimulations: number;
  simulationTime: number; // milliseconds
}

export interface GameOdds {
  gamePk: number;
  homeTeam: string;
  awayTeam: string;
  homeWinProb: number;
  factors: {
    pitchingAdvantage: number;
    homeFieldAdvantage: number;
    bullpenAdvantage: number;
    fatigue: number;
  };
}

export interface SeasonSchedule {
  remainingGames: Game[];
  completedGames: Game[];
  totalGames: number;
}

export interface Standings {
  [teamId: string]: {
    wins: number;
    losses: number;
    winPct: number;
    gamesBack: number;
    division: string;
    league: string;
  };
}

export interface PlayoffBracket {
  al: {
    division: { [division: string]: string }; // Division winners
    wildcard: string[]; // Wild card teams
  };
  nl: {
    division: { [division: string]: string };
    wildcard: string[];
  };
}

export interface HistoricalAccuracy {
  date: string;
  predictions: { [teamId: string]: number };
  actual: { [teamId: string]: boolean };
  brierScore: number;
  calibration: number;
}

export interface MLBStatsAPIResponse {
  copyright: string;
  teams?: any[];
  schedule?: any[];
  standings?: any[];
  stats?: any[];
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}