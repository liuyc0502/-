"use client";

import { useState } from "react";
import {
  Network,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertTriangle,
  TrendingUp,
  CircleDot,
  GitBranch,
  Gauge,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { KnowledgeGraphData, KGNodeType } from "@/types/knowledgeGraph";
import { NODE_TYPE_CONFIG } from "@/components/doctor/knowledge-graph/constants";
import dynamic from "next/dynamic";
import MiniGraphPreview from "./MiniGraphPreview";
import { cardSurface, confidenceTheme, knowledgeCardTheme } from "./cardTheme";

const GraphViewer = dynamic(
  () => import("@/components/doctor/knowledge-graph/GraphViewer"),
  { ssr: false }
);
const PredictionPanel = dynamic(
  () => import("@/components/doctor/knowledge-graph/PredictionPanel"),
  { ssr: false }
);

interface KnowledgeGraphCardProps {
  data: KnowledgeGraphData;
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  let barClass = confidenceTheme.lowBar;
  let textColor = confidenceTheme.lowText;
  if (percent >= 80) {
    barClass = confidenceTheme.highBar;
    textColor = confidenceTheme.highText;
  } else if (percent >= 50) {
    barClass = confidenceTheme.midBar;
    textColor = confidenceTheme.midText;
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${confidenceTheme.track}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${textColor} w-8 text-right`}>{percent}%</span>
    </div>
  );
}

export default function KnowledgeGraphCard({ data }: KnowledgeGraphCardProps) {
  const [expanded, setExpanded] = useState(false);

  const typeCounts: Partial<Record<KGNodeType, number>> = {};
  data.nodes.forEach((n) => {
    typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
  });

  const hasPatient = !!data.patient_position?.current_nodes?.length;
  const hasPredictions = data.predictions && data.predictions.length > 0;
  const hasAnomalies = data.anomalies && data.anomalies.length > 0;

  return (
    <div className={`my-2 overflow-hidden rounded-xl border bg-white shadow-sm ${knowledgeCardTheme.border}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${cardSurface.headerBorder} ${knowledgeCardTheme.headerBg}`}>
        <div className={`flex items-center gap-2 min-w-0 ${knowledgeCardTheme.headerText}`}>
          <Network size={18} className="shrink-0" />
          <span className={`font-medium text-sm truncate ${cardSurface.textPrimary}`}>{data.query}</span>
        </div>
        <span className={`inline-flex items-center whitespace-nowrap ml-2 rounded-full border px-2.5 py-1 text-xs font-medium ${knowledgeCardTheme.badgeBg} ${knowledgeCardTheme.badgeText} ${knowledgeCardTheme.badgeBorder}`}>
          知识图谱
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Mini graph preview */}
        {!expanded && (
          <div className="rounded-lg overflow-hidden">
            <MiniGraphPreview nodes={data.nodes} edges={data.edges} />
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${knowledgeCardTheme.panelBg}`}>
            <CircleDot size={12} className={knowledgeCardTheme.iconText} />
            <span className={`text-xs ${cardSurface.textMuted}`}>节点</span>
            <span className={`text-xs font-bold ${cardSurface.textPrimary}`}>{data.nodes.length}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${knowledgeCardTheme.panelBg}`}>
            <GitBranch size={12} className={knowledgeCardTheme.iconText} />
            <span className={`text-xs ${cardSurface.textMuted}`}>关系</span>
            <span className={`text-xs font-bold ${cardSurface.textPrimary}`}>{data.edges.length}</span>
          </div>
          <div className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${knowledgeCardTheme.panelBg}`}>
            <Gauge size={12} className={knowledgeCardTheme.iconText} />
            <span className={`text-xs ${cardSurface.textMuted}`}>置信度</span>
            <div className="flex-1">
              <ConfidenceIndicator confidence={data.confidence} />
            </div>
          </div>
        </div>

        {/* Entity type pills */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(typeCounts) as [KGNodeType, number][]).map(([type, count]) => {
            const config = NODE_TYPE_CONFIG[type];
            return (
              <span
                key={type}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${config?.badgeClass || "bg-gray-100 text-gray-600"} border-current/10`}
              >
                {config?.label || type}
                <span className="font-bold">{count}</span>
              </span>
            );
          })}
        </div>

        {/* Status indicators */}
        <div className="flex flex-wrap items-center gap-2.5">
          {hasPatient && (
            <span className="inline-flex items-center gap-1 text-xs text-[#DA7756] font-medium">
              <MapPin size={12} />
              患者轨迹已映射
            </span>
          )}
          {hasPredictions && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${knowledgeCardTheme.headerText}`}>
              <TrendingUp size={12} />
              {data.predictions!.length} 条演变预测
            </span>
          )}
          {hasAnomalies && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#B65B54]">
              <AlertTriangle size={12} />
              {data.anomalies!.length} 个异常
            </span>
          )}
        </div>

        {/* Top predictions mini (collapsed only) */}
        {hasPredictions && !expanded && (
          <div className="space-y-1">
            {data.predictions!.slice(0, 2).map((pred, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 ${knowledgeCardTheme.panelBg}`}
              >
                <span className={`font-semibold ${knowledgeCardTheme.headerText}`}>{pred.target_node.label}</span>
                <span className={`${knowledgeCardTheme.iconText} ml-auto font-bold`}>
                  {Math.round(pred.probability * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${knowledgeCardTheme.headerText} hover:text-[#B85E40]`}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "收起图谱" : "展开图谱"}
        </button>
      </div>

      {/* Expanded: Graph + Predictions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`overflow-hidden border-t ${knowledgeCardTheme.badgeBorder}`}
          >
            <div className="h-[450px]">
              <GraphViewer
                nodes={data.nodes}
                edges={data.edges}
                patientPosition={data.patient_position}
                predictions={data.predictions}
                anomalies={data.anomalies}
              />
            </div>
            {(hasPredictions || hasAnomalies) && (
              <div className={`border-t ${knowledgeCardTheme.badgeBorder}`}>
                <PredictionPanel
                  predictions={data.predictions}
                  anomalies={data.anomalies}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
