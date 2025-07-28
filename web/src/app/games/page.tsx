import React from "react";
import GamesTable from "@/components/GamesTable";

interface Game {
  id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  venue_name: string | null;
  mlb_game_pk: number | null;
}

async function fetchGames(): Promise<Game[]> {
  const res = await fetch("http://localhost:8000/games", { next: { revalidate: 60 } });
  if (!res.ok) throw new Error("Failed to fetch games");
  const data = await res.json();
  return data.games as Game[];
}

function computeKPIs(games: Game[]) {
  const total = games.length;
  let wins = 0;
  let losses = 0;
  games.forEach((g) => {
    if (g.home_score !== null && g.away_score !== null) {
      const isHome = g.home_team === "BOS"; // you attended Fenway games mostly
      const bosScore = isHome ? g.home_score : g.away_score;
      const oppScore = isHome ? g.away_score : g.home_score;
      if (bosScore > oppScore) wins += 1;
      else if (bosScore < oppScore) losses += 1;
    }
  });
  return { total, wins, losses };
}

export default async function GamesPage() {
  const games = await fetchGames();
  const kpi = computeKPIs(games);

  return (
    <div className="container mx-auto p-6 text-gray-100">
      <h1 className="text-3xl font-bold mb-4">Attended Games</h1>
      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded p-4 text-center">
          <p className="text-sm text-gray-400">Total Games</p>
          <p className="text-2xl font-semibold">{kpi.total}</p>
        </div>
        <div className="bg-green-800/60 rounded p-4 text-center">
          <p className="text-sm text-gray-200">Wins</p>
          <p className="text-2xl font-semibold">{kpi.wins}</p>
        </div>
        <div className="bg-red-800/60 rounded p-4 text-center">
          <p className="text-sm text-gray-200">Losses</p>
          <p className="text-2xl font-semibold">{kpi.losses}</p>
        </div>
      </div>

      <GamesTable games={games} />
    </div>
  );
} 