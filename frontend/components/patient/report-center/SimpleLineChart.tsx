"use client";

import { useState, useRef, useEffect } from "react";

interface DataPoint {
  x: string;
  y: number;
  abnormal: boolean;
}

interface SimpleLineChartProps {
  dataPoints: DataPoint[];
  normalRange?: { min: number; max: number };
  unit: string;
}

const PADDING = { top: 20, right: 20, bottom: 30, left: 50 };
const HEIGHT = 120;

export function SimpleLineChart({ dataPoints, normalRange, unit }: SimpleLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: DataPoint } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (dataPoints.length === 0) return null;

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const values = dataPoints.map((d) => d.y);
  let yMin = Math.min(...values);
  let yMax = Math.max(...values);

  if (normalRange) {
    yMin = Math.min(yMin, normalRange.min);
    yMax = Math.max(yMax, normalRange.max);
  }

  // Add 10% padding to y-axis
  const yPad = (yMax - yMin) * 0.1 || 1;
  yMin -= yPad;
  yMax += yPad;

  const xScale = (i: number) => PADDING.left + (chartW / Math.max(dataPoints.length - 1, 1)) * i;
  const yScale = (v: number) => PADDING.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  const polylinePoints = dataPoints
    .map((d, i) => `${xScale(i)},${yScale(d.y)}`)
    .join(" ");

  return (
    <div ref={containerRef} className="w-full relative">
      <svg width={width} height={HEIGHT} className="select-none">
        {/* Normal range band */}
        {normalRange && (
          <rect
            x={PADDING.left}
            y={yScale(normalRange.max)}
            width={chartW}
            height={yScale(normalRange.min) - yScale(normalRange.max)}
            fill="#dcfce7"
            opacity={0.5}
          />
        )}

        {/* Grid lines (3 horizontal) */}
        {[0, 0.5, 1].map((t) => {
          const yVal = yMin + (yMax - yMin) * t;
          const yPos = yScale(yVal);
          return (
            <g key={t}>
              <line x1={PADDING.left} y1={yPos} x2={width - PADDING.right} y2={yPos} stroke="#e5e7eb" strokeDasharray="3,3" />
              <text x={PADDING.left - 6} y={yPos + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
                {yVal.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Data points */}
        {dataPoints.map((d, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.y)}
            r={4}
            fill={d.abnormal ? "#ef4444" : "#22c55e"}
            stroke="white"
            strokeWidth={2}
            className="cursor-pointer"
            onMouseEnter={(e) => {
              const rect = (e.target as SVGCircleElement).getBoundingClientRect();
              const containerRect = containerRef.current?.getBoundingClientRect();
              if (containerRect) {
                setTooltip({
                  x: rect.left - containerRect.left + rect.width / 2,
                  y: rect.top - containerRect.top - 8,
                  point: d,
                });
              }
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {/* X-axis labels */}
        {dataPoints.map((d, i) => (
          <text
            key={i}
            x={xScale(i)}
            y={HEIGHT - 4}
            textAnchor="middle"
            fontSize={9}
            fill="#9ca3af"
          >
            {d.x.slice(5)}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap z-10"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltip.point.x} | {tooltip.point.y} {unit}
        </div>
      )}
    </div>
  );
}
