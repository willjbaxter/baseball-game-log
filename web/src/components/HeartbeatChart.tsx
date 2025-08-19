"use client";
import React, { useState } from 'react';

interface HeartbeatPoint {
  x: number;
  y: number;
  wpa: number;
  batter: string;
  event: string;
  description: string;
}

interface HeartbeatGame {
  game_pk: number;
  date: string;
  matchup: string;
  score: string;
  result: 'W' | 'L';
  drama_score: number;
  drama_category: {
    level: string;
    emoji: string;
    color: string;
    label: string;
  };
  total_events: number;
  heartbeat_points: HeartbeatPoint[];
}

interface HeartbeatChartProps {
  games: HeartbeatGame[];
}

export default function HeartbeatChart({ games }: HeartbeatChartProps) {
  const [selectedGame, setSelectedGame] = useState<HeartbeatGame | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'stacked'>('single');
  const [hoveredPoint, setHoveredPoint] = useState<{game: HeartbeatGame, point: HeartbeatPoint} | null>(null);

  // Chart dimensions
  const chartWidth = 800;
  const chartHeight = 200;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const renderSingleGameChart = (game: HeartbeatGame, index: number = 0) => {
    if (!game.heartbeat_points.length) return null;

    // Calculate scales
    const allWpaValues = game.heartbeat_points.map(p => p.y);
    const minWpa = Math.min(...allWpaValues, 0);
    const maxWpa = Math.max(...allWpaValues, 0);
    const wpaRange = Math.max(Math.abs(minWpa), Math.abs(maxWpa), 0.5);

    // Scale functions
    const xScale = (x: number) => (x / Math.max(game.heartbeat_points.length - 1, 1)) * innerWidth;
    const yScale = (y: number) => innerHeight - ((y + wpaRange) / (2 * wpaRange)) * innerHeight;

    // Generate path for the line
    const pathData = game.heartbeat_points
      .map((point, i) => `${i === 0 ? 'M' : 'L'} ${xScale(point.x)} ${yScale(point.y)}`)
      .join(' ');

    const offsetY = viewMode === 'stacked' ? index * (chartHeight + 10) : 0;

    return (
      <g key={game.game_pk} transform={`translate(0, ${offsetY})`}>
        {/* EKG Grid Background */}
        <defs>
          <pattern id={`grid-${game.game_pk}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3"/>
          </pattern>
        </defs>
        <rect
          width={innerWidth}
          height={innerHeight}
          fill={`url(#grid-${game.game_pk})`}
          transform={`translate(${margin.left}, ${margin.top})`}
        />

        {/* Zero line */}
        <line
          x1={margin.left}
          y1={margin.top + yScale(0)}
          x2={margin.left + innerWidth}
          y2={margin.top + yScale(0)}
          stroke="#6b7280"
          strokeWidth="1"
          strokeDasharray="2,2"
        />

        {/* Heartbeat line */}
        <path
          d={pathData}
          fill="none"
          stroke={game.drama_category.color}
          strokeWidth="2"
          transform={`translate(${margin.left}, ${margin.top})`}
        />

        {/* Drama peaks/valleys */}
        {game.heartbeat_points.map((point, i) => {
          const isSignificant = Math.abs(point.wpa) > 0.15;
          if (!isSignificant) return null;

          return (
            <circle
              key={i}
              cx={margin.left + xScale(point.x)}
              cy={margin.top + yScale(point.y)}
              r={Math.min(8, 3 + Math.abs(point.wpa) * 8)}
              fill={point.wpa > 0 ? "#22c55e" : "#ef4444"}
              stroke="#ffffff"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onMouseEnter={() => setHoveredPoint({game, point})}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          );
        })}

        {/* Game info */}
        <text
          x={margin.left}
          y={margin.top - 5}
          fontSize="12"
          fill="#e5e7eb"
          fontWeight="bold"
        >
          {game.drama_category.emoji} {game.matchup} ({game.date}) - {game.result} {game.score}
        </text>

        {/* Drama score */}
        <text
          x={margin.left + innerWidth - 5}
          y={margin.top - 5}
          fontSize="12"
          fill={game.drama_category.color}
          fontWeight="bold"
          textAnchor="end"
        >
          Drama: {game.drama_score}
        </text>

        {/* Y-axis */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + innerHeight}
          stroke="#6b7280"
          strokeWidth="1"
        />

        {/* Y-axis labels */}
        <text
          x={margin.left - 10}
          y={margin.top + yScale(wpaRange)}
          fontSize="10"
          fill="#9ca3af"
          textAnchor="end"
        >
          +{wpaRange.toFixed(1)}
        </text>
        <text
          x={margin.left - 10}
          y={margin.top + yScale(0)}
          fontSize="10"
          fill="#9ca3af"
          textAnchor="end"
        >
          0
        </text>
        <text
          x={margin.left - 10}
          y={margin.top + yScale(-wpaRange)}
          fontSize="10"
          fill="#9ca3af"
          textAnchor="end"
        >
          -{wpaRange.toFixed(1)}
        </text>

        {/* X-axis */}
        <line
          x1={margin.left}
          y1={margin.top + innerHeight}
          x2={margin.left + innerWidth}
          y2={margin.top + innerHeight}
          stroke="#6b7280"
          strokeWidth="1"
        />
        <text
          x={margin.left + innerWidth / 2}
          y={margin.top + innerHeight + 20}
          fontSize="10"
          fill="#9ca3af"
          textAnchor="middle"
        >
          Game Progress →
        </text>
      </g>
    );
  };

  const totalHeight = viewMode === 'stacked' 
    ? (selectedGame ? chartHeight : games.length * (chartHeight + 10))
    : chartHeight;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('single')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === 'single'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Single Game
          </button>
          <button
            onClick={() => setViewMode('stacked')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === 'stacked'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Stack All Games
          </button>
        </div>

        {viewMode === 'single' && (
          <select
            value={selectedGame?.game_pk || ''}
            onChange={(e) => {
              const game = games.find(g => g.game_pk === parseInt(e.target.value));
              setSelectedGame(game || null);
            }}
            className="bg-gray-700 text-white px-3 py-2 rounded w-full sm:w-auto"
          >
            <option value="">Select a game...</option>
            {games.map(game => (
              <option key={game.game_pk} value={game.game_pk}>
                {game.drama_category.emoji} {game.matchup} ({game.date}) - Drama: {game.drama_score}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto">
        <svg width={chartWidth} height={totalHeight + 50} className="text-white">
          {viewMode === 'single' && selectedGame ? (
            renderSingleGameChart(selectedGame)
          ) : viewMode === 'stacked' ? (
            games.map((game, index) => renderSingleGameChart(game, index))
          ) : (
            <text
              x={chartWidth / 2}
              y={chartHeight / 2}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="16"
            >
              Select a game to view its heartbeat
            </text>
          )}
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredPoint && (
        <div className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg pointer-events-none">
          <div className="text-sm">
            <div className="font-semibold text-white">
              {hoveredPoint.point.batter} - {hoveredPoint.point.event}
            </div>
            <div className={`font-bold ${hoveredPoint.point.wpa > 0 ? 'text-green-400' : 'text-red-400'}`}>
              WPA: {hoveredPoint.point.wpa > 0 ? '+' : ''}{hoveredPoint.point.wpa.toFixed(3)}
            </div>
            {hoveredPoint.point.description && (
              <div className="text-gray-300 text-xs mt-1">
                {hoveredPoint.point.description.substring(0, 60)}...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>🫀💥 Cardiac Arrest (70+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span>📈💗 Elevated (40-69)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>💚📊 Steady (20-39)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span>😴📉 Flatline (0-19)</span>
        </div>
      </div>
    </div>
  );
}