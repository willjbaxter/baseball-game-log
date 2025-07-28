import React from "react";
import HardestHitChart from "@/components/HardestHitChart";
import WPALeaderboard from "@/components/WPALeaderboard";

export default function HighlightsPage() {
  return (
    <div className="container mx-auto p-6 text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Highlights</h1>
      <h2 className="text-xl font-semibold mb-2">Hardest-Hit Balls</h2>
      <HardestHitChart />
      <div className="mt-8 flex flex-col md:flex-row gap-4">
        <WPALeaderboard />
      </div>
      {/* Future panels: Best Performances, Heartbreak, etc. */}
    </div>
  );
} 