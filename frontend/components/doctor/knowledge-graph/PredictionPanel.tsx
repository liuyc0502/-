"use client";

import { useState } from "react";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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
  let barClass = "bg-[#C7896F]";
  let textColor = "text-[#9A6048]";
  if (percent >= 70) {
    barClass = "bg-[#738C69]";
    textColor = "text-[#5A7250]";
  } else if (percent >= 40) {
    barClass = "bg-[#B88C52]";
    textColor = "text-[#916B39]";
  }

  return (
    <div className="flex items-center gap-2.5 mt-2">
      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-[#EEE5D8]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${textColor} w-10 text-right`}>{percent}%</span>
    </div>
  );
}

function AnomalyScoreBadge({ score }: { score: number }) {
  const percent = Math.round(score * 100);
  let classes = "bg-[#F3E6DA] text-[#A06848] border-[#D6B9A0]";
  if (score >= 0.7) classes = "bg-[#EFD9D3] text-[#A14C40] border-[#D0A29A]";
  else if (score >= 0.5) classes = "bg-[#F4E3DF] text-[#B05F4F] border-[#D9B2AA]";

  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold border-2 ${classes}`}>
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

  const sortedPredictions = predictions
    ? [...predictions].sort((a, b) => b.probability - a.probability)
    : [];

  const hasPredictions = sortedPredictions.length > 0;
  const hasAnomalies = anomalies && anomalies.length > 0;

  if (!hasPredictions && !hasAnomalies) {
    return (
      <div className="p-6 text-center text-sm text-gray-400">
        暂无预测和异常检测数据
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4">
      {/* Predictions Section */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-[#FCEEE8] flex items-center justify-center">
            <TrendingUp size={13} className="text-[#DA7756]" />
          </div>
          <span className="text-sm font-semibold text-gray-700">演变预测</span>
          {hasPredictions && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FCEEE8] text-[#B96345] font-medium">
              {sortedPredictions.length}
            </span>
          )}
        </div>

        {hasPredictions ? (
          <div className="space-y-2">
            {sortedPredictions.map((pred, i) => {
              const nodeConfig = NODE_TYPE_CONFIG[pred.target_node.type];
              const isExpanded = expandedPred === i;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="cursor-pointer rounded-xl border border-[#DACAB7] bg-[#F6EEDF] p-3 transition-all hover:border-[#CFBAA2] hover:shadow-[0_6px_18px_rgba(91,63,34,0.08)]"
                  onClick={() => {
                    onNodeHighlight?.(pred.target_node.id);
                    setExpandedPred(isExpanded ? null : i);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#3B3027] truncate">
                      {pred.target_node.label}
                    </span>
                    {nodeConfig && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${nodeConfig.badgeClass}`}>
                        {nodeConfig.label}
                      </span>
                    )}
                    {pred.timeframe && (
                      <span className="ml-auto shrink-0 rounded-full bg-[#EEE6DA] px-2 py-0.5 text-[10px] text-[#7A6856]">
                        {pred.timeframe}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown size={12} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight size={12} className="text-gray-400 shrink-0" />
                    )}
                  </div>

                  <ProbabilityBar probability={pred.probability} />

                  <AnimatePresence>
                    {isExpanded && pred.reasoning && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 rounded-lg border border-[#E0D1C2] bg-[#EFE5D8] p-2 text-xs leading-relaxed text-[#64564A]"
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
          <p className="text-xs text-gray-400 py-3">暂无预测数据</p>
        )}
      </div>

      {/* Anomalies Section */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${hasAnomalies ? "bg-red-100" : "bg-emerald-100"}`}>
            {hasAnomalies ? (
              <AlertTriangle size={13} className="text-red-600" />
            ) : (
              <CheckCircle2 size={13} className="text-emerald-600" />
            )}
          </div>
          <span className={`text-sm font-semibold ${hasAnomalies ? "text-gray-700" : "text-emerald-700"}`}>
            异常检测
          </span>
          {hasAnomalies && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
              {anomalies!.length}
            </span>
          )}
        </div>

        {hasAnomalies ? (
          <div className="space-y-2">
            {anomalies!.map((anomaly, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="cursor-pointer rounded-xl border border-[#DCC4BE] bg-[#F6EEDF] p-3 transition-all hover:border-[#D0ACA5] hover:shadow-[0_6px_18px_rgba(91,63,34,0.08)]"
                onClick={() => onNodeHighlight?.(anomaly.node_id)}
              >
                <div className="flex items-start gap-3">
                  <AnomalyScoreBadge score={anomaly.anomaly_score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-[#6B5A4B]">
                      <span className="rounded bg-[#EEE6DA] px-1.5 py-0.5 text-[#746251] truncate">
                        {anomaly.expected_path}
                      </span>
                      <span className="shrink-0 text-[#C6B5A3]">&rarr;</span>
                      <span className="rounded bg-[#EFD9D3] px-1.5 py-0.5 font-medium text-[#A14C40] truncate">
                        {anomaly.actual_path}
                      </span>
                    </div>
                    {anomaly.clinical_significance && (
                      <p className="mt-1.5 text-xs leading-relaxed text-[#64564A]">
                        {anomaly.clinical_significance}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-[#C8D7C5] bg-[#EEF4EC] px-3 py-3">
            <CheckCircle2 size={16} className="text-[#6E977B]" />
            <span className="text-sm text-[#5E7C65]">未检测到异常</span>
          </div>
        )}
      </div>
    </div>
  );
}
