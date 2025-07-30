"use client";
import { useState, useEffect } from "react";
import GamesTable from "@/components/GamesTable";
import BarrelMap from "@/components/BarrelMap";

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
  outcome: string;
  is_barrel: boolean;
  date: string;
  matchup: string;
  description: string;
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

  const handlePlayerClick = async (playerName: string) => {
    setSelectedPlayer(playerName);
    try {
      const response = await fetch(`http://localhost:8000/statcast/wpa/player/${encodeURIComponent(playerName)}`);
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
    if (homersSortField !== field) return '↕️';
    return homersSortDirection === 'asc' ? '↑' : '↓';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gamesRes, homersRes, wpaRes, barrelRes] = await Promise.all([
          fetch("http://localhost:8000/games"),
          fetch("http://localhost:8000/statcast/longest-homers?limit=20"),
          fetch("http://localhost:8000/statcast/wpa/leaders?limit=15"),
          fetch("http://localhost:8000/statcast/barrel-map")
        ]);

        const gamesData = await gamesRes.json();
        const homersData = await homersRes.json();
        const wpaData = await wpaRes.json();
        const barrelData = await barrelRes.json();

        setGames(gamesData.games || []);
        setLongestHomers(homersData.homers || []);
        setWpaLeaders(wpaData.leaders || []);
        setBarrelMapData(barrelData.batted_balls || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const tabs = [
    { id: "games", label: "Games" },
    { id: "longest-homers", label: "Longest HRs" },
    { id: "barrel-map", label: "Barrel Map" },
    { id: "wpa-leaders", label: "WPA Leaders" },
    { id: "highlights", label: "Highlights" }
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
          ⚾ Personal Baseball Game Log
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
              <h2 className="text-2xl font-semibold mb-4">
                Longest Home Runs
              </h2>
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
                          <td className="p-3">{homer.date}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "barrel-map" && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Exit Velocity × Launch Angle Map
              </h2>
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
                      Win Probability Added measures how much a player's actions change their team's chance of winning.
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Positive WPA = clutch performance</li>
                      <li>• Negative WPA = hurt team's chances</li>
                      <li>• Based on game situation & outcome</li>
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
                              <span className="font-medium">{game.date} - {game.matchup}</span>
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

          {activeTab === "highlights" && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Game Highlights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-2 text-blue-400">
                    Longest Home Run
                  </h3>
                  {longestHomers[0] && (
                    <div>
                      <p className="text-2xl font-bold">{longestHomers[0].distance} ft</p>
                      <p className="text-sm text-gray-400">
                        {longestHomers[0].batter} • {longestHomers[0].date}
                      </p>
                      <p className="text-xs text-gray-500">
                        {longestHomers[0].launch_speed} mph, {longestHomers[0].launch_angle}°
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-2 text-green-400">
                    Top WPA Performance
                  </h3>
                  {wpaLeaders[0] && (
                    <div>
                      <p className="text-2xl font-bold">+{wpaLeaders[0].wpa}</p>
                      <p className="text-sm text-gray-400">
                        {wpaLeaders[0].player.replace(", ", " ").split(" ").reverse().join(" ")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-2 text-blue-400">
                    Games Attended
                  </h3>
                  <p className="text-2xl font-bold">{games.length}</p>
                  <p className="text-sm text-gray-400">
                    Since {games[games.length - 1]?.date.slice(0, 4)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
