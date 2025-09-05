"use client";
import React from "react";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
};

interface GameRow {
  game_pk: number;
  date: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  venue_name: string | null;
  spark?: number[];
}

type SortField = 'date' | 'score' | 'matchup';
type SortDirection = 'asc' | 'desc';

export default function GamesTable({ games }: { games: GameRow[] }) {
  const [year, setYear] = React.useState<string>("All");
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<SortField>('date');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  const years = Array.from(new Set(games.map((g) => g.date.slice(0, 4)))).sort().reverse();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '⇈' : '⇊';
  };

  const filtered = games.filter((g) => {
    const matchesYear = year === "All" || g.date.startsWith(year);
    const matchesOpp =
      search.trim() === "" ||
      g.away_team.toLowerCase().includes(search.toLowerCase()) ||
      g.home_team.toLowerCase().includes(search.toLowerCase());
    return matchesYear && matchesOpp;
  });

  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'score':
        const aTotal = (a.home_score || 0) + (a.away_score || 0);
        const bTotal = (b.home_score || 0) + (b.away_score || 0);
        comparison = aTotal - bTotal;
        break;
      case 'matchup':
        comparison = `${a.away_team} @ ${a.home_team}`.localeCompare(`${b.away_team} @ ${b.home_team}`);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
        <select
          className="bg-gray-900 border rounded p-2 w-full sm:w-auto"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="All">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by opponent"
          className="bg-gray-900 border rounded p-2 flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <table className="min-w-full border text-sm">
        <thead className="bg-gray-700 text-gray-200">
          <tr>
            <th 
              className="p-2 md:p-3 border cursor-pointer hover:bg-gray-600 select-none text-xs md:text-sm"
              onClick={() => handleSort('date')}
            >
              Date {getSortIcon('date')}
            </th>
            <th 
              className="p-2 md:p-3 border cursor-pointer hover:bg-gray-600 select-none text-xs md:text-sm"
              onClick={() => handleSort('matchup')}
            >
              Matchup {getSortIcon('matchup')}
            </th>
            <th 
              className="p-2 md:p-3 border cursor-pointer hover:bg-gray-600 select-none text-xs md:text-sm"
              onClick={() => handleSort('score')}
            >
              Score {getSortIcon('score')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((g, idx) => (
            <tr
              key={g.game_pk}
              className={`${idx % 2 === 0 ? "bg-gray-800/20" : "bg-gray-800/10"} hover:bg-gray-600/30`}
            >
              <td className="p-2 md:p-3 border text-xs md:text-sm">{formatDate(g.date)}</td>
              <td className="p-2 md:p-3 border text-xs md:text-sm">
                {g.away_team} @ {g.home_team}
              </td>
              <td className="p-2 md:p-3 border text-right text-xs md:text-sm">
                {g.away_score !== null && g.home_score !== null ? (
                  <span className={g.home_score > g.away_score ? "text-green-400" : "text-red-400"}>
                    {g.home_score > g.away_score ? "W " : "L "}{Math.max(g.away_score, g.home_score)}-{Math.min(g.away_score, g.home_score)}
                  </span>
                ) : "TBD"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
} 