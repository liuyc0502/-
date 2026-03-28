"use client";

import { useMemo, useRef, useState } from "react";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { exportToPdf } from "@/lib/exportPdf";
import type { ConsultationReportData } from "@/types/consultation";
import { cardSurface, confidenceTheme, consultationCardTheme } from "./cardTheme";

const InteractiveChart = dynamic(
  () => import("@/components/consultation/InteractiveChart"),
  { ssr: false, loading: () => <div className="h-60 animate-pulse rounded bg-gray-50" /> }
);

interface ConsultationReportCardProps {
  data: ConsultationReportData;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence);
  let barColor = confidenceTheme.lowBar;
  let textColor = confidenceTheme.lowText;
  if (percent >= 80) {
    barColor = confidenceTheme.highBar;
    textColor = confidenceTheme.highText;
  } else if (percent >= 50) {
    barColor = confidenceTheme.midBar;
    textColor = confidenceTheme.midText;
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium ${textColor}`}>综合置信度</span>
      <div className={`flex-1 h-2 rounded-full overflow-hidden ${confidenceTheme.track}`}>
        <div
          className={`h-full ${barColor} rounded-full transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-sm font-semibold ${textColor}`}>{percent}%</span>
    </div>
  );
}

// Convergence line chart for the final report
function ConvergenceChart({
  history,
}: {
  history: { round: number; consensus_score: number; entropy: number }[];
}) {
  const width = 280;
  const height = 60;
  const padding = { top: 8, right: 12, bottom: 16, left: 28 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  if (history.length < 1) return null;

  const maxRound = history.length;
  const getX = (i: number) => padding.left + (maxRound === 1 ? chartW / 2 : (i / (maxRound - 1)) * chartW);
  const getY = (val: number) => padding.top + (1 - val) * chartH;

  const ccsPoints = history.map((h, i) => `${getX(i)},${getY(h.consensus_score)}`).join(" ");
  const entropyPoints = history.map((h, i) => `${getX(i)},${getY(1 - h.entropy)}`).join(" ");

  const finalCCS = history[history.length - 1].consensus_score;
  const initialEntropy = history[0].entropy;
  const finalEntropy = history[history.length - 1].entropy;
  const entropyReduction = initialEntropy - finalEntropy;

  return (
    <div>
      <svg width={width} height={height} className={`rounded ${consultationCardTheme.panelBg}`}>
        {/* Y-axis labels */}
        <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" className="text-[8px] fill-gray-400" style={{ fontFamily: "sans-serif" }}>100%</text>
        <text x={padding.left - 4} y={padding.top + chartH + 2} textAnchor="end" className="text-[8px] fill-gray-400" style={{ fontFamily: "sans-serif" }}>0%</text>

        {/* Threshold line */}
        <line
          x1={padding.left} y1={getY(0.85)}
          x2={width - padding.right} y2={getY(0.85)}
          stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="3,3"
        />

        {/* Entropy line (inverted, dashed) */}
        {history.length > 1 && (
          <polyline
            fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2"
            strokeLinejoin="round" points={entropyPoints}
          />
        )}

        {/* CCS line */}
        {history.length > 1 ? (
          <polyline
            fill="none" stroke="#DA7756" strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round"
            points={ccsPoints}
          />
        ) : (
          <circle cx={getX(0)} cy={getY(history[0].consensus_score)} r="3" fill="#DA7756" />
        )}

        {/* Data points */}
        {history.map((h, i) => (
          <circle key={i} cx={getX(i)} cy={getY(h.consensus_score)} r="2" fill="#DA7756" />
        ))}

        {/* X-axis round labels */}
        {history.map((h, i) => (
          <text key={i} x={getX(i)} y={height - 2} textAnchor="middle" className="text-[8px] fill-gray-400" style={{ fontFamily: "sans-serif" }}>
            R{h.round}
          </text>
        ))}
      </svg>
      <div className="flex items-center gap-3 mt-1">
        <div className="flex items-center gap-1">
        <div className="w-3 h-0.5 rounded bg-[#DA7756]" />
          <span className="text-[10px] text-gray-500">共识分数</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-gray-400 rounded" style={{ borderBottom: "1px dashed" }} />
          <span className="text-[10px] text-gray-500">意见统一度</span>
        </div>
      </div>
      <div className="flex gap-3 mt-1.5 text-[10px] text-gray-500">
        <span>最终共识: <span className="font-medium text-gray-700">{Math.round(finalCCS * 100)}%</span></span>
        <span>熵减少: <span className="font-medium text-gray-700">{entropyReduction > 0 ? "+" : ""}{(entropyReduction * 100).toFixed(1)}%</span></span>
      </div>
    </div>
  );
}

function RichOpinionContent({ text }: { text: string }) {
  const segments = useMemo(() => {
    const result: { type: "text" | "chart"; content: string }[] = [];
    const seenCharts = new Set<string>();
    const pushChart = (content: string) => {
      try {
        const parsed = JSON.parse(content);
        if (!(parsed && (parsed.chart_type || parsed.type === "chart") && parsed.data)) {
          return false;
        }
        const normalized = JSON.stringify(parsed);
        if (seenCharts.has(normalized)) {
          return true;
        }
        seenCharts.add(normalized);
        result.push({ type: "chart", content });
        return true;
      } catch {
        return false;
      }
    };

    const blockRegex = /```(?:chart|json)\s*\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      if (!pushChart(match[1].trim())) {
        result.push({ type: "text", content: match[0] });
      }
      lastIndex = match.index + match[0].length;
    }

    const remaining = text.slice(lastIndex);
    const chartJsonRegex = /\{"type"\s*:\s*"chart"[\s\S]*?"chart_type"\s*:\s*"[^"]*"[\s\S]*?"data"\s*:\s*\[[\s\S]*?\]\s*[,\s\S]*?\}/g;
    let inlineLastIndex = 0;
    let inlineMatch;

    while ((inlineMatch = chartJsonRegex.exec(remaining)) !== null) {
      if (inlineMatch.index > inlineLastIndex) {
        result.push({ type: "text", content: remaining.slice(inlineLastIndex, inlineMatch.index) });
      }
      if (!pushChart(inlineMatch[0])) {
        result.push({ type: "text", content: inlineMatch[0] });
      }
      inlineLastIndex = inlineMatch.index + inlineMatch[0].length;
    }

    if (inlineLastIndex < remaining.length) {
      result.push({ type: "text", content: remaining.slice(inlineLastIndex) });
    } else if (lastIndex < text.length && inlineLastIndex === 0) {
      result.push({ type: "text", content: remaining });
    }

    return result;
  }, [text]);

  const hasChart = segments.some((segment) => segment.type === "chart");
  if (!hasChart) {
    return <p className={`text-xs ${cardSurface.textSecondary}`}>{text}</p>;
  }

  return (
    <div className="space-y-2">
      {segments.map((segment, idx) => {
        if (segment.type === "chart") {
          try {
            return <InteractiveChart key={idx} spec={JSON.parse(segment.content)} />;
          } catch {
            return <p key={idx} className={`text-xs ${cardSurface.textSecondary}`}>{segment.content}</p>;
          }
        }
        return segment.content.trim() ? (
          <p key={idx} className={`text-xs ${cardSurface.textSecondary}`}>{segment.content}</p>
        ) : null;
      })}
    </div>
  );
}

