"use client";
import React, { useState } from "react";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
};

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

interface BarrelMapProps {
  data: BattedBall[];
}

export default function BarrelMap({ data }: BarrelMapProps) {
  const [hoveredPoint, setHoveredPoint] = useState<BattedBall | null>(null);
  const [filterOutcome, setFilterOutcome] = useState<string>("all");

  // Filter data based on outcome
  const filteredData = data.filter(ball => 
    filterOutcome === "all" || ball.outcome === filterOutcome
  );

  // Chart dimensions - use CSS classes for responsiveness instead of JS
  const width = 900;
  const height = 600;
  const margin = { 
    top: 30, 
    right: 30, 
    bottom: 80, 
    left: 80 
  };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Scales - fix axis ranges for better baseball context
  const maxEV = 120;  // Fixed max for consistent scaling
  const minEV = 60;   // Fixed min for consistent scaling
  const maxLA = 50;   // Fixed max for launch angle
  const minLA = -20;  // Fixed min for launch angle

  const xScale = (ev: number) => ((ev - minEV) / (maxEV - minEV)) * chartWidth;
  const yScale = (la: number) => chartHeight - ((la - minLA) / (maxLA - minLA)) * chartHeight;

  // Color mapping
  const getColor = (outcome: string) => {
    switch (outcome) {
      case "home_run": return "#ff6b6b"; // Red for home runs
      case "hit": return "#4ecdc4"; // Teal for hits
      case "out": return "#95a5a6"; // Gray for outs
      default: return "#3498db"; // Blue default
    }
  };

  // Outcome counts
  const outcomes = data.reduce((acc, ball) => {
    acc[ball.outcome] = (acc[ball.outcome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barrels = data.filter(ball => ball.is_barrel).length;

  // X-axis ticks
  const xTicks = [60, 70, 80, 90, 100, 110, 120];
  const yTicks = [-20, -10, 0, 10, 20, 30, 40, 50];

  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
        <h3 className="text-lg md:text-xl font-bold text-white">Exit Velocity × Launch Angle</h3>
        <div className="flex items-center gap-4">
          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            className="bg-gray-700 text-white px-3 py-1 rounded text-sm w-full sm:w-auto"
          >
            <option value="all">All Outcomes</option>
            <option value="home_run">Home Runs ({outcomes.home_run || 0})</option>
            <option value="hit">Hits ({outcomes.hit || 0})</option>
            <option value="out">Outs ({outcomes.out || 0})</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Chart */}
        <div className="relative flex-1 overflow-x-auto">
          <svg 
            width={width} 
            height={height} 
            viewBox={`0 0 ${width} ${height}`}
            className="bg-gray-900 rounded w-full h-auto max-w-full"
          >
            {/* Barrel zone (approximate) */}
            <defs>
              <pattern id="barrelZone" patternUnits="userSpaceOnUse" width="4" height="4">
                <rect width="4" height="4" fill="#34495e" opacity="0.3"/>
                <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#4CAF50" strokeWidth="0.5" opacity="0.5"/>
              </pattern>
            </defs>
            
            {/* Barrel zone background */}
            <rect
              x={margin.left + xScale(98)}
              y={margin.top + yScale(50)}
              width={xScale(120) - xScale(98)}
              height={yScale(8) - yScale(50)}
              fill="url(#barrelZone)"
              opacity="0.3"
            />

            {/* X-axis */}
            <line
              x1={margin.left}
              y1={margin.top + chartHeight}
              x2={margin.left + chartWidth}
              y2={margin.top + chartHeight}
              stroke="#6b7280"
              strokeWidth="2"
            />
            
            {/* Y-axis */}
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + chartHeight}
              stroke="#6b7280"
              strokeWidth="2"
            />

            {/* X-axis ticks and labels */}
            {xTicks.map(tick => (
              <g key={tick}>
                <line
                  x1={margin.left + xScale(tick)}
                  y1={margin.top + chartHeight}
                  x2={margin.left + xScale(tick)}
                  y2={margin.top + chartHeight + 5}
                  stroke="#6b7280"
                />
                <text
                  x={margin.left + xScale(tick)}
                  y={margin.top + chartHeight + 20}
                  textAnchor="middle"
                  className="fill-gray-400 text-xs"
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* Y-axis ticks and labels */}
            {yTicks.map(tick => (
              <g key={tick}>
                <line
                  x1={margin.left - 5}
                  y1={margin.top + yScale(tick)}
                  x2={margin.left}
                  y2={margin.top + yScale(tick)}
                  stroke="#6b7280"
                />
                <text
                  x={margin.left - 10}
                  y={margin.top + yScale(tick) + 3}
                  textAnchor="end"
                  className="fill-gray-400 text-xs"
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* Axis labels */}
            <text
              x={margin.left + chartWidth / 2}
              y={height - 10}
              textAnchor="middle"
              className="fill-gray-300 text-sm font-medium"
            >
              Exit Velocity (mph)
            </text>
            <text
              x={15}
              y={margin.top + chartHeight / 2}
              textAnchor="middle"
              className="fill-gray-300 text-sm font-medium"
              transform={`rotate(-90, 15, ${margin.top + chartHeight / 2})`}
            >
              Launch Angle (°)
            </text>

            {/* Data points */}
            {filteredData.map((ball, i) => (
              <circle
                key={i}
                cx={margin.left + xScale(ball.exit_velocity)}
                cy={margin.top + yScale(ball.launch_angle)}
                r={ball.is_barrel ? 5 : 3}
                fill={getColor(ball.outcome)}
                stroke={ball.is_barrel ? "#4CAF50" : "none"}
                strokeWidth={ball.is_barrel ? 2 : 0}
                opacity={0.7}
                className="cursor-pointer hover:opacity-100 transition-opacity"
                onMouseEnter={() => setHoveredPoint(ball)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </svg>

          {/* Enhanced Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-95 text-white p-4 rounded-lg shadow-xl text-sm max-w-sm border border-gray-600">
              <div className="font-bold text-lg text-blue-400 mb-2">{hoveredPoint.batter}</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-300">Exit Velocity:</span>
                  <span className="font-semibold text-white">{hoveredPoint.exit_velocity} mph</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Launch Angle:</span>
                  <span className="font-semibold text-white">{hoveredPoint.launch_angle}°</span>
                </div>
                {hoveredPoint.distance && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Distance:</span>
                    <span className="font-semibold text-orange-400">{hoveredPoint.distance} ft</span>
                  </div>
                )}
                {hoveredPoint.pitcher && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Pitcher:</span>
                    <span className="font-semibold text-white">{hoveredPoint.pitcher}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-700 mt-2">
                  <div className="text-gray-300">{hoveredPoint.description}</div>
                  <div className="text-gray-400 text-xs mt-1">{formatDate(hoveredPoint.date)} - {hoveredPoint.matchup}</div>
                </div>
                {hoveredPoint.is_barrel && (
                  <div className="text-green-400 font-semibold mt-2 flex items-center">
                    <span className="mr-1">🎯</span> Barrel
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Legend and stats */}
        <div className="lg:min-w-[200px] space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">Legend</h4>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-red-500 flex-shrink-0"></div>
                <span className="text-gray-300 text-xs md:text-sm">Home Runs ({outcomes.home_run || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-teal-500 flex-shrink-0"></div>
                <span className="text-gray-300 text-xs md:text-sm">Hits ({outcomes.hit || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-gray-500 flex-shrink-0"></div>
                <span className="text-gray-300 text-xs md:text-sm">Outs ({outcomes.out || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-blue-500 border-2 border-green-500 flex-shrink-0"></div>
                <span className="text-gray-300 text-xs md:text-sm">Barrels ({barrels})</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <h4 className="text-white font-semibold mb-2">Stats</h4>
            <div className="text-xs md:text-sm text-gray-300 space-y-1">
              <div>Total Batted Balls: {data.length}</div>
              <div>Barrel Rate: {((barrels / data.length) * 100).toFixed(1)}%</div>
              <div>Home Run Rate: {(((outcomes.home_run || 0) / data.length) * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}