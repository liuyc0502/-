"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight, GitBranch, BookOpen, Brain, XCircle } from "lucide-react";
import type { ReasoningChainData, ReasoningStep } from "@/types/reasoningChain";
import { cardSurface, confidenceTheme, consultationCardTheme } from "./cardTheme";

interface ReasoningChainCardProps {
  data: ReasoningChainData;
}

const stepConfig: Record<
  ReasoningStep["type"],
  {
    color: string;
    dotColor: string;
    bgColor: string;
    sourceBorder?: string;
    sourceBg?: string;
    sourceText?: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  evidence: {
    color: "text-[#2D7A68]",
    dotColor: "bg-[#67B29D]",
    bgColor: "bg-[#EAF7F3]",
    sourceBorder: "border-[#CFE8DF]",
    sourceBg: "bg-[#F4FBF8]",
    sourceText: "text-[#2D7A68]",
    icon: <BookOpen size={12} />,
    label: "引用知识",
  },
  reasoning: {
    color: "text-[#A36C22]",
    dotColor: "bg-[#E0AE58]",
    bgColor: "bg-[#FFF4E3]",
    icon: <Brain size={12} />,
    label: "推理",
  },
  exclusion: {
    color: "text-[#B65B54]",
    dotColor: "bg-[#D97C70]",
    bgColor: "bg-[#FCEDEA]",
    icon: <XCircle size={12} />,
    label: "排除",
  },
};

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
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
      <span className={`text-xs font-medium ${textColor}`}>置信度</span>
      <div className={`flex-1 h-1.5 overflow-hidden rounded-full ${confidenceTheme.track}`}>
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
    <div className={`my-2 overflow-hidden rounded-xl border bg-white shadow-sm ${consultationCardTheme.border}`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b px-4 py-2.5 ${cardSurface.headerBorder} ${consultationCardTheme.headerBg}`}>
        <div className={`flex items-center gap-2 ${consultationCardTheme.headerText}`}>
          <GitBranch size={18} />
          <span className={`font-medium text-sm truncate ${cardSurface.textPrimary}`}>{data.question}</span>
        </div>
        <span className="ml-2 inline-flex items-center whitespace-nowrap rounded-full border border-[#F1D3BF] bg-[#FFE8D9] px-2 py-0.5 text-xs text-[#BF6D4E]">
          推理溯源
        </span>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute bottom-2 left-[9px] top-2 w-0.5 bg-[#E9DED2]" />

          <div className="space-y-1">
            {data.steps.map((step) => {
              const config = stepConfig[step.type] || stepConfig.reasoning;
              const isExpanded = expandedSteps.has(step.step_number);

              return (
                <div key={step.step_number} className="relative pl-7">
                  {/* Dot */}
                  <div className={`absolute left-[5px] top-[10px] h-[10px] w-[10px] rounded-full ${config.dotColor} ring-2 ring-white`} />

                  {/* Step header */}
                  <button
                    onClick={() => toggleStep(step.step_number)}
                    className={`w-full rounded-lg py-1.5 text-left text-sm transition-colors ${cardSurface.hoverSoftBg}`}
                  >
                    <span className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown size={14} className={`shrink-0 ${cardSurface.textMuted}`} />
                      ) : (
                        <ChevronRight size={14} className={`shrink-0 ${cardSurface.textMuted}`} />
                      )}
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs ${config.bgColor} ${config.color}`}>
                        {config.icon}
                        {config.label}
                      </span>
                      <span className={`truncate font-medium ${cardSurface.textPrimary}`}>{step.title}</span>
                    </span>
                  </button>

                  {/* Step content (expanded) */}
                  {isExpanded && (
                    <div className={`ml-6 pb-2 text-sm leading-relaxed ${cardSurface.textSecondary}`}>
                      <p className="whitespace-pre-wrap">{step.content}</p>

                      {/* Knowledge source reference */}
                      {step.knowledge_source && (
                        <div
                          className={`mt-2 rounded border p-2.5 ${
                            config.sourceBorder || "border-[#E4D9CC]"
                          } ${config.sourceBg || "bg-[#FAF7F2]"}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <BookOpen size={12} className={config.sourceText || "text-[#7B5D46]"} />
                            <span className={`text-xs font-medium ${config.sourceText || "text-[#7B5D46]"}`}>
                              {step.knowledge_source.source_name}
                            </span>
                            <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-[#8B7663] ring-1 ring-[#E7DDD2]">
                              [[a{step.knowledge_source.cite_index}]]
                            </span>
                          </div>
                          <p className={`text-xs italic leading-relaxed ${config.sourceText || cardSurface.textSecondary} opacity-85`}>
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
      <div className={`space-y-2 border-t px-4 py-2.5 ${cardSurface.headerBorder} ${cardSurface.softBg}`}>
        <div className="flex items-start gap-1.5">
          <span className={`mt-0.5 ${confidenceTheme.highText}`}>✓</span>
          <p className={`text-sm font-medium ${cardSurface.textPrimary}`}>{data.conclusion}</p>
        </div>
        <ConfidenceBar confidence={data.confidence} />
      </div>
    </div>
  );
}
