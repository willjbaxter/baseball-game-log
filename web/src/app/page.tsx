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
            is_barrel: (b.launch_angle >= 8 && b.launch_angle <= 50) && (b.launch_speed >= 98),
            date: b.date,
            matchup: `${b.away_team} @ ${b.home_team}`,
            description: b.description,
            distance: b.distance ?? null
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
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading your baseball data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4 md:p-6">
        <h1 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8 text-center">
          Baxter Sox History
        </h1>
        
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
