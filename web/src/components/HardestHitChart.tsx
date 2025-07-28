"use client";
import React, { useEffect, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface EventRow {
  launch_speed: number;
  launch_angle: number;
  batter: string;
  pitcher: string;
  date: string;
  video_url?: string | null;
}

export default function HardestHitChart() {
  const [data, setData] = useState<EventRow[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/statcast/hardest-hit?limit=200")
      .then((r) => r.json())
      .then((d) => setData(d.events));
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload as EventRow;
      return (
        <div className="bg-gray-800 p-3 rounded text-sm max-w-xs">
          <p className="mb-1">
            <span className="font-semibold">{p.batter}</span> vs {p.pitcher}
          </p>
          <p className="mb-1">
            {p.date} — EV {p.launch_speed} mph, LA {p.launch_angle}°
          </p>
          {p.video_url && (
            <a
              href={p.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 underline"
            >
              Watch clip ↗
            </a>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
        <XAxis dataKey="launch_speed" name="EV" unit="mph" domain={[90, 'dataMax']} />
        <YAxis dataKey="launch_angle" name="LA" unit="°" domain={[-10, 50]} />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter
          data={data}
          fill="#9f7aea"
          onClick={(_, idx) => {
            const p = data[idx];
            if (p?.video_url) window.open(p.video_url, "_blank");
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
} 