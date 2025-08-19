"use client";
import { useState, useEffect } from "react";
import GamesTable from "@/components/GamesTable";
import BarrelMap from "@/components/BarrelMap";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatsCard from "@/components/StatsCard";
import WinLossSparkline from "@/components/WinLossSparkline";
import HeartbeatChart from "@/components/HeartbeatChart";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
};

interface Game {
  id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  venue: string | null;
  source: string;
}

interface LongestHomer {
  distance: number;
  launch_speed: number;
  launch_angle: number;
  batter: string;
  pitcher: string;
  date: string;
  game_pk: number;
}

interface JsonLongestHomer {
  distance: number;
  launch_speed: number;
  launch_angle: number;
  batter_name: string;
  pitcher_name: string;
  date: string;
  game_pk: number;
  home_team: string;
  away_team: string;
}

interface JsonBattedBall {
  launch_speed: number;
  launch_angle: number;
  batter_name: string;
  pitcher_name?: string;
  outcome: string;
  date: string;
  away_team: string;
  home_team: string;
  description: string;
  distance?: number;
}

interface WpaEvent {
  wpa: number;
  batter_name: string;
  pitcher_name: string;
  event_type: string;
  raw_description: string;
  mlb_game_pk: number;
  clip_uuid?: string;
  video_url?: string;
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
}

interface HeartbeatPoint {
  x: number;
  y: number;
  wpa: number;
  batter: string;
  event: string;
  description: string;
}

interface HeartbeatGame {
  game_pk: number;
  date: string;
  matchup: string;
  score: string;
  result: 'W' | 'L';
  drama_score: number;
  drama_category: {
    level: string;
    emoji: string;
    color: string;
    label: string;
  };
  total_events: number;
  heartbeat_points: HeartbeatPoint[];
}


interface BattedBall {
  exit_velocity: number;
  launch_angle: number;
  batter: string;
  pitcher: string;
  outcome: string;
  is_barrel: boolean;
  date: string;
  matchup: string;
  description: string;
  distance: number | null;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("games");
  const [games, setGames] = useState<Game[]>([]);
  const [longestHomers, setLongestHomers] = useState<LongestHomer[]>([]);
  const [barrelMapData, setBarrelMapData] = useState<BattedBall[]>([]);
  const [wpaEvents, setWpaEvents] = useState<WpaEvent[]>([]);
  const [heartbeatGames, setHeartbeatGames] = useState<HeartbeatGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [pitcherNamesResolved, setPitcherNamesResolved] = useState(false);
  const [homersSortField, setHomersSortField] = useState<'distance' | 'launch_speed' | 'launch_angle' | 'date'>('distance');
  const [homersSortDirection, setHomersSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedYear, setSelectedYear] = useState<string>("all");


