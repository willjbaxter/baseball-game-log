"use client";
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Game {
  id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  venue: string | null;
  source: string;
}

interface WinLossSparklineProps {
  games: Game[];
}

export default function WinLossSparkline({ games }: WinLossSparklineProps) {
  // Create sparkline data showing cumulative W-L record over time
  const sortedGames = [...games].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let wins = 0;
  const sparklineData = sortedGames.map((game, index) => {
    // Determine if Red Sox won (they're always home team "BOS" in this dataset)
    const redSoxWon = game.home_score !== null && game.away_score !== null && 
                      game.home_score > game.away_score;
    
    if (redSoxWon) wins++;
    
    const winPct = index === 0 ? (redSoxWon ? 1 : 0) : wins / (index + 1);
    
    return {
      index,
      winPct: winPct * 100, // Convert to percentage for display
      date: game.date
    };
  });

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sparklineData}>
          <Line 
            type="monotone" 
            dataKey="winPct" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
            animationDuration={0}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}