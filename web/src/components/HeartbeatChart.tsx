"use client";
import React, { useState } from 'react';

interface HeartbeatPoint {
  x: number;
  y: number;
  prev_y?: number;
  wpa: number;
  batter: string;
  event: string;
  description: string;
  situation?: string;
  score_context?: string;
  pitcher?: string;
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
  home_team?: string;  // Optional for backward compatibility
}

interface HeartbeatChartProps {
  games: HeartbeatGame[];
}

export default function HeartbeatChart({ games }: HeartbeatChartProps) {
  const [selectedGame, setSelectedGame] = useState<HeartbeatGame | null>(null);
  const [viewMode, setViewMode] = useState<'stacked' | 'single'>('stacked');
  const [hoveredPoint, setHoveredPoint] = useState<{game: HeartbeatGame, point: HeartbeatPoint} | null>(null);

  // Sort games chronologically (recent first)
  const sortedGames = [...games].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Chart dimensions - make responsive to container width
  const chartWidth = 1200; // Increased width
  const chartHeight = 200;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const renderSingleGameChart = (game: HeartbeatGame, index: number = 0) => {
    if (!game.heartbeat_points.length) return null;

    // Scale functions for win probability (0-1 range)
    const xScale = (x: number) => x * innerWidth;
    const yScale = (y: number) => innerHeight - (y * innerHeight);  // y is 0-1 win probability

    // Generate smooth path for the line - ensure unique x positions
    const sortedPoints = [...game.heartbeat_points]
      .sort((a, b) => a.x - b.x)
      .filter((point, i, arr) => i === 0 || point.x !== arr[i-1].x); // Remove duplicate x positions
    
    // Create smooth curve using bezier curves
    const pathData = sortedPoints
      .map((point, i, arr) => {
        if (i === 0) {
          return `M ${xScale(point.x)} ${yScale(point.y)}`;
        }
        // Use line for smooth transitions
        return `L ${xScale(point.x)} ${yScale(point.y)}`;
      })
      .join(' ');

    const offsetY = viewMode === 'stacked' ? index * (chartHeight + 10) : 0;

    return (
      <g key={game.game_pk} transform={`translate(0, ${offsetY})`}>
        {/* Background and shading */}
        <defs>
          <linearGradient id={`winGradient-${game.game_pk}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#6b7280" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect
          width={innerWidth}
          height={innerHeight}
          fill={`url(#winGradient-${game.game_pk})`}
          transform={`translate(${margin.left}, ${margin.top})`}
        />

        {/* 50% line - even odds */}
        <line
          x1={margin.left}
          y1={margin.top + yScale(0.5)}
          x2={margin.left + innerWidth}
          y2={margin.top + yScale(0.5)}
          stroke="#ffffff"
          strokeWidth="2"
          strokeDasharray="8,4"
          opacity="0.3"
        />
        
        {/* 25% and 75% guidelines */}
        <line
          x1={margin.left}
          y1={margin.top + yScale(0.75)}
          x2={margin.left + innerWidth}
          y2={margin.top + yScale(0.75)}
          stroke="#6b7280"
          strokeWidth="1"
          strokeDasharray="2,2"
          opacity="0.2"
        />
        <line
          x1={margin.left}
          y1={margin.top + yScale(0.25)}
          x2={margin.left + innerWidth}
          y2={margin.top + yScale(0.25)}
          stroke="#6b7280"
          strokeWidth="1"
          strokeDasharray="2,2"
          opacity="0.2"
        />

        {/* Win probability curve */}
        <path
          d={pathData}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="3"
          transform={`translate(${margin.left}, ${margin.top})`}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Shaded area showing win/loss regions */}
        <path
          d={`${pathData} L ${xScale(1)} ${yScale(0.5)} L ${xScale(0)} ${yScale(0.5)} Z`}
          fill={game.result === 'W' ? '#22c55e' : '#ef4444'}
          opacity="0.1"
          transform={`translate(${margin.left}, ${margin.top})`}
        />

        {/* Drama peaks/valleys */}
        {game.heartbeat_points.map((point, i) => {
          // Dynamic threshold based on game drama level
          let threshold = 0.15; // Default for high drama
          if (game.drama_score >= 70) {
            threshold = 0.15; // Cardiac Arrest: high bar
          } else if (game.drama_score >= 40) {
            threshold = 0.10; // Elevated: moderate bar
          } else if (game.drama_score >= 20) {
            threshold = 0.05; // Steady: low bar
          } else {
            threshold = 0.02; // Flatline: very low bar
          }
          
          const isSignificant = Math.abs(point.wpa) > threshold;
          if (!isSignificant) return null;

          // Plot dots at the individual WPA level relative to zero (point.wpa)
          // This shows the impact direction and magnitude of each individual event
          return (
            <circle
              key={i}
              cx={margin.left + xScale(point.x)}
              cy={margin.top + yScale(point.y)}  // Position on win probability curve
              r={Math.min(8, 3 + Math.abs(point.wpa) * 8)}  // Size based on individual WPA magnitude
              fill={point.wpa > 0 ? "#22c55e" : "#ef4444"}  // Green = helped home team, Red = hurt home team
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
          fontSize="13"
          fill="#e5e7eb"
          fontWeight="bold"
        >
          {game.matchup} ({game.date})
        </text>
        
        {/* Score with win/loss indicator */}
        <text
          x={margin.left + 250}
          y={margin.top - 5}
          fontSize="13"
          fill={game.result === 'W' ? '#22c55e' : '#ef4444'}
          fontWeight="bold"
        >
          {game.result} {game.score}
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

        {/* Y-axis labels - Win Probability */}
        <text
          x={margin.left - 10}
          y={margin.top + yScale(1)}
          fontSize="10"
          fill="#9ca3af"
          textAnchor="end"
        >
          100%
        </text>
        <text
          x={margin.left - 10}
          y={margin.top + yScale(0.75)}
          fontSize="10"
          fill="#9ca3af"
          textAnchor="end"
        >
          75%
        </text>
        <text
          x={margin.left - 10}
          y={margin.top + yScale(0.5)}
          fontSize="10"
          fill="#9ca3af"
          textAnchor="end"
          fontWeight="bold"
        >
          50%
        </text>
        <text
          x={margin.left - 10}
          y={margin.top + yScale(0.25)}
          fontSize="10"
          fill="#9ca3af"
          textAnchor="end"
        >
          25%
        </text>
        <text
          x={margin.left - 10}
          y={margin.top + yScale(0)}
          fontSize="10"
          fill="#9ca3af"
          textAnchor="end"
        >
          0%
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
    ? (selectedGame ? chartHeight : sortedGames.length * (chartHeight + 10))
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
              const game = sortedGames.find(g => g.game_pk === parseInt(e.target.value));
              setSelectedGame(game || null);
            }}
            className="bg-gray-700 text-white px-3 py-2 rounded w-full sm:w-auto"
          >
            <option value="">Select a game...</option>
            {sortedGames.map(game => (
              <option key={game.game_pk} value={game.game_pk}>
                {game.matchup} ({game.date}) - Drama: {game.drama_score}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto w-full">
        <svg width="100%" height={totalHeight + 50} className="text-white min-w-[1200px]">
          {viewMode === 'single' && selectedGame ? (
            renderSingleGameChart(selectedGame)
          ) : viewMode === 'stacked' ? (
            sortedGames.map((game, index) => renderSingleGameChart(game, index))
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
        <div 
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg pointer-events-none"
          style={{
            left: `${window.innerWidth / 2}px`,
            top: `${window.innerHeight / 2}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="text-sm">
            <div className="font-semibold text-white">
              {hoveredPoint.point.batter} - {hoveredPoint.point.event}
            </div>
            {hoveredPoint.point.pitcher && (
              <div className="text-gray-300 text-xs">
                vs {hoveredPoint.point.pitcher}
              </div>
            )}
            <div className={`font-bold ${hoveredPoint.point.wpa > 0 ? 'text-green-400' : 'text-red-400'}`}>
              WPA: {hoveredPoint.point.wpa > 0 ? '+' : ''}{(hoveredPoint.point.wpa * 100).toFixed(1)}%
            </div>
            <div className="text-gray-100 text-sm mt-1 font-semibold">
              {hoveredPoint.game.home_team || 'BOS'} Win Probability: {
                hoveredPoint.point.prev_y !== undefined 
                  ? `${(hoveredPoint.point.prev_y * 100).toFixed(1)}% → ${(hoveredPoint.point.y * 100).toFixed(1)}%`
                  : `${(hoveredPoint.point.y * 100).toFixed(1)}%`
              }
            </div>
            {hoveredPoint.point.situation && (
              <div className="text-blue-300 text-xs mt-1">
                {hoveredPoint.point.situation}
              </div>
            )}
            {hoveredPoint.point.score_context && (
              <div className="text-orange-300 text-xs mt-1">
                {hoveredPoint.point.score_context}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Cardiac Arrest (70+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span>Elevated (40-69)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Steady (20-39)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span>Flatline (0-19)</span>
        </div>
      </div>
    </div>
  );
}