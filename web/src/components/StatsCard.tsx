"use client";

interface StatsCardProps {
  title: string;
  value: string | number;  
  subtitle?: string;
}

export default function StatsCard({ title, value, subtitle }: StatsCardProps) {
  return (
    <div className="border border-gray-700 rounded p-4 bg-gray-800/20">
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-300">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}