"use client";

import { useRef, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import type { HealthMapEvent } from "@/types/healthMap";
import { PATIENT_ACCENT, PATIENT_GREEN, STAGE_TYPE_LABELS } from "./constants";

interface JourneyPathSVGProps {
  events: HealthMapEvent[];
  size: "compact" | "full";
  animate?: boolean;
}

export default function JourneyPathSVG({
  events,
  size,
  animate = false,
}: JourneyPathSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const [pathDrawn, setPathDrawn] = useState(!animate);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.offsetWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setPathDrawn(true), 100);
      return () => clearTimeout(timer);
    }
  }, [animate]);

  const isCompact = size === "compact";
  const svgHeight = isCompact ? 100 : 320;
  const nodeRadius = isCompact ? 6 : 14;
  const currentRadius = isCompact ? 8 : 18;
  const paddingX = isCompact ? 30 : 84;
  const amplitude = isCompact ? 15 : 44;

  if (events.length === 0) return null;

  // Calculate positions
  const positions = events.map((event, i) => {
    const x = paddingX + ((containerWidth - paddingX * 2) / Math.max(events.length - 1, 1)) * i;
    const y = svgHeight / 2 + Math.sin(i * 0.9) * amplitude;
    return { event, x, y };
  });

  // Build SVG path string
  const buildPath = () => {
    if (positions.length < 2) return "";
    let d = `M ${positions[0].x} ${positions[0].y}`;
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` Q ${cpx} ${prev.y} ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const pathD = buildPath();
  const pathLength = containerWidth * 2;

  // Find where pending events start for dashed overlay
  const firstPendingIdx = events.findIndex((e) => e.status === "pending");

  return (
    <div ref={containerRef} className="w-full relative">
      <svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${containerWidth} ${svgHeight}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="journey-bg-pattern" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={PATIENT_GREEN} stopOpacity={0.03} />
            <stop offset="100%" stopColor={PATIENT_GREEN} stopOpacity={0.06} />
          </linearGradient>
          <filter id="glow-current">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Subtle background contours (full mode only) */}
        {!isCompact && (
          <>
            {[0.15, 0.35, 0.55, 0.75, 0.95].map((ratio, i) => (
              <ellipse
                key={i}
                cx={containerWidth * ratio}
                cy={svgHeight / 2}
                rx={containerWidth * 0.12}
                ry={svgHeight * 0.35}
                fill="none"
                stroke={PATIENT_GREEN}
                strokeWidth={0.5}
                strokeOpacity={0.08}
              />
            ))}
          </>
        )}

        {/* Main path */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={PATIENT_GREEN}
            strokeWidth={isCompact ? 2.5 : 3.5}
            strokeLinecap="round"
            strokeDasharray={animate ? pathLength : undefined}
            strokeDashoffset={animate && !pathDrawn ? pathLength : 0}
            style={{
              transition: animate ? "stroke-dashoffset 1.2s ease-out" : undefined,
            }}
          />
        )}

        {/* Pending path overlay (dashed) */}
        {firstPendingIdx > 0 && (() => {
          const pendingPositions = positions.slice(firstPendingIdx - 1);
          if (pendingPositions.length < 2) return null;

          let d = `M ${pendingPositions[0].x} ${pendingPositions[0].y}`;
          for (let i = 1; i < pendingPositions.length; i++) {
            const prev = pendingPositions[i - 1];
            const curr = pendingPositions[i];
            const cpx = (prev.x + curr.x) / 2;
            d += ` Q ${cpx} ${prev.y} ${curr.x} ${curr.y}`;
          }

          return (
            <path
              d={d}
              fill="none"
              stroke={PATIENT_GREEN}
              strokeWidth={isCompact ? 2 : 3}
              strokeLinecap="round"
              strokeDasharray="6 4"
              strokeOpacity={0.4}
            />
          );
        })()}

        {/* Node circles and labels */}
        {positions.map(({ event, x, y }, i) => {
          const isCurrent = event.is_current;
          const isPending = event.status === "pending";
          const r = isCurrent ? currentRadius : nodeRadius;

          return (
            <g key={event.event_id}>
              {/* Current position glow */}
              {isCurrent && (
                <circle cx={x} cy={y} r={r + 6} fill={PATIENT_ACCENT} opacity={0.15}>
                  <animate
                    attributeName="r"
                    values={`${r + 4};${r + 8};${r + 4}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.2;0.08;0.2"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Node circle */}
              {isPending ? (
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill="none"
                  stroke={PATIENT_GREEN}
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                  strokeOpacity={0.5}
                />
              ) : (
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={isCurrent ? PATIENT_ACCENT : PATIENT_GREEN}
                  stroke="white"
                  strokeWidth={isCurrent ? 3 : 2}
                  filter={isCurrent ? "url(#glow-current)" : undefined}
                />
              )}

              {/* Full mode: icon inside current node */}
              {!isCompact && isCurrent && (
                <foreignObject x={x - 7} y={y - 7} width={14} height={14}>
                  <MapPin size={14} className="text-white" />
                </foreignObject>
              )}

              {/* Labels */}
              {isCompact ? (
                <text
                  x={x}
                  y={i % 2 === 0 ? y - r - 6 : y + r + 12}
                  textAnchor="middle"
                  className="fill-gray-600"
                  style={{ fontSize: 10 }}
                >
                  {event.title.length > 6 ? event.title.slice(0, 6) + "..." : event.title}
                </text>
              ) : (
                <foreignObject
                  x={x - 68}
                  y={i % 2 === 0 ? y - r - 58 : y + r + 12}
                  width={136}
                  height={56}
                >
                  <div className="flex flex-col items-center">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 px-2.5 py-1.5 text-center max-w-full">
                      <p className="text-xs font-semibold text-gray-700 truncate">
                        {event.title}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {STAGE_TYPE_LABELS[event.stage_type] || event.stage_type}
                      </p>
                    </div>
                    {isCurrent && (
                      <span
                        className="text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full"
                        style={{ color: PATIENT_ACCENT, backgroundColor: `${PATIENT_ACCENT}15` }}
                      >
                        当前位置
                      </span>
                    )}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
