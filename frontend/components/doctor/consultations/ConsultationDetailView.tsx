"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  UsersRound,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import { exportToPdf } from "@/lib/exportPdf";
import { Button } from "@/components/ui/button";
import { API_ENDPOINTS } from "@/services/api";
import { fetchWithAuth } from "@/lib/auth";

interface SpecialistInfo {
  name: string;
  specialty: string;
  agent_id?: number;
}

interface RoundOpinion {
  conclusion: string;
  confidence: number;
  agrees_with: string[];
  disagrees_with: string[];
}

interface RoundResultData {
  round: number;
  consensus_level: string;
  summary: string;
  opinions: Record<string, RoundOpinion>;
}

interface ConsultationDetail {
  consultation_id: number;
  consultation_uuid: string;
  question: string;
  status: string;
  total_rounds: number;
  max_rounds: number;
  specialist_agents: SpecialistInfo[];
  round_results: RoundResultData[];
  final_recommendation?: string;
  agreements?: string[];
  disagreements?: string[];
  confidence: number;
  create_time: string;
}

interface ConsultationDetailViewProps {
  consultationId: number;
  onBack: () => void;
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
      <span className={`text-sm font-medium ${textColor}`}>综合置信度</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-sm font-semibold ${textColor}`}>{percent}%</span>
    </div>
  );
}

export function ConsultationDetailView({ consultationId, onBack }: ConsultationDetailViewProps) {
  const [data, setData] = useState<ConsultationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    if (!contentRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      await exportToPdf(contentRef.current, `会诊详情_${consultationId}_${date}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(
          API_ENDPOINTS.consultation.historyDetail(consultationId)
        );
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error("Failed to load consultation detail:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [consultationId]);

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#FAFAFA]">
        <span className="text-gray-500">加载中...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#FAFAFA]">
        <span className="text-gray-500">未找到会诊记录</span>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          返回
        </Button>
      </div>
    );
  }

  const date = new Date(data.create_time);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} className="mr-1" />
            返回
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">会诊详情</h1>
          <span className="text-sm text-gray-400">{dateStr}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            {isExporting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Download size={14} className="mr-1" />}
            导出 PDF
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div ref={contentRef} className="px-8 py-5 max-w-6xl mx-auto space-y-6">
          {/* Question */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">会诊问题</h2>
            <p className="text-lg text-gray-900 leading-relaxed">{data.question}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {data.specialist_agents?.map((agent, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-200"
                >
                  {agent.name} · {agent.specialty}
                </span>
              ))}
            </div>
          </div>

          {/* Confidence */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <ConfidenceBar confidence={data.confidence} />
          </div>

          {/* Final Recommendation */}
          {data.final_recommendation && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">最终推荐方案</h2>
              <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                {data.final_recommendation}
              </p>
            </div>
          )}

          {/* Agreements & Disagreements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <h2 className="text-sm font-semibold text-emerald-700">共识点</h2>
              </div>
              {data.agreements && data.agreements.length > 0 ? (
                <ul className="space-y-1.5">
                  {data.agreements.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-base text-emerald-700 bg-emerald-50 px-3 py-2 rounded"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">暂无共识点</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <AlertTriangle size={14} className="text-orange-500" />
                <h2 className="text-sm font-semibold text-orange-700">分歧点</h2>
              </div>
              {data.disagreements && data.disagreements.length > 0 ? (
                <ul className="space-y-1.5">
                  {data.disagreements.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-base text-orange-700 bg-orange-50 px-3 py-2 rounded"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">无分歧</p>
              )}
            </div>
          </div>

          {/* Round-by-round Details */}
          {data.round_results && data.round_results.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <UsersRound size={16} className="text-indigo-500" />
                <h2 className="text-base font-semibold text-gray-800">
                  辩论过程（{data.total_rounds} 轮）
                </h2>
              </div>

              <div className="space-y-2">
                {data.round_results.map((round) => {
                  const isExpanded = expandedRounds.has(round.round);
                  const consensusColor =
                    round.consensus_level === "full"
                      ? "text-emerald-600"
                      : round.consensus_level === "partial"
                        ? "text-amber-600"
                        : "text-red-600";

                  return (
                    <div key={round.round} className="border border-gray-100 rounded-lg">
                      <button
                        onClick={() => toggleRound(round.round)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown size={14} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={14} className="text-gray-400" />
                          )}
                          <span className="text-base font-medium text-gray-700">
                            第 {round.round} 轮
                          </span>
                          <span className={`text-sm ${consensusColor}`}>
                            {round.consensus_level === "full"
                              ? "完全共识"
                              : round.consensus_level === "partial"
                                ? "部分共识"
                                : "存在分歧"}
                          </span>
                        </div>
                      </button>

                      {isExpanded && round.opinions && (
                        <div className="px-4 pb-3 space-y-2">
                          {Object.entries(round.opinions).map(([name, opinion]) => (
                            <div
                              key={name}
                              className="p-3 bg-gray-50 rounded border border-gray-200"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-800">
                                  {name}
                                </span>
                                <span className="text-sm text-gray-500">
                                  置信度 {Math.round(opinion.confidence)}%
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {opinion.conclusion}
                              </p>
                              {(opinion.agrees_with?.length > 0 ||
                                opinion.disagrees_with?.length > 0) && (
                                <div className="flex gap-3 mt-1.5 text-sm">
                                  {opinion.agrees_with?.length > 0 && (
                                    <span className="text-emerald-600">
                                      同意: {opinion.agrees_with.join(", ")}
                                    </span>
                                  )}
                                  {opinion.disagrees_with?.length > 0 && (
                                    <span className="text-orange-600">
                                      质疑: {opinion.disagrees_with.join(", ")}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