export default function ConsultationReportCard({
  data,
}: ConsultationReportCardProps) {
  const [showSpecialists, setShowSpecialists] = useState(false);
  const [showConvergence, setShowConvergence] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    if (!reportRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      await exportToPdf(reportRef.current, `会诊报告_${date}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div ref={reportRef} className={`my-3 overflow-hidden rounded-xl border bg-white shadow-sm ${consultationCardTheme.border}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${cardSurface.headerBorder} ${consultationCardTheme.headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className={consultationCardTheme.accent} />
            <h3 className={`text-sm font-semibold ${cardSurface.textPrimary}`}>
              会诊结论报告
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${cardSurface.textSecondary}`}>
              共 {data.total_rounds} 轮讨论 · {data.specialists?.length || 0} 位专家
            </span>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors disabled:opacity-50 ${cardSurface.textSecondary} ${cardSurface.hoverTextPrimary} ${cardSurface.hoverSoftBg}`}
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              导出 PDF
            </button>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className={`px-4 py-3 border-b ${cardSurface.sectionBorder}`}>
        <ConfidenceBar confidence={data.confidence} />
      </div>

      {/* Final recommendation */}
      <div className={`px-4 py-3 border-b ${cardSurface.sectionBorder}`}>
        <h4 className={`text-xs font-semibold mb-1.5 ${cardSurface.textPrimary}`}>
          最终推荐方案
        </h4>
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${cardSurface.textPrimary}`}>
          {data.final_recommendation}
        </p>
      </div>

      {/* Agreements & Disagreements */}
      <div className={`px-4 py-3 grid grid-cols-1 gap-3 border-b md:grid-cols-2 ${cardSurface.sectionBorder}`}>
        {/* Agreements */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 size={14} className={consultationCardTheme.successText} />
            <h4 className={`text-xs font-semibold ${consultationCardTheme.successText}`}>
              共识点
            </h4>
          </div>
          {data.agreements && data.agreements.length > 0 ? (
            <ul className="space-y-1">
              {data.agreements.map((item, idx) => (
                <li
                  key={idx}
                  className={`rounded px-2 py-1 text-xs ${consultationCardTheme.successBg} ${consultationCardTheme.successText}`}
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-xs ${cardSurface.textMuted}`}>暂无共识点</p>
          )}
        </div>

        {/* Disagreements */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={14} className={consultationCardTheme.warningText} />
            <h4 className={`text-xs font-semibold ${consultationCardTheme.warningText}`}>
              分歧点
            </h4>
          </div>
          {data.disagreements && data.disagreements.length > 0 ? (
            <ul className="space-y-1">
              {data.disagreements.map((item, idx) => (
                <li
                  key={idx}
                  className={`rounded px-2 py-1 text-xs ${consultationCardTheme.warningBg} ${consultationCardTheme.warningText}`}
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-xs ${cardSurface.textMuted}`}>无分歧</p>
          )}
        </div>
      </div>

      {/* Convergence history (collapsible) */}
      {data.consensus_history && data.consensus_history.length > 0 && (
        <div className={`px-4 py-2 border-b ${cardSurface.sectionBorder}`}>
          <button
            onClick={() => setShowConvergence(!showConvergence)}
            className={`flex items-center gap-1.5 text-xs transition-colors ${cardSurface.textSecondary} ${cardSurface.hoverTextPrimary}`}
          >
            {showConvergence ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            <span>收敛过程</span>
          </button>
          {showConvergence && (
            <div className="mt-2">
              <ConvergenceChart history={data.consensus_history} />
            </div>
          )}
        </div>
      )}

      {/* Specialist opinions (collapsible) */}
      <div className="px-4 py-2">
        <button
          onClick={() => setShowSpecialists(!showSpecialists)}
          className={`flex items-center gap-1.5 text-xs transition-colors ${cardSurface.textSecondary} ${cardSurface.hoverTextPrimary}`}
        >
          {showSpecialists ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
          <Users size={12} />
          <span>各专家最终意见</span>
        </button>

        {showSpecialists && data.specialists && (
          <div className="mt-2 space-y-2">
            {data.specialists.map((specialist, idx) => (
              <div
                key={idx}
                className={`rounded border p-2 ${consultationCardTheme.panelBg} ${consultationCardTheme.panelBorder}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${cardSurface.textPrimary}`}>
                    {specialist.name}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-xs ${cardSurface.softBg} ${cardSurface.textSecondary}`}>
                    {specialist.specialty}
                  </span>
                </div>
                <RichOpinionContent text={specialist.final_opinion} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
