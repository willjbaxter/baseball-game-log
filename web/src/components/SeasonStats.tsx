"use client";
import { useState, useEffect } from "react";

interface SeasonData {
  season: number;
  games_attended: number;
  wins: number;
  losses: number;
  total_home_runs: number;
  barrel_count: number;
  avg_drama_score: number;
  venues: Record<string, number>;
  longest_hr: { distance: number; batter: string; date: string; matchup: string; exit_velo: number } | null;
  highest_exit_velo: { exit_velo: number; batter: string; date: string; distance: number } | null;
  most_dramatic_game: { drama_score: number; matchup: string; date: string; score: string; drama_category: { emoji: string; label: string } } | null;
  top_wpa_moment: { wpa: number; batter: string; event_type: string; date: string; matchup: string } | null;
}

export default function SeasonStats() {
  const [seasons, setSeasons] = useState<SeasonData[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/season_stats.json")
      .then((r) => r.json())
      .then((data: SeasonData[]) => {
        setSeasons(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 p-8">Loading season stats...</div>;
  if (!seasons.length) return <div className="text-gray-400 p-8">No season data available.</div>;

  // Aggregate "all time" stats
  const allTime: SeasonData = {
    season: 0,
    games_attended: seasons.reduce((s, d) => s + d.games_attended, 0),
    wins: seasons.reduce((s, d) => s + d.wins, 0),
    losses: seasons.reduce((s, d) => s + d.losses, 0),
    total_home_runs: seasons.reduce((s, d) => s + d.total_home_runs, 0),
    barrel_count: seasons.reduce((s, d) => s + d.barrel_count, 0),
    avg_drama_score: seasons.length ? Math.round(seasons.reduce((s, d) => s + d.avg_drama_score, 0) / seasons.length * 10) / 10 : 0,
    venues: seasons.reduce((acc, d) => {
      Object.entries(d.venues).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
      return acc;
    }, {} as Record<string, number>),
    longest_hr: seasons.reduce((best, d) => {
      if (!d.longest_hr) return best;
      if (!best || (d.longest_hr.distance || 0) > (best.distance || 0)) return d.longest_hr;
      return best;
    }, null as SeasonData["longest_hr"]),
    highest_exit_velo: seasons.reduce((best, d) => {
      if (!d.highest_exit_velo) return best;
      if (!best || (d.highest_exit_velo.exit_velo || 0) > (best.exit_velo || 0)) return d.highest_exit_velo;
      return best;
    }, null as SeasonData["highest_exit_velo"]),
    most_dramatic_game: seasons.reduce((best, d) => {
      if (!d.most_dramatic_game) return best;
      if (!best || d.most_dramatic_game.drama_score > best.drama_score) return d.most_dramatic_game;
      return best;
    }, null as SeasonData["most_dramatic_game"]),
    top_wpa_moment: seasons.reduce((best, d) => {
      if (!d.top_wpa_moment) return best;
      if (!best || Math.abs(d.top_wpa_moment.wpa) > Math.abs(best.wpa)) return d.top_wpa_moment;
      return best;
    }, null as SeasonData["top_wpa_moment"]),
  };

  const data = selected === "all" ? allTime : seasons.find((s) => String(s.season) === selected) || allTime;
  const title = selected === "all" ? "All Time" : selected;

  return (
    <div className="space-y-6">
      {/* Season selector */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-white">{title} Stats</h2>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1.5 text-sm"
        >
          <option value="all">All Time</option>
          {seasons.map((s) => (
            <option key={s.season} value={String(s.season)}>
              {s.season}
            </option>
          ))}
        </select>
      </div>

      {/* Top-level stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Games Attended" value={data.games_attended} />
        <StatBox label="Record" value={`${data.wins}-${data.losses}`} />
        <StatBox label="HRs Witnessed" value={data.total_home_runs} />
        <StatBox label="Barrels" value={data.barrel_count} />
        <StatBox label="Avg Drama" value={data.avg_drama_score} />
        <StatBox
          label="Longest HR"
          value={data.longest_hr ? `${data.longest_hr.distance} ft` : "—"}
          subtitle={data.longest_hr ? data.longest_hr.batter : undefined}
        />
        <StatBox
          label="Hardest Hit"
          value={data.highest_exit_velo ? `${data.highest_exit_velo.exit_velo} mph` : "—"}
          subtitle={data.highest_exit_velo ? data.highest_exit_velo.batter : undefined}
        />
        <StatBox
          label="Venues"
          value={Object.keys(data.venues).length}
        />
      </div>

      {/* Most Dramatic Game */}
      {data.most_dramatic_game && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Most Dramatic Game</h3>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{data.most_dramatic_game.drama_category.emoji}</span>
            <div>
              <div className="text-white font-medium">
                {data.most_dramatic_game.matchup} — {data.most_dramatic_game.score}
              </div>
              <div className="text-gray-400 text-sm">
                {data.most_dramatic_game.date} — Drama Score: {data.most_dramatic_game.drama_score} ({data.most_dramatic_game.drama_category.label})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top WPA Moment */}
      {data.top_wpa_moment && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Biggest WPA Swing</h3>
          <div className="text-white">
            <span className="font-medium">{data.top_wpa_moment.batter}</span>
            <span className="text-gray-400"> — {data.top_wpa_moment.event_type?.replace(/_/g, " ")}</span>
          </div>
          <div className="text-gray-400 text-sm">
            WPA: {data.top_wpa_moment.wpa > 0 ? "+" : ""}{data.top_wpa_moment.wpa.toFixed(3)} — {data.top_wpa_moment.matchup} ({data.top_wpa_moment.date})
          </div>
        </div>
      )}

      {/* Venue breakdown */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Venues</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(data.venues)
            .sort((a, b) => b[1] - a[1])
            .map(([venue, count]) => (
              <div key={venue} className="flex justify-between text-sm">
                <span className="text-gray-300">{venue}</span>
                <span className="text-white font-medium">{count} game{count !== 1 ? "s" : ""}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</div>}
    </div>
  );
}
