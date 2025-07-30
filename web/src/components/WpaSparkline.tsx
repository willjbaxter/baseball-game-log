import React from "react";

interface Props {
  series: number[];
  width?: number;
  height?: number;
}

export default function WpaSparkline({ series, width = 80, height = 20 }: Props) {
  if (!series || series.length === 0) return null;
  const min = Math.min(...series, 0);
  const max = Math.max(...series, 0);
  const range = max - min || 1;
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke="#4ADE80"
        strokeWidth="1.5"
        points={pts}
      />
      {/* midline */}
      <line
        x1="0"
        y1={height - ((0 - min) / range) * height}
        x2={width}
        y2={height - ((0 - min) / range) * height}
        stroke="#555"
        strokeWidth="0.5"
      />
    </svg>
  );
} 