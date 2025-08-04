"use client";
import { useState, useEffect } from "react";
import GamesTable from "@/components/GamesTable";
import BarrelMap from "@/components/BarrelMap";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatsCard from "@/components/StatsCard";
import WinLossSparkline from "@/components/WinLossSparkline";

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
  const [loading, setLoading] = useState(true);
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
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        if (isStatic) {
          // Static mode: fetch JSON files directly
          const [gamesRes, homersRes, barrelRes] = await Promise.all([
            fetch("/games.json"),
            fetch("/longest_homers.json"),
            fetch("/barrel_map.json")
          ]);
          
          const gamesData = await gamesRes.json();
          const homersData: JsonLongestHomer[] = await homersRes.json();
          const barrelData: JsonBattedBall[] = await barrelRes.json();
          
          // Filter data on client side for static build
          let filteredHomers = homersData;
          let filteredBarrel = barrelData;
          
          if (selectedYear !== "all") {
            filteredHomers = homersData.filter(h => h.date.startsWith(selectedYear));
            filteredBarrel = barrelData.filter(b => b.date.startsWith(selectedYear));
          }
          
          // Transform JSON data to match component interfaces
          const transformedHomers: LongestHomer[] = await Promise.all(filteredHomers.map(async h => {
            let pitcherName = h.pitcher_name;
            // If pitcher_name is numeric (an ID), try to resolve it
            if (pitcherName && /^\d+$/.test(pitcherName)) {
              try {
                const response = await fetch(`https://statsapi.mlb.com/api/v1/people/${pitcherName}`);
                if (response.ok) {
                  const data = await response.json();
                  pitcherName = data.people[0]?.fullName || pitcherName;
                }
              } catch (error) {
                console.warn(`Could not resolve pitcher ID ${pitcherName}:`, error);
              }
            }
            
            return {
              distance: h.distance,
              launch_speed: h.launch_speed,
              launch_angle: h.launch_angle,
              batter: h.batter_name,
              pitcher: pitcherName,
              date: h.date,
              game_pk: h.game_pk
            };
          }));
          
          const transformedBarrel: BattedBall[] = await Promise.all(filteredBarrel.map(async b => {
            let pitcherName = b.pitcher_name || "";
            // If pitcher_name is numeric (an ID), try to resolve it
            if (pitcherName && /^\d+$/.test(pitcherName)) {
              try {
                const response = await fetch(`https://statsapi.mlb.com/api/v1/people/${pitcherName}`);
                if (response.ok) {
                  const data = await response.json();
                  pitcherName = data.people[0]?.fullName || pitcherName;
                }
              } catch (error) {
                console.warn(`Could not resolve pitcher ID ${pitcherName}:`, error);
              }
            }
            
            return {
              exit_velocity: b.launch_speed,
              launch_angle: b.launch_angle,
              batter: b.batter_name,
              pitcher: pitcherName,
              outcome: b.outcome,
              is_barrel: (b.launch_angle >= 8 && b.launch_angle <= 50) && (b.launch_speed >= 98),
              date: b.date,
              matchup: `${b.away_team} @ ${b.home_team}`,
              description: b.description,
              distance: b.distance ?? null
            };
          }));
          
          setGames(gamesData || []);
          setLongestHomers(transformedHomers);
          setBarrelMapData(transformedBarrel);
        } else {
          // Development mode: use API
          const yearParam = selectedYear === "all" ? "" : `&year=${selectedYear}`;
          const barrelYearParam = selectedYear === "all" ? "" : `year=${selectedYear}`;
          const [gamesRes, homersRes, barrelRes] = await Promise.all([
            fetch(`${apiUrl}/games`),
            fetch(`${apiUrl}/statcast/longest-homers?limit=20${yearParam}`),
            fetch(`${apiUrl}/statcast/barrel-map${barrelYearParam ? `?${barrelYearParam}` : ""}`)
          ]);
          
          const gamesData = await gamesRes.json();
          const homersData = await homersRes.json();
          const barrelMapData = await barrelRes.json();

          setGames(gamesData.games || []);
          setLongestHomers(homersData.homers || []);
          setBarrelMapData(barrelMapData.batted_balls || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  const tabs = [
    { id: "games", label: "Games" },
    { id: "longest-homers", label: "Longest HRs" },
    { id: "barrel-map", label: "Barrel Map" }
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
          <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard 
              title="Lifetime Record" 
              value={`${wins}-${losses}`} 
              subtitle={`${winPct}% win rate`}
              icon="🏆"
              color="blue"
            />
            <StatsCard 
              title="Games Attended" 
              value={totalGames} 
              subtitle="Total games"
              icon="⚾"
              color="green"
            />
            <StatsCard 
              title="Current Streak" 
              value={`${currentStreak}${streakType}`} 
              subtitle={streakType === 'W' ? 'Wins' : 'Losses'}
              icon={streakType === 'W' ? '🔥' : '❄️'}
              color={streakType === 'W' ? 'orange' : 'blue'}
            />
            <StatsCard 
              title="Days Since Last Game" 
              value={daysSinceLastGame} 
              subtitle="Days ago"
              icon="📅"
              color="purple"
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <div className="bg-gray-800/50 rounded-lg border border-blue-500/30 p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Win Rate Trend</h3>
                <WinLossSparkline games={games} />
              </div>
            </div>
            <StatsCard 
              title="Average Runs/Game" 
              value={avgRuns} 
              subtitle="Total runs per game"
              icon="🏃"
              color="green"
            />
            <div className="space-y-2">
              <StatsCard 
                title="Highest Scoring Game" 
                value={bestGame ? `${bestGame.home_score! + bestGame.away_score!} runs` : 'N/A'} 
                subtitle={bestGame ? formatDate(bestGame.date) : ''}
                color="green"
              />
              <StatsCard 
                title="Lowest Scoring Game" 
                value={worstGame ? `${worstGame.home_score! + worstGame.away_score!} runs` : 'N/A'} 
                subtitle={worstGame ? formatDate(worstGame.date) : ''}
                color="red"
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


        </div>
      </div>
    </div>
  );
}
