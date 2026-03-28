"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PredictionPath, TrajectoryAnomaly } from "@/types/knowledgeGraph";
import { NODE_TYPE_CONFIG } from "./constants";

interface PredictionPanelProps {
  predictions?: PredictionPath[];
  anomalies?: TrajectoryAnomaly[];
  onNodeHighlight?: (nodeId: string) => void;
}

function ProbabilityBar({ probability }: { probability: number }) {
  const percent = Math.round(probability * 100);
  let barClass = "bg-[#E2A18A]";
  let textColor = "text-[#A76652]";
  if (percent >= 70) {
    barClass = "bg-[#8DB592]";
    textColor = "text-[#5B7460]";
  } else if (percent >= 40) {
    barClass = "bg-[#DFB16A]";
    textColor = "text-[#95703D]";
  }

  return (
    <div className="mt-2 flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF0F3]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`w-10 text-right text-xs font-bold ${textColor}`}>{percent}%</span>
    </div>
  );
}

function AnomalyScoreBadge({ score }: { score: number }) {
  const percent = Math.round(score * 100);
  let classes = "border-[#EED8C8] bg-[#FEF7F1] text-[#A76652]";
  if (score >= 0.7) classes = "border-[#E8C7C1] bg-[#FDF1EF] text-[#A14C40]";
  else if (score >= 0.5) classes = "border-[#EDCEC7] bg-[#FDF5F2] text-[#B05F4F]";

  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold ${classes}`}
    >
      {percent}%
    </span>
  );
}

export default function PredictionPanel({
  predictions,
  anomalies,
  onNodeHighlight,
}: PredictionPanelProps) {
  const [expandedPred, setExpandedPred] = useState<number | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<"predictions" | "anomalies" | null>(null);

  const sortedPredictions = useMemo(
    () => (predictions ? [...predictions].sort((a, b) => b.probability - a.probability) : []),
    [predictions]
  );

  const predictionPreview = sortedPredictions.slice(0, 2);
  const anomalyPreview = (anomalies || []).slice(0, 2);
  const hasPredictions = sortedPredictions.length > 0;
  const hasAnomalies = !!anomalies && anomalies.length > 0;

  if (!hasPredictions && !hasAnomalies) {
    return <div className="py-2 text-sm text-gray-400">暂无预测和异常检测数据</div>;
  }

  return (
    <div className="relative overflow-visible">
      <AnimatePresence>
        {expandedPanel && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-[calc(100%+12px)] left-0 right-0 z-30"
          >
            <div className="mx-auto max-w-4xl rounded-3xl border border-[#E7E7E7] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-[#EEF0F3] px-5 py-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      expandedPanel === "predictions"
                        ? "bg-[#FFF3EA] text-[#DA7756]"
                        : hasAnomalies
                          ? "bg-[#FDF1EF] text-[#B45046]"
                          : "bg-[#EEF4EC] text-[#5E7C65]"
                    }`}
                  >
                    {expandedPanel === "predictions" ? (
                      <TrendingUp size={16} />
                    ) : hasAnomalies ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      {expandedPanel === "predictions" ? "演变预测" : "异常检测"}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">
                      {expandedPanel === "predictions"
                        ? `${sortedPredictions.length} 条预测结果`
                        : hasAnomalies
                          ? `${anomalies!.length} 条异常结果`
                          : "未检测到异常"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedPanel(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#4B5563]"
                  aria-label="关闭扩展面板"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[58vh] overflow-y-auto px-5 py-4">
                {expandedPanel === "predictions" ? (
                  hasPredictions ? (
                    <div className="space-y-3">
                      {sortedPredictions.map((pred, i) => {
                        const nodeConfig = NODE_TYPE_CONFIG[pred.target_node.type];
                        const isExpanded = expandedPred === i;

                        return (
                          <motion.div
                            key={`${pred.target_node.id}-${i}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="cursor-pointer rounded-2xl border border-[#E7E7E7] bg-white p-4 transition-all hover:border-[#D9DCE1] hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
                            onClick={() => {
                              onNodeHighlight?.(pred.target_node.id);
                              setExpandedPred(isExpanded ? null : i);
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-[#1F2937] break-words">
                                    {pred.target_node.label}
                                  </span>
                                  {nodeConfig && (
                                    <span
                                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${nodeConfig.badgeClass}`}
                                    >
                                      {nodeConfig.label}
                                    </span>
                                  )}
                                  {pred.timeframe && (
                                    <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] text-[#6B7280]">
                                      {pred.timeframe}
                                    </span>
                                  )}
                                </div>
                                <ProbabilityBar probability={pred.probability} />
                              </div>
                              {isExpanded ? (
                                <ChevronDown size={14} className="mt-0.5 shrink-0 text-gray-400" />
                              ) : (
                                <ChevronRight size={14} className="mt-0.5 shrink-0 text-gray-400" />
                              )}
                            </div>

                            <AnimatePresence>
                              {isExpanded && pred.reasoning && (
                                <motion.p
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-3 overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-xs leading-relaxed text-[#4B5563] break-words"
                                >
                                  {pred.reasoning}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="py-4 text-sm text-gray-400">暂无预测数据</p>
                  )
                ) : hasAnomalies ? (
                  <div className="space-y-3">
                    {anomalies!.map((anomaly, i) => (
                      <motion.div
                        key={`${anomaly.node_id}-${i}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="cursor-pointer rounded-2xl border border-[#E7E7E7] bg-white p-4 transition-all hover:border-[#D9DCE1] hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
                        onClick={() => onNodeHighlight?.(anomaly.node_id)}
                      >
                        <div className="flex items-start gap-3">
                          <AnomalyScoreBadge score={anomaly.anomaly_score} />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5">
                              <p className="text-[10px] font-semibold tracking-[0.04em] text-[#94A3B8]">
                                预期路径
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-[#475569] break-words">
                                {anomaly.expected_path}
                              </p>
                            </div>
                            <div className="rounded-xl bg-[#FDF1EF] px-3 py-2.5">
                              <p className="text-[10px] font-semibold tracking-[0.04em] text-[#D17A66]">
                                实际路径
                              </p>
                              <p className="mt-1 text-xs font-medium leading-relaxed text-[#A14C40] break-words">
                                {anomaly.actual_path}
                              </p>
                            </div>
                            {anomaly.clinical_significance && (
                              <p className="text-xs leading-relaxed text-[#4B5563] break-words">
                                {anomaly.clinical_significance}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-[#C8D7C5] bg-[#EEF4EC] px-4 py-4">
                    <CheckCircle2 size={16} className="text-[#6E977B]" />
                    <span className="text-sm text-[#5E7C65]">未检测到异常</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E7E7E7] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#FEF4EF]">
                  <TrendingUp size={14} className="text-[#DA7756]" />
                </div>
                <p className="text-sm font-semibold text-[#111827]">演变预测</p>
                <span className="rounded-full bg-[#FFF3EA] px-1.5 py-0.5 text-[10px] font-medium text-[#C06E4E]">
                  {sortedPredictions.length}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#9CA3AF]">底部只显示摘要，点击上方展开完整预测</p>
            </div>
            {hasPredictions && (
              <button
                type="button"
                onClick={() => setExpandedPanel("predictions")}
                className="rounded-full border border-[#F0D3C0] bg-[#FFF3EA] px-3 py-1 text-xs font-medium text-[#C06E4E] transition-colors hover:bg-[#FFEBDD]"
              >
                展开
              </button>
            )}
          </div>

          {hasPredictions ? (
            <div className="mt-3 space-y-2">
              {predictionPreview.map((pred, i) => (
                <button
                  key={`${pred.target_node.id}-${i}`}
                  type="button"
                  onClick={() => onNodeHighlight?.(pred.target_node.id)}
                  className="block w-full rounded-xl border border-[#EEF0F3] bg-[#FCFCFC] px-3 py-2.5 text-left transition-colors hover:border-[#D9DCE1] hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-[#1F2937]">
                      {pred.target_node.label}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-[#C06E4E]">
                      {Math.round(pred.probability * 100)}%
                    </span>
                  </div>
                  {pred.timeframe && (
                    <p className="mt-1 text-[11px] text-[#9CA3AF]">{pred.timeframe}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-400">暂无预测数据</p>
          )}
        </div>

        <div className="rounded-2xl border border-[#E7E7E7] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-xl ${
                    hasAnomalies ? "bg-[#FDF1EF]" : "bg-[#EEF4EC]"
                  }`}
                >
                  {hasAnomalies ? (
                    <AlertTriangle size={14} className="text-[#B45046]" />
                  ) : (
                    <CheckCircle2 size={14} className="text-[#5E7C65]" />
                  )}
                </div>
                <p className="text-sm font-semibold text-[#111827]">异常检测</p>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    hasAnomalies
                      ? "bg-[#FDF1EF] text-[#B45046]"
                      : "bg-[#EEF4EC] text-[#5E7C65]"
                  }`}
                >
                  {anomalies?.length || 0}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#9CA3AF]">超出底部空间时，结果会向上展开查看</p>
            </div>
            <button
              type="button"
              onClick={() => setExpandedPanel("anomalies")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                hasAnomalies
                  ? "border-[#E7C8C8] bg-[#FDF1EF] text-[#B45046] hover:bg-[#FBE6E3]"
                  : "border-[#C8D7C5] bg-[#EEF4EC] text-[#5E7C65] hover:bg-[#E4F0E2]"
              }`}
            >
              {hasAnomalies ? "展开" : "查看状态"}
            </button>
          </div>

          {hasAnomalies ? (
            <div className="mt-3 space-y-2">
              {anomalyPreview.map((anomaly, i) => (
                <button
                  key={`${anomaly.node_id}-${i}`}
                  type="button"
                  onClick={() => onNodeHighlight?.(anomaly.node_id)}
                  className="block w-full rounded-xl border border-[#EEF0F3] bg-[#FCFCFC] px-3 py-2.5 text-left transition-colors hover:border-[#D9DCE1] hover:bg-white"
                >
                  <div className="flex items-start gap-2">
                    <AnomalyScoreBadge score={anomaly.anomaly_score} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-[#94A3B8]">{anomaly.expected_path}</p>
                      <p className="mt-1 text-sm font-medium text-[#A14C40] break-words">
                        {anomaly.actual_path}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#C8D7C5] bg-[#EEF4EC] px-3 py-3">
              <CheckCircle2 size={16} className="text-[#6E977B]" />
              <span className="text-sm text-[#5E7C65]">未检测到异常</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
