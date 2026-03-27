"use client";

import type { KnowledgeGraphNode, KnowledgeGraphEdge } from "@/types/knowledgeGraph";
import { NODE_TYPE_CONFIG, PATIENT_ACCENT } from "@/components/doctor/knowledge-graph/constants";

interface MiniGraphPreviewProps {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export default function MiniGraphPreview({ nodes, edges }: MiniGraphPreviewProps) {
  if (nodes.length === 0) return null;

  const height = 72;
  const padding = 16;
  const svgWidth = 400;

  const nodePositions = nodes.map((node, i) => {
    const x = padding + ((svgWidth - padding * 2) / Math.max(nodes.length - 1, 1)) * i;
    const y = height / 2 + Math.sin(i * 1.2) * 12 + (i % 2 === 0 ? -4 : 4);
    return { ...node, x, y };
  });

  const nodeMap = new Map(nodePositions.map((n) => [n.id, n]));

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="mini-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EEF2FF" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#EEF2FF" stopOpacity={0} />
        </linearGradient>
      </defs>

      <rect width={svgWidth} height={height} fill="url(#mini-bg)" rx={8} />

      {edges.map((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return null;

        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2 - 8;

        return (
          <path
            key={edge.id}
            d={`M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`}
            fill="none"
            stroke="#C7D2FE"
            strokeWidth={1}
            strokeOpacity={0.6}
          />
        );
      })}

      {nodePositions.map((node) => {
        const config = NODE_TYPE_CONFIG[node.type];
        const isPatient = node.isPatientPosition;
        const r = isPatient ? 5 : 4;

        return (
          <g key={node.id}>
            {isPatient && (
              <circle
                cx={node.x}
                cy={node.y}
                r={r + 3}
                fill="none"
                stroke={PATIENT_ACCENT}
                strokeWidth={1.5}
                strokeOpacity={0.4}
              />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={r}
              fill={isPatient ? PATIENT_ACCENT : config?.accent || "#818CF8"}
              opacity={0.85}
            />
          </g>
        );
      })}
    </svg>
  );
}
