"use client";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple';
}

export default function StatsCard({ title, value, subtitle, icon, color = 'blue' }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-900/20 border-blue-500/30 text-blue-400',
    green: 'bg-green-900/20 border-green-500/30 text-green-400',
    red: 'bg-red-900/20 border-red-500/30 text-red-400',
    orange: 'bg-orange-900/20 border-orange-500/30 text-orange-400',
    purple: 'bg-purple-900/20 border-purple-500/30 text-purple-400'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]} bg-gray-800/50`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-2xl opacity-60">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}