"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Brain,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Clock,
  TrendingUp,
  Target,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import type { ConsultationState, ConsultationSchedulingData } from "@/types/consultation";
import dynamic from "next/dynamic";
import { cardSurface, confidenceTheme, consultationCardTheme } from "./cardTheme";

const InteractiveChart = dynamic(
  () => import("@/components/consultation/InteractiveChart"),
  { ssr: false, loading: () => <div className="h-60 bg-gray-50 animate-pulse rounded" /> }
);

const Diagram = dynamic(
  () => import("@/components/ui/Diagram").then((mod) => mod.Diagram),
  { ssr: false, loading: () => <div className="h-40 bg-gray-50 animate-pulse rounded" /> }
);
interface ConsultationCardProps {
  data: ConsultationState;
}

// Expandable text component - shows truncated text with expand/collapse toggle
function ExpandableText({
  text,
  lines = 3,
  className = "",
}: {
  text: string;
  lines?: number;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <p
        className={`${className} ${!isExpanded ? `line-clamp-${lines}` : ""}`}
        style={!isExpanded ? { WebkitLineClamp: lines, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
      >
        {text}
      </p>
      <button
        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
        className="mt-0.5 cursor-pointer text-xs text-[#DA7756] hover:text-[#C46B4D]"
      >
        {isExpanded ? "收起" : "展开全部"}
      </button>
    </div>
  );
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
      <div className={`flex-1 h-1.5 overflow-hidden rounded-full ${confidenceTheme.track}`}>
        <div
          className={`h-full ${barColor} rounded-full transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{percent}%</span>
    </div>
  );
}

function ConsensusLevelBadge({
  level,
}: {
  level: string;
}) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    full: { bg: consultationCardTheme.successBg, text: consultationCardTheme.successText, label: "完全共识" },
    partial: { bg: consultationCardTheme.warningBg, text: consultationCardTheme.warningText, label: "部分共识" },
    divergent: { bg: consultationCardTheme.dangerBg, text: consultationCardTheme.dangerText, label: "存在分歧" },
  };
  const c = config[level] || config.divergent;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

// Circular consensus gauge showing CCS as a percentage
function ConsensusGauge({ score, label }: { score: number; label: string }) {
  const percent = Math.round(score * 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;

  let strokeColor = "#D97A70";
  let textColor = confidenceTheme.lowText;
  if (percent >= 85) {
    strokeColor = "#7EB48D";
    textColor = confidenceTheme.highText;
  } else if (percent >= 55) {
    strokeColor = "#E0B35F";
    textColor = confidenceTheme.midText;
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="68" height="68" className="-rotate-90">
        <circle cx="34" cy="34" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="34" cy="34" r={radius} fill="none"
          stroke={strokeColor} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: 68, height: 68 }}>
        <span className={`text-sm font-bold ${textColor}`}>{percent}%</span>
      </div>
      <span className={`mt-0.5 text-xs ${cardSurface.textMuted}`}>{label}</span>
    </div>
  );
}

// SVG sparkline showing CCS trend across rounds
function ConvergenceSparkline({
  history,
}: {
  history: { round: number; score: number }[];
}) {
  if (history.length < 2) return null;

  const width = 140;
  const height = 36;
  const padding = 4;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const maxRound = history.length;
  const points = history.map((h, i) => {
    const x = padding + (i / (maxRound - 1)) * chartW;
    const y = padding + (1 - h.score) * chartH;
    return `${x},${y}`;
  });

  const lastPoint = history[history.length - 1];
  const lastX = padding + ((history.length - 1) / (maxRound - 1)) * chartW;
  const lastY = padding + (1 - lastPoint.score) * chartH;

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1 mb-0.5">
        <TrendingUp size={10} className={consultationCardTheme.accent} />
        <span className={`text-xs ${cardSurface.textMuted}`}>收敛趋势</span>
      </div>
      <svg width={width} height={height} className={`rounded ${cardSurface.softBg}`}>
        {/* Threshold line at 85% */}
        <line
          x1={padding} y1={padding + (1 - 0.85) * chartH}
          x2={width - padding} y2={padding + (1 - 0.85) * chartH}
          stroke="#d1d5db" strokeWidth="1" strokeDasharray="3,3"
        />
        {/* Trend line */}
        <polyline
          fill="none" stroke="#DA7756" strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round"
          points={points.join(" ")}
        />
        {/* Current point */}
        <circle cx={lastX} cy={lastY} r="2.5" fill="#DA7756" />
      </svg>
    </div>
  );
}

// Scheduling recommendation banner
function SchedulingBanner({ scheduling }: { scheduling: ConsultationSchedulingData }) {
  const configs: Record<string, { bg: string; border: string; icon: typeof Target; iconColor: string }> = {
    converged: { bg: consultationCardTheme.successBg, border: "border-[#CDE5DB]", icon: CheckCircle2, iconColor: consultationCardTheme.successText },
    progressing: { bg: consultationCardTheme.infoBg, border: consultationCardTheme.infoBorder, icon: TrendingUp, iconColor: consultationCardTheme.infoText },
    focused_debate: { bg: consultationCardTheme.warningBg, border: "border-[#F0D29A]", icon: Target, iconColor: consultationCardTheme.warningText },
    stagnated: { bg: consultationCardTheme.dangerBg, border: "border-[#F0C9C4]", icon: AlertTriangle, iconColor: consultationCardTheme.dangerText },
  };
  const config = configs[scheduling.strategy] || configs.progressing;
  const Icon = config.icon;

  return (
    <div className={`mt-1.5 p-1.5 rounded border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-1.5">
        <Icon size={12} className={`${config.iconColor} mt-0.5 flex-shrink-0`} />
        <p className={`text-xs ${cardSurface.textPrimary}`}>{scheduling.recommendation}</p>
      </div>
    </div>
  );
}

// Opinion cluster badges
function ClusterBadges({ clusters }: { clusters: string[][] }) {
  const colors = [
    "bg-[#EEF5FF] text-[#4D79CB]",
    "bg-[#FFF4E3] text-[#A36C22]",
    "bg-[#FFE8D9] text-[#BF6D4E]",
    "bg-[#EAF5F1] text-[#4A8B69]",
  ];
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {clusters.map((cluster, idx) => (
        <div key={idx} className="flex items-center gap-0.5">
          {cluster.map((name) => (
            <span
              key={name}
              className={`text-xs px-1.5 py-0.5 rounded-full ${colors[idx % colors.length]}`}
            >
              {name}
            </span>
          ))}
          {idx < clusters.length - 1 && (
            <span className="text-xs text-gray-400 mx-0.5">vs</span>
          )}
        </div>
      ))}
    </div>
  );
}

// Parse opinion text for chart JSON (from generate_chart tool) and Mermaid blocks
function RichOpinionContent({ text }: { text: string }) {
  const segments = useMemo(() => {
    const result: { type: "text" | "chart" | "mermaid"; content: string }[] = [];
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

    // Match ```mermaid blocks and ```json/```chart blocks containing chart specs
    const blockRegex = /```(mermaid|chart|json)\s*\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
      // Add text before this block
      if (match.index > lastIndex) {
        result.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }

      const lang = match[1];
      const content = match[2].trim();

      if (lang === "mermaid") {
        result.push({ type: "mermaid", content });
      } else {
        if (!pushChart(content)) {
          result.push({ type: "text", content: match[0] });
        }
      }

      lastIndex = match.index + match[0].length;
    }

    // Also detect inline chart JSON from generate_chart tool results
    // Pattern: {"type": "chart", "chart_type": ...}
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

  // If no special blocks found, return simple text
  const hasSpecial = segments.some((s) => s.type !== "text");
  if (!hasSpecial) {
    return <ExpandableText text={text} lines={4} className={`text-sm ${cardSurface.textSecondary}`} />;
  }

  return (
    <div className="space-y-2">
      {segments.map((seg, idx) => {
        if (seg.type === "mermaid") {
          return <Diagram key={idx} code={seg.content} />;
        }
        if (seg.type === "chart") {
          try {
            const spec = JSON.parse(seg.content);
            return <InteractiveChart key={idx} spec={spec} />;
          } catch {
            return <ExpandableText key={idx} text={seg.content} lines={4} className={`text-sm ${cardSurface.textSecondary}`} />;
          }
        }
        return seg.content.trim() ? (
          <ExpandableText key={idx} text={seg.content} lines={4} className={`text-sm ${cardSurface.textSecondary}`} />
        ) : null;
      })}
    </div>
  );
}

// Specialist agent panel showing their reasoning steps and opinion
function SpecialistPanel({
  name,
  specialty,
  steps,
  opinions,
  currentRound,
  isActive,
}: {
  name: string;
  specialty: string;
  steps: any[];
  opinions: Record<number, any>;
  currentRound: number;
  isActive: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const latestOpinion = opinions[currentRound];
  const recentSteps = steps.slice(-3); // Show last 3 steps

  return (
    <div className={`overflow-hidden rounded-lg border bg-white ${cardSurface.baseBorder}`}>
      {/* Agent header */}
      <div
        className={`flex cursor-pointer items-center justify-between px-3 py-2 ${cardSurface.softBg}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Brain size={16} className={consultationCardTheme.accent} />
          <span className={`text-base font-medium ${cardSurface.textPrimary}`}>{name}</span>
          <span className={`rounded px-1.5 py-0.5 text-sm ${consultationCardTheme.warningBg} ${consultationCardTheme.warningText}`}>
            {specialty}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && !latestOpinion && (
            <Loader2 size={12} className={`animate-spin ${consultationCardTheme.infoText}`} />
          )}
          {latestOpinion && (
            <CheckCircle2 size={12} className={consultationCardTheme.successText} />
          )}
          {expanded ? (
            <ChevronDown size={14} className="text-gray-400" />
          ) : (
            <ChevronRight size={14} className="text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 py-2 space-y-2">
          {/* Recent reasoning steps */}
          {recentSteps.length > 0 && (
            <div className="space-y-1">
              {recentSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 text-xs ${cardSurface.textSecondary}`}
                >
                  <div
                    className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      step.type === "thinking"
                        ? "bg-[#7FA4E7]"
                        : step.type === "tool_use"
                        ? "bg-[#E0B35F]"
                        : "bg-[#7EB48D]"
                    }`}
                  />
                  <ExpandableText text={step.step} lines={2} className={`text-sm ${cardSurface.textSecondary}`} />
                </div>
              ))}
            </div>
          )}

          {/* Opinion / conclusion */}
          {latestOpinion && (
            <div className={`mt-2 rounded border p-2 ${consultationCardTheme.panelBg} ${consultationCardTheme.panelBorder}`}>
              <p className={`mb-1 text-sm font-medium ${cardSurface.textPrimary}`}>
                结论:
              </p>
              <RichOpinionContent text={latestOpinion.conclusion} />
              <div className="mt-1.5">
                <ConfidenceBar confidence={latestOpinion.confidence} />
              </div>
              {latestOpinion.agrees_with?.length > 0 && (
                <p className={`mt-1 text-sm ${consultationCardTheme.successText}`}>
                  同意: {latestOpinion.agrees_with.join(", ")}
                </p>
              )}
              {latestOpinion.disagrees_with?.length > 0 && (
                <p className={`mt-1 text-sm ${consultationCardTheme.warningText}`}>
                  质疑: {latestOpinion.disagrees_with.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Loading state */}
          {isActive && !latestOpinion && recentSteps.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
              <Loader2 size={12} className="animate-spin" />
              <span>等待分析中...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConsultationCard({ data }: ConsultationCardProps) {

  return (
    <div className={`my-3 overflow-hidden rounded-xl border bg-white shadow-sm ${consultationCardTheme.border}`}>
      {/* Header */}
      <div className={`border-b px-4 py-3 ${cardSurface.headerBorder} ${consultationCardTheme.headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} className={consultationCardTheme.accent} />
            <h3 className={`text-base font-semibold ${cardSurface.textPrimary}`}>
              多学科会诊
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-sm ${cardSurface.softBg} ${cardSurface.textSecondary}`}>
              第 {data.current_round} 轮 / 共 {data.max_rounds} 轮
            </span>
            {data.isComplete && (
              <span className={`rounded-full px-2 py-0.5 text-sm ${consultationCardTheme.successBg} ${consultationCardTheme.successText}`}>
                已完成
              </span>
            )}
          </div>
        </div>
        <p className={`mt-1 line-clamp-2 text-sm ${cardSurface.textSecondary}`}>
          {data.question}
        </p>
        {/* Attachment thumbnails */}
        {data.attachments && data.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors ${cardSurface.softBg} ${cardSurface.baseBorder} ${cardSurface.textSecondary} hover:border-[#E6BDA8]`}
              >
                {att.type === "image" ? (
                  <ImageIcon size={12} className={consultationCardTheme.accent} />
                ) : (
                  <span className="w-3 h-3 bg-gray-300 rounded text-[8px] flex items-center justify-center font-bold text-white">F</span>
                )}
                <span className="truncate max-w-[120px]">{att.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Body: Specialists panel + Consensus panel */}
      <div className="flex flex-col lg:flex-row">
        {/* Left: Specialist agents */}
        <div className={`flex-1 space-y-2 border-r p-3 ${cardSurface.sectionBorder}`}>
          {data.specialists.map((specialist, index) => (
            <SpecialistPanel
              key={`${specialist.name}_${index}`}
              name={specialist.name}
              specialty={specialist.specialty}
              steps={data.agentSteps[specialist.name] || []}
              opinions={Object.fromEntries(
                Object.entries(data.agentOpinions).map(([round, opinions]) => [
                  round,
                  opinions[specialist.name],
                ])
              )}
              currentRound={data.current_round}
              isActive={!data.waitingForDoctor && !data.isComplete}
            />
          ))}
        </div>

        {/* Right: Consensus summary with algorithm metrics */}
        <div className={`p-3 lg:w-1/3 ${cardSurface.softBg}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare size={16} className={consultationCardTheme.accent} />
            <h4 className={`text-sm font-semibold ${cardSurface.textPrimary}`}>共识汇总</h4>
          </div>

          {/* Consensus gauge + sparkline */}
          {data.consensusHistory && data.consensusHistory.length > 0 && (
            <div className={`mb-3 rounded border bg-white p-2 ${cardSurface.baseBorder}`}>
              <div className="flex items-start gap-3">
                <div className="relative">
                  <ConsensusGauge
                    score={data.consensusHistory[data.consensusHistory.length - 1].score}
                    label="共识分数"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <ConvergenceSparkline history={data.consensusHistory} />
                </div>
              </div>
            </div>
          )}

          {Object.keys(data.roundSummaries).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.roundSummaries).map(
                ([round, summary]) => (
                  <div
                    key={round}
                    className={`rounded border bg-white p-2 ${cardSurface.baseBorder}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${cardSurface.textSecondary}`}>
                        第 {round} 轮
                      </span>
                      <div className="flex items-center gap-1.5">
                        {summary.consensus_score !== undefined && (
                          <span className={`text-xs ${cardSurface.textMuted}`}>
                            {Math.round(summary.consensus_score * 100)}%
                          </span>
                        )}
                        <ConsensusLevelBadge
                          level={summary.consensus_level}
                        />
                      </div>
                    </div>
                    <ExpandableText text={summary.summary} lines={3} className={`text-sm ${cardSurface.textSecondary}`} />

                    {/* Opinion clusters */}
                    {summary.opinion_clusters && summary.opinion_clusters.length > 1 && (
                      <ClusterBadges clusters={summary.opinion_clusters} />
                    )}

                    {/* Scheduling recommendation */}
                    {summary.scheduling && (
                      <SchedulingBanner scheduling={summary.scheduling} />
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <div className={`flex items-center gap-2 py-4 text-sm ${cardSurface.textMuted}`}>
              <Clock size={14} />
              <span>等待首轮分析完成...</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
