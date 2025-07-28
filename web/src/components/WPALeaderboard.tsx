"use client";
import React, { useEffect, useState } from "react";

interface LeaderRow {
  player: string;
  wpa: number;
}

export default function WPALeaderboard({ limit = 10 }: { limit?: number }) {
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);

  useEffect(() => {
    fetch(`http://localhost:8000/statcast/wpa/leaders?limit=${limit}`)
      .then((r) => r.json())
      .then((d) => setLeaders(d.leaders));
  }, [limit]);

  return (
    <div className="bg-gray-800/40 rounded p-4 w-full md:w-1/2">
      <h3 className="text-lg font-semibold mb-2">Lifetime WPA Leaders</h3>
      <ol className="space-y-1">
        {leaders.map((l, idx) => (
          <li key={l.player} className="flex justify-between text-sm">
            <span>
              {idx + 1}. {l.player}
            </span>
            <span className="font-mono">{l.wpa.toFixed(3)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
} 