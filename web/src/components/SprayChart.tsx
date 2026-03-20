"use client";
import { useState, useEffect, useMemo } from "react";

interface SprayBall {
  field_x: number;
  field_y: number;
  distance: number;
  exit_velo: number;
  launch_angle: number;
  batter: string;
  pitcher: string;
  outcome: string;
  event_type: string;
  is_barrel: boolean;
  date: string;
  matchup: string;
  season: number;
  game_pk: number;
}

const OUTCOME_COLORS: Record<string, string> = {
  home_run: "#ef4444",
  hit: "#22c55e",
  out: "#6b7280",
  other: "#3b82f6",
};

const OUTCOME_LABELS: Record<string, string> = {
  home_run: "Home Run",
  hit: "Hit (1B/2B/3B)",
  out: "Out",
  other: "Other",
};

// Field dimensions (SVG viewBox coordinates)
const SVG_SIZE = 500;
const CENTER_X = SVG_SIZE / 2;
const CENTER_Y = SVG_SIZE - 40; // Home plate at bottom
const SCALE = 0.95; // Scale factor: 1 foot ≈ 0.95 SVG units (fits ~450ft in view)

function fieldToSvg(field_x: number, field_y: number): { cx: number; cy: number } {
  return {
    cx: CENTER_X + field_x * SCALE,
    cy: CENTER_Y - field_y * SCALE,
  };
}

export default function SprayChart() {
  const [data, setData] = useState<SprayBall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [selectedOutcome, setSelectedOutcome] = useState<string>("all");
  const [hoveredBall, setHoveredBall] = useState<SprayBall | null>(null);

  useEffect(() => {
    fetch("/spray_chart.json")
      .then((r) => r.json())
      .then((d: SprayBall[]) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const seasons = useMemo(() => {
    const s = new Set(data.map((d) => d.season));
    return Array.from(s).sort((a, b) => b - a);
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (selectedSeason !== "all") {
      result = result.filter((d) => String(d.season) === selectedSeason);
    }
    if (selectedOutcome !== "all") {
      result = result.filter((d) => d.outcome === selectedOutcome);
    }
    return result;
  }, [data, selectedSeason, selectedOutcome]);

  if (loading) return <div className="text-gray-400 p-8">Loading spray chart...</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1.5 text-sm"
        >
          <option value="all">All Seasons</option>
          {seasons.map((s) => (
            <option key={s} value={String(s)}>{s}</option>
          ))}
        </select>
        <select
          value={selectedOutcome}
          onChange={(e) => setSelectedOutcome(e.target.value)}
          className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1.5 text-sm"
        >
          <option value="all">All Outcomes</option>
          <option value="home_run">Home Runs</option>
          <option value="hit">Hits</option>
          <option value="out">Outs</option>
        </select>
        <span className="text-gray-400 text-sm">{filtered.length} batted balls</span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        {Object.entries(OUTCOME_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: OUTCOME_COLORS[key] }}
            />
            <span className="text-gray-400">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-yellow-400 bg-transparent" />
          <span className="text-gray-400">Barrel</span>
        </div>
      </div>

      {/* SVG Field */}
      <div className="relative max-w-xl mx-auto">
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="w-full bg-gray-900 rounded-lg border border-gray-700"
        >
          {/* Field lines */}
          {/* Grass area (pie-shaped outfield) */}
          <path
            d={`M ${CENTER_X} ${CENTER_Y} L ${CENTER_X - 320 * SCALE} ${CENTER_Y - 320 * SCALE} A ${320 * SCALE} ${320 * SCALE} 0 0 1 ${CENTER_X + 320 * SCALE} ${CENTER_Y - 320 * SCALE} Z`}
            fill="#1a3a1a"
            opacity={0.3}
          />
          {/* Infield diamond */}
          <polygon
            points={`${CENTER_X},${CENTER_Y} ${CENTER_X - 63 * SCALE},${CENTER_Y - 63 * SCALE} ${CENTER_X},${CENTER_Y - 127 * SCALE} ${CENTER_X + 63 * SCALE},${CENTER_Y - 63 * SCALE}`}
            fill="none"
            stroke="#4a4a4a"
            strokeWidth={1}
          />
          {/* Foul lines */}
          <line
            x1={CENTER_X} y1={CENTER_Y}
            x2={CENTER_X - 350 * SCALE} y2={CENTER_Y - 350 * SCALE}
            stroke="#4a4a4a" strokeWidth={1}
          />
          <line
            x1={CENTER_X} y1={CENTER_Y}
            x2={CENTER_X + 350 * SCALE} y2={CENTER_Y - 350 * SCALE}
            stroke="#4a4a4a" strokeWidth={1}
          />
          {/* Distance arcs */}
          {[200, 300, 400].map((dist) => (
            <path
              key={dist}
              d={`M ${CENTER_X - dist * SCALE * 0.707} ${CENTER_Y - dist * SCALE * 0.707} A ${dist * SCALE} ${dist * SCALE} 0 0 1 ${CENTER_X + dist * SCALE * 0.707} ${CENTER_Y - dist * SCALE * 0.707}`}
              fill="none"
              stroke="#333"
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          ))}
          {/* Distance labels */}
          {[200, 300, 400].map((dist) => (
            <text
              key={`label-${dist}`}
              x={CENTER_X}
              y={CENTER_Y - dist * SCALE - 5}
              textAnchor="middle"
              fill="#555"
              fontSize={10}
            >
              {dist} ft
            </text>
          ))}
          {/* Home plate */}
          <polygon
            points={`${CENTER_X},${CENTER_Y - 3} ${CENTER_X - 5},${CENTER_Y + 2} ${CENTER_X - 3},${CENTER_Y + 6} ${CENTER_X + 3},${CENTER_Y + 6} ${CENTER_X + 5},${CENTER_Y + 2}`}
            fill="white"
          />

          {/* Batted balls */}
          {filtered.map((ball, i) => {
            const { cx, cy } = fieldToSvg(ball.field_x, ball.field_y);
            // Skip balls outside the viewbox
            if (cx < -20 || cx > SVG_SIZE + 20 || cy < -20 || cy > SVG_SIZE + 20) return null;

            const color = OUTCOME_COLORS[ball.outcome] || OUTCOME_COLORS.other;
            const radius = ball.is_barrel ? 4.5 : 3;

            return (
              <g key={i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={color}
                  opacity={hoveredBall === ball ? 1 : 0.7}
                  stroke={ball.is_barrel ? "#facc15" : "none"}
                  strokeWidth={ball.is_barrel ? 2 : 0}
                  onMouseEnter={() => setHoveredBall(ball)}
                  onMouseLeave={() => setHoveredBall(null)}
                  className="cursor-pointer transition-opacity"
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredBall && (
          <div className="absolute top-2 right-2 bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm max-w-[220px] shadow-lg">
            <div className="font-medium text-white">{hoveredBall.batter}</div>
            <div className="text-gray-400">
              {hoveredBall.event_type?.replace(/_/g, " ")} vs {hoveredBall.pitcher}
            </div>
            <div className="text-gray-400 mt-1">
              {hoveredBall.exit_velo} mph | {hoveredBall.launch_angle}° | {hoveredBall.distance} ft
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {hoveredBall.matchup} — {hoveredBall.date}
            </div>
            {hoveredBall.is_barrel && (
              <div className="text-yellow-400 text-xs mt-1 font-medium">Barrel</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