  const handleHomersSort = (field: 'distance' | 'launch_speed' | 'launch_angle' | 'date') => {
    if (homersSortField === field) {
      setHomersSortDirection(homersSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setHomersSortField(field);
      setHomersSortDirection('desc');
    }
  };

  const getHomersSortIcon = (field: 'distance' | 'launch_speed' | 'launch_angle' | 'date') => {
    if (homersSortField !== field) return '⇅';
    return homersSortDirection === 'asc' ? '⇈' : '⇊';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isStatic = process.env.NODE_ENV === 'production';
        
        if (isStatic) {
          // Static mode: fetch JSON files directly
          const [gamesRes, homersRes, barrelRes, wpaRes, heartbeatRes] = await Promise.all([
            fetch("/games.json"),
            fetch("/longest_homers.json"),
            fetch("/barrel_map.json"),
            fetch("/drama_index.json"),
            fetch("/heartbeat_data.json")
          ]);
          
          const gamesData = await gamesRes.json();
          const homersData: JsonLongestHomer[] = await homersRes.json();
          const barrelData: JsonBattedBall[] = await barrelRes.json();
          const wpaData: WpaEvent[] = await wpaRes.json();
          const heartbeatData: HeartbeatGame[] = await heartbeatRes.json();
          
          // Filter data on client side for static build
          let filteredHomers = homersData;
          let filteredBarrel = barrelData;
          let filteredWpa = wpaData;
          let filteredHeartbeat = heartbeatData;
          
          if (selectedYear !== "all") {
            filteredHomers = homersData.filter(h => h.date.startsWith(selectedYear));
            filteredBarrel = barrelData.filter(b => b.date.startsWith(selectedYear));
            filteredWpa = wpaData.filter(w => w.date.startsWith(selectedYear));
            filteredHeartbeat = heartbeatData.filter(h => h.date.startsWith(selectedYear));
          }
          
          // Transform JSON data to match component interfaces (without pitcher name resolution)
          const transformedHomers: LongestHomer[] = filteredHomers.map(h => ({
            distance: h.distance,
            launch_speed: h.launch_speed,
            launch_angle: h.launch_angle,
            batter: h.batter_name,
            pitcher: h.pitcher_name,
            date: h.date,
            game_pk: h.game_pk
          }));
          
          const transformedBarrel: BattedBall[] = filteredBarrel.map(b => ({
            exit_velocity: b.launch_speed,
            launch_angle: b.launch_angle,
            batter: b.batter_name,
            pitcher: b.pitcher_name || "",
            outcome: b.outcome,
            is_barrel: (b.launch_angle >= 8 && b.launch_angle <= 50) && (b.launch_speed >= 98),
            date: b.date,
            matchup: `${b.away_team} @ ${b.home_team}`,
            description: b.description,
            distance: b.distance ?? null
          }));
          
          setGames(gamesData || []);
          setLongestHomers(transformedHomers);
          setBarrelMapData(transformedBarrel);
          setWpaEvents(filteredWpa);
          setHeartbeatGames(filteredHeartbeat);
        } else {
          // Development mode: fetch JSON files directly for now
          const [gamesRes, homersRes, barrelRes, wpaRes, heartbeatRes] = await Promise.all([
            fetch("/games.json"),
            fetch("/longest_homers.json"),
            fetch("/barrel_map.json"),
            fetch("/drama_index.json"),
            fetch("/heartbeat_data.json")
          ]);
          
          const gamesData = await gamesRes.json();
          const homersData: JsonLongestHomer[] = await homersRes.json();
          const barrelData: JsonBattedBall[] = await barrelRes.json();
          const wpaData: WpaEvent[] = await wpaRes.json();
          const heartbeatData: HeartbeatGame[] = await heartbeatRes.json();
          
          // Filter data on client side
          let filteredHomers = homersData;
          let filteredBarrel = barrelData;
          let filteredWpa = wpaData;
          let filteredHeartbeat = heartbeatData;
          
          if (selectedYear !== "all") {
            filteredHomers = homersData.filter(h => h.date.startsWith(selectedYear));
            filteredBarrel = barrelData.filter(b => b.date.startsWith(selectedYear));
            filteredWpa = wpaData.filter(w => w.date.startsWith(selectedYear));
            filteredHeartbeat = heartbeatData.filter(h => h.date.startsWith(selectedYear));
          }
          
          // Transform JSON data to match component interfaces
          const transformedHomers: LongestHomer[] = filteredHomers.map(h => ({
            distance: h.distance,
            launch_speed: h.launch_speed,
            launch_angle: h.launch_angle,
            batter: h.batter_name,
            pitcher: h.pitcher_name,
            date: h.date,
            game_pk: h.game_pk
          }));
          
          const transformedBarrel: BattedBall[] = filteredBarrel.map(b => ({
            exit_velocity: b.launch_speed,
            launch_angle: b.launch_angle,
            batter: b.batter_name,
            pitcher: b.pitcher_name || "",
            outcome: b.outcome,
            is_barrel: (b.launch_angle >= 8 && b.launch_angle <= 50) && (b.launch_speed >= 98),
            date: b.date,
            matchup: `${b.away_team} @ ${b.home_team}`,
            description: b.description,
            distance: b.distance ?? null
          }));

          setGames(gamesData || []);
          setLongestHomers(transformedHomers);
          setBarrelMapData(transformedBarrel);
          setWpaEvents(filteredWpa);
          setHeartbeatGames(filteredHeartbeat);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  // Separate effect to resolve pitcher names after data is loaded
  useEffect(() => {
    const resolvePitcherNames = async () => {
      if (pitcherNamesResolved || longestHomers.length === 0) return;
      
      console.log('Resolving pitcher names...');
      
      // Resolve pitcher names for longest homers
      const resolvedHomers = await Promise.all(
        longestHomers.map(async (homer) => {
          let pitcherName = homer.pitcher;
          if (pitcherName && /^\d+$/.test(pitcherName)) {
            try {
              console.log(`Resolving pitcher ID: ${pitcherName}`);
              const response = await fetch(`https://statsapi.mlb.com/api/v1/people/${pitcherName}`);
              if (response.ok) {
                const data = await response.json();
                const resolvedName = data.people[0]?.fullName || pitcherName;
                console.log(`Resolved ${pitcherName} to ${resolvedName}`);
                pitcherName = resolvedName;
              }
            } catch (error) {
              console.warn(`Could not resolve pitcher ID ${pitcherName}:`, error);
            }
          }
          return { ...homer, pitcher: pitcherName };
        })
      );
      
      // Resolve pitcher names for barrel map data
      const resolvedBarrel = await Promise.all(
        barrelMapData.map(async (ball) => {
          let pitcherName = ball.pitcher;
          if (pitcherName && /^\d+$/.test(pitcherName)) {
            try {
              const response = await fetch(`https://statsapi.mlb.com/api/v1/people/${pitcherName}`);
              if (response.ok) {
                const data = await response.json();
                const resolvedName = data.people[0]?.fullName || pitcherName;
                pitcherName = resolvedName;
              }
            } catch (error) {
              console.warn(`Could not resolve pitcher ID ${pitcherName}:`, error);
            }
          }
          return { ...ball, pitcher: pitcherName };
        })
      );
      
      setLongestHomers(resolvedHomers);
      setBarrelMapData(resolvedBarrel);
      setPitcherNamesResolved(true);
      console.log('Pitcher names resolved!');
    };

    resolvePitcherNames();
  }, [longestHomers, barrelMapData, pitcherNamesResolved]);

  const tabs = [
    { id: "games", label: "Games" },
    { id: "longest-homers", label: "Longest HRs" },
    { id: "barrel-map", label: "Barrel Map" },
    { id: "drama-index", label: "Drama Index" },
    { id: "heartbeat", label: "Heartbeat 🫀" }
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  // Calculate dashboard stats
  const totalGames = games.length;
  const wins = games.filter(g => g.home_score !== null && g.away_score !== null && g.home_score > g.away_score).length;
  const losses = games.filter(g => g.home_score !== null && g.away_score !== null && g.home_score < g.away_score).length;
  const winPct = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
  
  // Calculate average runs per game
  const totalRuns = games.reduce((sum, g) => {
    if (g.home_score !== null && g.away_score !== null) {
      return sum + g.home_score + g.away_score;
    }
    return sum;
  }, 0);
  const avgRuns = totalGames > 0 ? (totalRuns / totalGames).toFixed(1) : '0.0';
  
  // Find best/worst games by run differential
  const gamesWithScores = games.filter(g => g.home_score !== null && g.away_score !== null);
  const bestGame = gamesWithScores.length > 0 ? 
    gamesWithScores.reduce((max, g) => {
      const diff = (g.home_score! + g.away_score!) - (max.home_score! + max.away_score!);
      return diff > 0 ? g : max;
    }) : null;
  const worstGame = gamesWithScores.length > 0 ? 
    gamesWithScores.reduce((min, g) => {
      const diff = (g.home_score! + g.away_score!) - (min.home_score! + min.away_score!);
      return diff < 0 ? g : min;
    }) : null;
  
  // Calculate current streak
  const sortedGames = [...games].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let currentStreak = 0;
  let streakType = 'W';
  
  for (const game of sortedGames) {
    if (game.home_score === null || game.away_score === null) continue;
    const won = game.home_score > game.away_score;
    
    if (currentStreak === 0) {
      currentStreak = 1;
      streakType = won ? 'W' : 'L';
    } else if ((won && streakType === 'W') || (!won && streakType === 'L')) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  // Days since last game
  const lastGame = sortedGames[0];
  const daysSinceLastGame = lastGame ? 
    Math.floor((new Date().getTime() - new Date(lastGame.date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4 md:p-6">
        <h1 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8 text-center">
          Baxter Sox History
        </h1>
        
        {/* Dashboard Stats */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard 
              title="Record" 
              value={`${wins}-${losses}`} 
              subtitle={`${winPct}% win rate`}
            />
            <StatsCard 
              title="Games Attended" 
              value={totalGames} 
              subtitle="Total games"
            />
            <StatsCard 
              title="Current Streak" 
              value={`${currentStreak}${streakType}`} 
              subtitle={streakType === 'W' ? 'Wins' : 'Losses'}
            />
            <StatsCard 
              title="Days Since Last Game" 
              value={daysSinceLastGame} 
              subtitle="Days ago"
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <div className="border border-gray-700 rounded p-4 bg-gray-800/20">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Win Rate Trend</h3>
                <WinLossSparkline games={games} />
              </div>
            </div>
            <StatsCard 
              title="Average Runs/Game" 
              value={avgRuns} 
              subtitle="Total runs per game"
            />
            <div className="space-y-2">
              <StatsCard 
                title="Highest Scoring Game" 
                value={bestGame ? `${bestGame.home_score! + bestGame.away_score!} runs` : 'N/A'} 
                subtitle={bestGame ? formatDate(bestGame.date) : ''}
              />
              <StatsCard 
                title="Lowest Scoring Game" 
                value={worstGame ? `${worstGame.home_score! + worstGame.away_score!} runs` : 'N/A'} 
                subtitle={worstGame ? formatDate(worstGame.date) : ''}
              />
            </div>
          </div>
        </div>
        
        <div className="flex overflow-x-auto gap-1 md:gap-2 mb-6 md:mb-8 border-b border-gray-700 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 md:px-6 py-2 md:py-3 font-medium transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === tab.id
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === "games" && (
            <div>
              <h2 className="text-xl md:text-2xl font-semibold mb-4">
                Attended Games ({games.length})
              </h2>
              <div className="overflow-x-auto">
                <GamesTable games={games.map(g => ({
                  game_pk: g.id,
                  date: g.date,
                  home_team: g.home_team,
                  away_team: g.away_team,
                  home_score: g.home_score,
                  away_score: g.away_score,
                  venue_name: g.venue
                }))} />
              </div>
            </div>
          )}

          {activeTab === "longest-homers" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                <h2 className="text-xl md:text-2xl font-semibold">
                  Longest Home Runs
                </h2>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded w-full sm:w-auto"
                >
                  <option value="all">All Years</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2021">2021</option>
                  <option value="2019">2019</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-700 min-w-[600px]">
                  <thead className="bg-gray-800">
                    <tr>
                      <th 
                        className="p-2 md:p-3 text-left cursor-pointer hover:bg-gray-700 select-none text-sm md:text-base"
                        onClick={() => handleHomersSort('distance')}
                      >
                        Distance {getHomersSortIcon('distance')}
                      </th>
                      <th 
                        className="p-2 md:p-3 text-left cursor-pointer hover:bg-gray-700 select-none text-sm md:text-base"
                        onClick={() => handleHomersSort('launch_speed')}
                      >
                        <span className="hidden sm:inline">Exit Velocity</span>
                        <span className="sm:hidden">Exit Vel</span>
                        {getHomersSortIcon('launch_speed')}
                      </th>
                      <th 
                        className="p-2 md:p-3 text-left cursor-pointer hover:bg-gray-700 select-none text-sm md:text-base"
                        onClick={() => handleHomersSort('launch_angle')}
                      >
                        <span className="hidden sm:inline">Launch Angle</span>
                        <span className="sm:hidden">Angle</span>
                        {getHomersSortIcon('launch_angle')}
                      </th>
                      <th className="p-2 md:p-3 text-left text-sm md:text-base">Batter</th>
                      <th className="p-2 md:p-3 text-left text-sm md:text-base hidden sm:table-cell">Pitcher</th>
                      <th 
                        className="p-2 md:p-3 text-left cursor-pointer hover:bg-gray-700 select-none text-sm md:text-base"
                        onClick={() => handleHomersSort('date')}
                      >
                        Date {getHomersSortIcon('date')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...longestHomers]
                      .sort((a, b) => {
                        let comparison = 0;
                        switch (homersSortField) {
                          case 'distance':
                            comparison = a.distance - b.distance;
                            break;
                          case 'launch_speed':
                            comparison = a.launch_speed - b.launch_speed;
                            break;
                          case 'launch_angle':
                            comparison = a.launch_angle - b.launch_angle;
                            break;
                          case 'date':
                            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                            break;
                        }
                        return homersSortDirection === 'asc' ? comparison : -comparison;
                      })
                      .map((homer, idx) => (
                        <tr
                          key={idx}
                          className={idx % 2 === 0 ? "bg-gray-800/20" : "bg-gray-800/10"}
                        >
                          <td className="p-2 md:p-3 font-bold text-blue-400 text-sm md:text-base">
                            {homer.distance} ft
                          </td>
                          <td className="p-2 md:p-3 font-bold text-orange-400 text-sm md:text-base">
                            {homer.launch_speed} mph
                          </td>
                          <td className="p-2 md:p-3 text-sm md:text-base">{homer.launch_angle}°</td>
                          <td className="p-2 md:p-3 text-sm md:text-base">{homer.batter}</td>
                          <td className="p-2 md:p-3 text-sm md:text-base hidden sm:table-cell">{homer.pitcher}</td>
                          <td className="p-2 md:p-3 text-sm md:text-base">{formatDate(homer.date)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "barrel-map" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                <h2 className="text-xl md:text-2xl font-semibold">
                  Exit Velocity × Launch Angle Map
                </h2>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded w-full sm:w-auto"
                >
                  <option value="all">All Years</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2021">2021</option>
                  <option value="2019">2019</option>
                </select>
              </div>
              <BarrelMap data={barrelMapData} />
            </div>
          )}

          {activeTab === "drama-index" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                <h2 className="text-xl md:text-2xl font-semibold">
                  Drama Index - Top WPA Moments
                </h2>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded w-full sm:w-auto"
                >
                  <option value="all">All Years</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2021">2021</option>
                  <option value="2019">2019</option>
                </select>
              </div>
              
              <div className="space-y-4">
                {wpaEvents.map((event, idx) => {
                  const wpaColor = event.wpa > 0 ? 'text-green-400' : 'text-red-400';
                  const wpaIcon = event.wpa > 0 ? '📈' : '📉';
                  const gameResult = event.home_score > event.away_score ? 'W' : 'L';
                  const gameResultColor = gameResult === 'W' ? 'text-green-400' : 'text-red-400';
                  
                  return (
                    <div
                      key={idx}
                      className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 md:p-6 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{wpaIcon}</span>
                            <span className={`text-xl md:text-2xl font-bold ${wpaColor}`}>
                              WPA: {event.wpa > 0 ? '+' : ''}{event.wpa.toFixed(3)}
                            </span>
                            <span className="text-sm text-gray-400">#{idx + 1}</span>
                          </div>
                          
                          <div className="mb-3">
                            <div className="text-lg md:text-xl font-semibold text-white mb-1">
                              {event.batter_name} vs {event.pitcher_name}
                            </div>
                            <div className="text-sm md:text-base text-blue-400 capitalize">
                              {event.event_type.replace('_', ' ')}
                            </div>
                          </div>
                          
                          {event.raw_description && (
                            <div className="text-sm md:text-base text-gray-300 mb-3 italic">
                              &ldquo;{event.raw_description.length > 100 
                                ? event.raw_description.substring(0, 100) + '...' 
                                : event.raw_description}&rdquo;
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col md:items-end text-sm md:text-base">
                          <div className="text-gray-300 mb-1">
                            {event.away_team} @ {event.home_team}
                          </div>
                          <div className="text-gray-300 mb-2">
                            {formatDate(event.date)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">
                              {event.away_score}-{event.home_score}
                            </span>
                            <span className={`font-bold ${gameResultColor}`}>
                              {gameResult}
                            </span>
                          </div>
                          
                          {event.video_url && (
                            <a
                              href={event.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
                            >
                              📹 Watch Video
                            </a>
                          )}
                          
                          {!event.video_url && event.clip_uuid && (
                            <div className="mt-2 text-xs text-gray-500">
                              Video available via MLB
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {wpaEvents.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    No WPA data available for the selected year.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "heartbeat" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                <h2 className="text-xl md:text-2xl font-semibold">
                  🫀 Heartbeat Charts - Game Drama Visualization
                </h2>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded w-full sm:w-auto"
                >
                  <option value="all">All Years</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2021">2021</option>
                  <option value="2019">2019</option>
                </select>
              </div>
              
              <div className="mb-6 p-4 bg-gray-800/40 border border-gray-700 rounded-lg">
                <p className="text-gray-300 text-sm md:text-base">
                  Each game is visualized as an EKG-style heartbeat where WPA swings create peaks and valleys. 
                  <span className="text-green-400 font-semibold"> Peaks</span> represent exciting moments (home runs, clutch hits), 
                  <span className="text-red-400 font-semibold"> valleys</span> represent disappointing moments (errors, strikeouts).
                  Find your &ldquo;cardiac arrest games&rdquo; vs &ldquo;snoozers&rdquo;!
                </p>
              </div>

              <HeartbeatChart games={heartbeatGames} />
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
