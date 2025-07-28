"use client";
import React from "react";

interface Game {
  id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  venue_name: string | null;
  recap_video_url?: string;
}

export default function GamesTable({ games }: { games: Game[] }) {
  const [year, setYear] = React.useState<string>("All");
  const [search, setSearch] = React.useState<string>("");

  const years = Array.from(new Set(games.map((g) => g.date.slice(0, 4)))).sort().reverse();

  const filtered = games.filter((g) => {
    const matchesYear = year === "All" || g.date.startsWith(year);
    const matchesOpp =
      search.trim() === "" ||
      g.away_team.toLowerCase().includes(search.toLowerCase()) ||
      g.home_team.toLowerCase().includes(search.toLowerCase());
    return matchesYear && matchesOpp;
  });

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <select
          className="bg-gray-900 border rounded p-2"
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
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Matchup</th>
            <th className="p-2 border">Score</th>
            <th className="p-2 border">Venue</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((g, idx) => (
            <tr
              key={g.id}
              className={`${idx % 2 === 0 ? "bg-gray-800/20" : "bg-gray-800/10"} hover:bg-gray-600/30`}
            >
              <td className="p-2 border">{g.date}</td>
              <td className="p-2 border">
                {g.away_team} @ {g.home_team}
              </td>
              <td className="p-2 border text-right">
                {g.away_score !== null && g.home_score !== null ? `${g.away_score}-${g.home_score}` : "TBD"}
              </td>
              <td className="p-2 border">
                {g.recap_video_url && (
                  <a
                    href={g.recap_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 underline"
                  >
                    Watch Recap
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
} 