"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight, GitBranch, BookOpen, Brain, XCircle } from "lucide-react";
import type { ReasoningChainData, ReasoningStep } from "@/types/reasoningChain";

interface ReasoningChainCardProps {
  data: ReasoningChainData;
}

const stepConfig: Record<ReasoningStep["type"], { color: string; dotColor: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  evidence: {
    color: "text-emerald-600",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-50",
    icon: <BookOpen size={12} />,
    label: "引用知识",
  },
  reasoning: {
    color: "text-blue-600",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-50",
    icon: <Brain size={12} />,
    label: "推理",
  },
  exclusion: {
    color: "text-orange-600",
    dotColor: "bg-orange-500",
    bgColor: "bg-orange-50",
    icon: <XCircle size={12} />,
    label: "排除",
  },
};

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
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
      <span className={`text-xs font-medium ${textColor}`}>置信度</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{percent}%</span>
    </div>
  );
}

export default function ReasoningChainCard({ data }: ReasoningChainCardProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) next.delete(stepNumber);
      else next.add(stepNumber);
      return next;
    });
  };

  return (
    <div className="my-2 rounded-lg border border-purple-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-purple-50/80">
        <div className="flex items-center gap-2 text-purple-700">
          <GitBranch size={18} />
          <span className="font-medium text-sm truncate">{data.question}</span>
        </div>
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 border border-purple-200 whitespace-nowrap ml-2">
          推理溯源
        </span>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200" />

          <div className="space-y-1">
            {data.steps.map((step) => {
              const config = stepConfig[step.type] || stepConfig.reasoning;
              const isExpanded = expandedSteps.has(step.step_number);

              return (
                <div key={step.step_number} className="relative pl-7">
                  {/* Dot */}
                  <div className={`absolute left-[5px] top-[10px] w-[10px] h-[10px] rounded-full ${config.dotColor} ring-2 ring-white`} />

                  {/* Step header */}
                  <button
                    onClick={() => toggleStep(step.step_number)}
                    className="w-full flex items-center gap-2 py-1.5 text-sm text-left hover:bg-gray-50/50 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400 shrink-0" />
                    )}
                    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.color} shrink-0`}>
                      {config.icon}
                      {config.label}
                    </span>
                    <span className="font-medium text-gray-700 truncate">{step.title}</span>
                  </button>

                  {/* Step content (expanded) */}
                  {isExpanded && (
                    <div className="ml-6 pb-2 text-sm text-gray-600 leading-relaxed">
                      <p className="whitespace-pre-wrap">{step.content}</p>

                      {/* Knowledge source reference */}
                      {step.knowledge_source && (
                        <div className="mt-2 p-2.5 rounded border border-emerald-100 bg-emerald-50/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <BookOpen size={12} className="text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-700">{step.knowledge_source.source_name}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 font-mono">
                              [[a{step.knowledge_source.cite_index}]]
                            </span>
                          </div>
                          <p className="text-xs text-emerald-600/80 italic leading-relaxed">
                            &ldquo;{step.knowledge_source.excerpt}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer - Conclusion + Confidence */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 space-y-2">
        <div className="flex items-start gap-1.5">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <p className="text-sm text-gray-700 font-medium">{data.conclusion}</p>
        </div>
        <ConfidenceBar confidence={data.confidence} />
      </div>
    </div>
  );
}
