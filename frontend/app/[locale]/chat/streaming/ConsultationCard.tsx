"use client";

import { useState } from "react";
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
} from "lucide-react";
import type { ConsultationState, ConsultationSchedulingData } from "@/types/consultation";
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
        className="text-xs text-[#DA7756] hover:text-[#C46B4D] mt-0.5 cursor-pointer"
      >
        {isExpanded ? "收起" : "展开全部"}
      </button>
    </div>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence);
  let barColor = "bg-red-400";
  let textColor = "text-red-600";
  if (percent >= 80) {
    barColor = "bg-emerald-400";
    textColor = "text-emerald-600";
  } else if (percent >= 50) {
    barColor = "bg-amber-400";
    textColor = "text-amber-600";
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
    full: { bg: "bg-emerald-100", text: "text-emerald-700", label: "完全共识" },
    partial: { bg: "bg-amber-100", text: "text-amber-700", label: "部分共识" },
    divergent: { bg: "bg-red-100", text: "text-red-700", label: "存在分歧" },
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

  let strokeColor = "#ef4444"; // red
  let textColor = "text-red-600";
  if (percent >= 85) {
    strokeColor = "#10b981"; // emerald
    textColor = "text-emerald-600";
  } else if (percent >= 55) {
    strokeColor = "#f59e0b"; // amber
    textColor = "text-amber-600";
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
      <span className="text-xs text-gray-500 mt-0.5">{label}</span>
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
        <TrendingUp size={10} className="text-gray-400" />
        <span className="text-xs text-gray-400">收敛趋势</span>
      </div>
      <svg width={width} height={height} className="bg-gray-100 rounded">
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
    converged: { bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2, iconColor: "text-emerald-600" },
    progressing: { bg: "bg-blue-50", border: "border-blue-200", icon: TrendingUp, iconColor: "text-blue-600" },
    focused_debate: { bg: "bg-amber-50", border: "border-amber-200", icon: Target, iconColor: "text-amber-600" },
    stagnated: { bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle, iconColor: "text-red-600" },
  };
  const config = configs[scheduling.strategy] || configs.progressing;
  const Icon = config.icon;

  return (
    <div className={`mt-1.5 p-1.5 rounded border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-1.5">
        <Icon size={12} className={`${config.iconColor} mt-0.5 flex-shrink-0`} />
        <p className="text-xs text-gray-700">{scheduling.recommendation}</p>
      </div>
    </div>
  );
}

// Opinion cluster badges
function ClusterBadges({ clusters }: { clusters: string[][] }) {
  const colors = ["bg-blue-100 text-blue-700", "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700", "bg-emerald-100 text-emerald-700"];
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
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Agent header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-[#DA7756]" />
          <span className="text-base font-medium text-gray-800">{name}</span>
          <span className="text-sm text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
            {specialty}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && !latestOpinion && (
            <Loader2 size={12} className="text-blue-500 animate-spin" />
          )}
          {latestOpinion && (
            <CheckCircle2 size={12} className="text-emerald-500" />
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
                  className="flex items-start gap-2 text-xs text-gray-600"
                >
                  <div
                    className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      step.type === "thinking"
                        ? "bg-blue-400"
                        : step.type === "tool_use"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  <ExpandableText text={step.step} lines={2} className="text-sm text-gray-600" />
                </div>
              ))}
            </div>
          )}

          {/* Opinion / conclusion */}
          {latestOpinion && (
            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm font-medium text-gray-800 mb-1">
                结论:
              </p>
              <ExpandableText text={latestOpinion.conclusion} lines={4} className="text-sm text-gray-700" />
              <div className="mt-1.5">
                <ConfidenceBar confidence={latestOpinion.confidence} />
              </div>
              {latestOpinion.agrees_with?.length > 0 && (
                <p className="text-sm text-emerald-600 mt-1">
                  同意: {latestOpinion.agrees_with.join(", ")}
                </p>
              )}
              {latestOpinion.disagrees_with?.length > 0 && (
                <p className="text-sm text-orange-600 mt-1">
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
    <div className="my-3 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[#DA7756]" />
            <h3 className="text-base font-semibold text-gray-900">
              多学科会诊
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
              第 {data.current_round} 轮 / 共 {data.max_rounds} 轮
            </span>
            {data.isComplete && (
              <span className="text-sm text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                已完成
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
          {data.question}
        </p>
      </div>

      {/* Body: Specialists panel + Consensus panel */}
      <div className="flex flex-col lg:flex-row">
        {/* Left: Specialist agents */}
        <div className="flex-1 p-3 space-y-2 border-r border-gray-100">
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
        <div className="lg:w-1/3 p-3 bg-gray-50">
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare size={16} className="text-[#DA7756]" />
            <h4 className="text-sm font-semibold text-gray-700">共识汇总</h4>
          </div>

          {/* Consensus gauge + sparkline */}
          {data.consensusHistory && data.consensusHistory.length > 0 && (
            <div className="mb-3 p-2 bg-white rounded border border-gray-200">
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
                    className="p-2 bg-white rounded border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-600">
                        第 {round} 轮
                      </span>
                      <div className="flex items-center gap-1.5">
                        {summary.consensus_score !== undefined && (
                          <span className="text-xs text-gray-500">
                            {Math.round(summary.consensus_score * 100)}%
                          </span>
                        )}
                        <ConsensusLevelBadge
                          level={summary.consensus_level}
                        />
                      </div>
                    </div>
                    <ExpandableText text={summary.summary} lines={3} className="text-sm text-gray-600" />

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
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <Clock size={14} />
              <span>等待首轮分析完成...</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
