"use client";
import { useState, useEffect } from "react";
import GamesTable from "@/components/GamesTable";
import BarrelMap from "@/components/BarrelMap";

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
  pitcher?: string;
  outcome: string;
  date: string;
  away_team: string;
  home_team: string;
  description: string;
  distance?: number;
}

interface WpaLeader {
  player: string;
  wpa: number;
}

interface PlayerWpaBreakdown {
  player: string;
  games: {
    date: string;
    matchup: string;
    total_wpa: number;
    events: {
      wpa: number;
      description: string;
      event_datetime: string;
    }[];
  }[];
  total_wpa: number;
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
  const [wpaLeaders, setWpaLeaders] = useState<WpaLeader[]>([]);
  const [barrelMapData, setBarrelMapData] = useState<BattedBall[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerBreakdown, setPlayerBreakdown] = useState<PlayerWpaBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [homersSortField, setHomersSortField] = useState<'distance' | 'launch_speed' | 'launch_angle' | 'date'>('distance');
  const [homersSortDirection, setHomersSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const handlePlayerClick = async (playerName: string) => {
    setSelectedPlayer(playerName);
    try {
      const isStatic = process.env.NODE_ENV === 'production';
      if (isStatic) {
        // In static mode, we don't have individual player breakdowns
        // Could pre-generate these or disable the feature
        setPlayerBreakdown(null);
        return;
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/statcast/wpa/player/${encodeURIComponent(playerName)}`);
      const data = await response.json();
      setPlayerBreakdown(data);
    } catch (error) {
      console.error("Error fetching player breakdown:", error);
      setPlayerBreakdown(null);
    }
  };

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
          const [gamesRes, homersRes, wpaRes, barrelRes] = await Promise.all([
            fetch("/games.json"),
            fetch("/longest_homers.json"),
            fetch("/wpa_leaders.json"),
            fetch("/barrel_map.json")
          ]);
          
          const gamesData = await gamesRes.json();
          const homersData: JsonLongestHomer[] = await homersRes.json();
          const wpaData = await wpaRes.json();
          const barrelData: JsonBattedBall[] = await barrelRes.json();
          
          // Filter data on client side for static build
          let filteredHomers = homersData;
          let filteredBarrel = barrelData;
          
          if (selectedYear !== "all") {
            filteredHomers = homersData.filter(h => h.date.startsWith(selectedYear));
            filteredBarrel = barrelData.filter(b => b.date.startsWith(selectedYear));
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
            pitcher: b.pitcher || "",
            outcome: b.outcome,
            is_barrel: (8 <= b.launch_angle <= 50) && (b.launch_speed >= 98),
            date: b.date,
            matchup: `${b.away_team} @ ${b.home_team}`,
            description: b.description,
            distance: b.distance
          }));
          
          setGames(gamesData || []);
          setLongestHomers(transformedHomers);
          setWpaLeaders(wpaData || []);
          setBarrelMapData(transformedBarrel);
        } else {
          // Development mode: use API
          const yearParam = selectedYear === "all" ? "" : `&year=${selectedYear}`;
          const barrelYearParam = selectedYear === "all" ? "" : `year=${selectedYear}`;
          const [gamesRes, homersRes, wpaRes, barrelRes] = await Promise.all([
            fetch(`${apiUrl}/games`),
            fetch(`${apiUrl}/statcast/longest-homers?limit=20${yearParam}`),
            fetch(`${apiUrl}/statcast/wpa/leaders?limit=15`),
            fetch(`${apiUrl}/statcast/barrel-map${barrelYearParam ? `?${barrelYearParam}` : ""}`)
          ]);
          
          const gamesData = await gamesRes.json();
          const homersData = await homersRes.json();
          const wpaData = await wpaRes.json();
          const barrelMapData = await barrelRes.json();

          setGames(gamesData.games || []);
          setLongestHomers(homersData.homers || []);
          setWpaLeaders(wpaData.leaders || []);
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
    { id: "barrel-map", label: "Barrel Map" },
    { id: "wpa-leaders", label: "WPA Leaders" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading your baseball data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Personal Baseball Game Log
        </h1>
        
        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-colors ${
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
              <h2 className="text-2xl font-semibold mb-4">
                Attended Games ({games.length})
              </h2>
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
          )}

          {activeTab === "longest-homers" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">
                  Longest Home Runs
                </h2>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded"
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
                <table className="w-full border border-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th 
                        className="p-3 text-left cursor-pointer hover:bg-gray-700 select-none"
                        onClick={() => handleHomersSort('distance')}
                      >
                        Distance {getHomersSortIcon('distance')}
                      </th>
                      <th 
                        className="p-3 text-left cursor-pointer hover:bg-gray-700 select-none"
                        onClick={() => handleHomersSort('launch_speed')}
                      >
                        Exit Velocity {getHomersSortIcon('launch_speed')}
                      </th>
                      <th 
                        className="p-3 text-left cursor-pointer hover:bg-gray-700 select-none"
                        onClick={() => handleHomersSort('launch_angle')}
                      >
                        Launch Angle {getHomersSortIcon('launch_angle')}
                      </th>
                      <th className="p-3 text-left">Batter</th>
                      <th className="p-3 text-left">Pitcher</th>
                      <th 
                        className="p-3 text-left cursor-pointer hover:bg-gray-700 select-none"
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
                          <td className="p-3 font-bold text-blue-400">
                            {homer.distance} ft
                          </td>
                          <td className="p-3 font-bold text-orange-400">
                            {homer.launch_speed} mph
                          </td>
                          <td className="p-3">{homer.launch_angle}°</td>
                          <td className="p-3">{homer.batter}</td>
                          <td className="p-3">{homer.pitcher}</td>
                          <td className="p-3">{formatDate(homer.date)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "barrel-map" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">
                  Exit Velocity × Launch Angle Map
                </h2>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded"
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

          {activeTab === "wpa-leaders" && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Lifetime WPA Leaders
                {selectedPlayer && (
                  <button
                    onClick={() => {
                      setSelectedPlayer(null);
                      setPlayerBreakdown(null);
                    }}
                    className="ml-4 text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
                  >
                    ← Back to Leaders
                  </button>
                )}
              </h2>
              
              {!selectedPlayer ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Top Performers (Click to see breakdown)</h3>
                    <div className="space-y-3">
                      {wpaLeaders.map((leader, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors"
                          onClick={() => handlePlayerClick(leader.player)}
                        >
                          <span className="font-medium">
                            {idx + 1}. {leader.player.replace(", ", " ").split(" ").reverse().join(" ")}
                          </span>
                          <span className={`font-bold ${
                            leader.wpa > 0 ? "text-green-400" : "text-red-400"
                          }`}>
                            {leader.wpa > 0 ? "+" : ""}{leader.wpa}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">WPA Explained</h3>
                    <p className="text-gray-300 mb-3">
                      Win Probability Added measures how much a player&apos;s actions change their team&apos;s chance of winning.
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Positive WPA = clutch performance</li>
                      <li>• Negative WPA = hurt team&apos;s chances</li>
                      <li>• Based on game situation &amp; outcome</li>
                      <li>• Higher leverage = bigger impact</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  {playerBreakdown ? (
                    <div className="space-y-6">
                      <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-xl font-bold mb-2">
                          {playerBreakdown.player.replace(", ", " ").split(" ").reverse().join(" ")}
                        </h3>
                        <p className="text-lg">
                          Total WPA: <span className={`font-bold ${
                            playerBreakdown.total_wpa > 0 ? "text-green-400" : "text-red-400"
                          }`}>
                            {playerBreakdown.total_wpa > 0 ? "+" : ""}{playerBreakdown.total_wpa}
                          </span>
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold">Game-by-Game Breakdown</h4>
                        {playerBreakdown.games.map((game, idx) => (
                          <div key={idx} className="bg-gray-800 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-medium">{formatDate(game.date)} - {game.matchup}</span>
                              <span className={`font-bold ${
                                game.total_wpa > 0 ? "text-green-400" : "text-red-400"
                              }`}>
                                {game.total_wpa > 0 ? "+" : ""}{game.total_wpa}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {game.events.map((event, eventIdx) => (
                                <div key={eventIdx} className="text-sm bg-gray-700 p-2 rounded">
                                  <div className="flex justify-between items-start">
                                    <span className="flex-1 mr-2">{event.description}</span>
                                    <span className={`font-bold whitespace-nowrap ${
                                      event.wpa > 0 ? "text-green-400" : "text-red-400"
                                    }`}>
                                      {event.wpa > 0 ? "+" : ""}{event.wpa}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-xl">Loading player breakdown...</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
