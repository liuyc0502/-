"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Scale,
  ShieldCheck,
  Stethoscope,
  UsersRound,
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

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function getStatusConfig(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    completed: {
      label: "已完成",
      className: "border-[#D7E7DB] bg-[#F4FAF5] text-[#55745D]",
    },
    running: {
      label: "进行中",
      className: "border-[#D5E2F0] bg-[#F3F8FD] text-[#4E6B8C]",
    },
    timeout: {
      label: "已超时",
      className: "border-[#EEDCC4] bg-[#FDF6EC] text-[#A17039]",
    },
  };

  return (
    config[status] ?? {
      label: "已完成",
      className: "border-[#D7E7DB] bg-[#F4FAF5] text-[#55745D]",
    }
  );
}

function getConsensusConfig(level: string) {
  const config: Record<string, { label: string; className: string }> = {
    full: {
      label: "完全共识",
      className: "border-[#D7E7DB] bg-[#F4FAF5] text-[#55745D]",
    },
    partial: {
      label: "部分共识",
      className: "border-[#EEDCC4] bg-[#FDF6EC] text-[#A17039]",
    },
    none: {
      label: "存在分歧",
      className: "border-[#EED8D8] bg-[#FDF5F5] text-[#A86666]",
    },
  };

  return (
    config[level] ?? {
      label: "存在分歧",
      className: "border-[#EED8D8] bg-[#FDF5F5] text-[#A86666]",
    }
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence);
  let barColor = "bg-[#E4A28D]";
  let glowColor = "shadow-[0_0_0_3px_rgba(228,162,141,0.10)]";
  let textColor = "text-[#B36D56]";

  if (percent >= 80) {
    barColor = "bg-[#90BA98]";
    glowColor = "shadow-[0_0_0_3px_rgba(144,186,152,0.10)]";
    textColor = "text-[#618069]";
  } else if (percent >= 50) {
    barColor = "bg-[#E0B46E]";
    glowColor = "shadow-[0_0_0_3px_rgba(224,180,110,0.10)]";
    textColor = "text-[#A37A3B]";
  }

  return (
    <div className="rounded-2xl border border-[#EEE2D5] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#A39380]">
            综合置信度
          </p>
          <p className="mt-1 text-sm text-[#7A6A58]">基于各专科意见与会诊轮次汇总</p>
        </div>
        <div
          className={`rounded-full border border-white/70 px-3 py-1 text-sm font-semibold ${textColor} ${glowColor}`}
        >
          {percent}%
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#F5ECE1]">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#EEE2D5] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#A39380]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#3C3127]">{value}</p>
      <p className="mt-1 text-sm text-[#817160]">{hint}</p>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-[#EEE2D5] bg-[#FEFBF7] p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ECDCCC] bg-white text-[#C07A59]">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#3C3127]">{title}</h2>
          {description && <p className="mt-1 text-sm text-[#817160]">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function OpinionCard({ name, opinion }: { name: string; opinion: RoundOpinion }) {
  return (
    <div className="rounded-2xl border border-[#EEE3D8] bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#3C3127]">{name}</p>
          <p className="mt-1 text-xs text-[#93816E]">专科意见</p>
        </div>
        <span className="rounded-full border border-[#EEDDC6] bg-[#FDF6EC] px-2.5 py-1 text-xs font-medium text-[#A17039]">
          置信度 {Math.round(opinion.confidence)}%
        </span>
      </div>

      <p className="text-sm leading-7 text-[#695A4C]">{opinion.conclusion}</p>

      {(opinion.agrees_with?.length > 0 || opinion.disagrees_with?.length > 0) && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {opinion.agrees_with?.length > 0 && (
            <div className="rounded-xl border border-[#DCE8DF] bg-[#F7FBF8] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#68846E]">
                认同对象
              </p>
              <p className="text-sm text-[#58705D]">{opinion.agrees_with.join("、")}</p>
            </div>
          )}
          {opinion.disagrees_with?.length > 0 && (
            <div className="rounded-xl border border-[#EFDDCD] bg-[#FDF7F0] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#A17039]">
                质疑对象
              </p>
              <p className="text-sm text-[#936535]">{opinion.disagrees_with.join("、")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ConsultationDetailView({
  consultationId,
  onBack,
}: ConsultationDetailViewProps) {
  const [data, setData] = useState<ConsultationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([1]));
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
        const res = await fetchWithAuth(API_ENDPOINTS.consultation.historyDetail(consultationId));
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
      if (next.has(round)) {
        next.delete(round);
      } else {
        next.add(round);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-app-surface">
        <div className="rounded-2xl border border-[#E7DCCF] bg-[#FBF7F1] px-6 py-5 text-center shadow-sm">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[#C46B4D]" />
          <p className="text-sm text-[#6E5C48]">正在加载会诊详情</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-app-surface">
        <div className="rounded-2xl border border-[#E7DCCF] bg-[#FBF7F1] px-8 py-7 text-center shadow-sm">
          <p className="text-base font-medium text-[#4F4337]">未找到会诊记录</p>
          <Button variant="outline" className="mt-4 border-[#D8C8B6] bg-white" onClick={onBack}>
            返回
          </Button>
        </div>
      </div>
    );
  }

  const dateStr = formatDateTime(data.create_time);
  const statusConfig = getStatusConfig(data.status);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-app-surface">
      <div className="flex-shrink-0 border-b border-gray-200 bg-app-surface">
        <div className="flex items-center gap-4 px-8 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} className="mr-1" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">会诊详情</h1>
            <p className="mt-1 text-sm text-gray-500">查看多学科讨论过程与最终建议</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="ml-auto border-[#D8C8B6] bg-white text-[#5B4B3B] hover:bg-[#F8F3EA]"
          >
            {isExporting ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <Download size={14} className="mr-1" />
            )}
            导出 PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div ref={contentRef} className="mx-auto flex max-w-6xl flex-col gap-5 px-8 py-5">
          <section className="overflow-hidden rounded-[28px] border border-[#EADDD0] bg-[linear-gradient(135deg,#FFFDFC_0%,#F8EFE4_100%)] shadow-sm">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.7fr)_320px]">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig.className}`}
                  >
                    {statusConfig.label}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[#E9DDCF] bg-white/90 px-3 py-1 text-xs font-medium text-[#7A6A58]">
                    会诊编号 #{data.consultation_id}
                  </span>
                </div>

                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#A1917D]">
                    会诊问题
                  </p>
                  <p className="mt-3 text-[22px] font-semibold leading-[1.5] text-[#3D3228] lg:text-[24px]">
                    {data.question}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {data.specialist_agents?.map((agent, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border border-[#E9DDCF] bg-white/90 px-3 py-1.5 text-sm text-[#6E5F50]"
                    >
                      {agent.name} · {agent.specialty}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#ECE0D4] bg-[#FFFDFC]/95 p-5">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-[#C07A59]" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#A39380]">
                        创建时间
                      </p>
                      <p className="mt-1 text-sm text-[#6F6051]">{dateStr}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <UsersRound className="mt-0.5 h-4 w-4 text-[#C07A59]" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#A39380]">
                        参与专科
                      </p>
                      <p className="mt-1 text-sm text-[#6F6051]">
                        {data.specialist_agents?.length || 0} 位专家参与讨论
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Scale className="mt-0.5 h-4 w-4 text-[#C07A59]" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#A39380]">
                        轮次进度
                      </p>
                      <p className="mt-1 text-sm text-[#6F6051]">
                        已完成 {data.total_rounds} / {data.max_rounds} 轮
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="讨论轮数"
                value={`${data.total_rounds}`}
                hint={`最多 ${data.max_rounds} 轮`}
              />
              <StatCard
                label="专家数量"
                value={`${data.specialist_agents?.length || 0}`}
                hint="参与本次会诊"
              />
              <StatCard
                label="状态"
                value={statusConfig.label}
                hint="当前会诊进度"
              />
            </div>
            <ConfidenceBar confidence={data.confidence} />
          </div>

          {data.final_recommendation && (
            <SectionCard
              icon={<ShieldCheck size={18} />}
              title="最终推荐方案"
              description="综合多专科意见后的会诊建议"
            >
              <div className="rounded-2xl border border-[#EEE2D5] bg-white p-5">
                <p className="whitespace-pre-wrap text-[15px] leading-8 text-[#6B5B4D]">
                  {data.final_recommendation}
                </p>
              </div>
            </SectionCard>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard
              icon={<CheckCircle2 size={18} />}
              title="共识点"
              description="专家之间已经形成一致判断的内容"
            >
              {data.agreements && data.agreements.length > 0 ? (
                <div className="space-y-3">
                  {data.agreements.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[#DCE8DF] bg-[#F7FBF8] px-4 py-3 text-sm leading-7 text-[#5C7362]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#E3D7CA] bg-white px-4 py-6 text-sm text-[#91806E]">
                  暂无明确共识点
                </div>
              )}
            </SectionCard>

            <SectionCard
              icon={<AlertTriangle size={18} />}
              title="分歧点"
              description="仍需进一步权衡或补充信息的部分"
            >
              {data.disagreements && data.disagreements.length > 0 ? (
                <div className="space-y-3">
                  {data.disagreements.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[#EFDDCD] bg-[#FDF7F0] px-4 py-3 text-sm leading-7 text-[#946635]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#E3D7CA] bg-white px-4 py-6 text-sm text-[#91806E]">
                  当前未记录明显分歧
                </div>
              )}
            </SectionCard>
          </div>

          {data.round_results && data.round_results.length > 0 && (
            <SectionCard
              icon={<Stethoscope size={18} />}
              title="会诊过程"
              description={`共记录 ${data.round_results.length} 轮讨论，展开后可查看每位专家的具体意见`}
            >
              <div className="space-y-3">
                {data.round_results.map((round) => {
                  const isExpanded = expandedRounds.has(round.round);
                  const consensusConfig = getConsensusConfig(round.consensus_level);

                  return (
                    <div
                      key={round.round}
                      className="overflow-hidden rounded-[22px] border border-[#EDE1D5] bg-white"
                    >
                      <button
                        onClick={() => toggleRound(round.round)}
                        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FEF9F4]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-[#3C3127]">
                              第 {round.round} 轮讨论
                            </span>
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${consensusConfig.className}`}
                            >
                              {consensusConfig.label}
                            </span>
                          </div>
                          {round.summary && (
                            <p className="mt-2 line-clamp-2 text-sm leading-7 text-[#7A6A58]">
                              {round.summary}
                            </p>
                          )}
                        </div>
                        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#ECE0D4] bg-[#FFFCF8] text-[#9A8977]">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[#F1E6DB] bg-[#FFFDFC] px-5 py-5">
                          {round.summary && (
                            <div className="mb-4 rounded-2xl border border-[#EEE2D6] bg-white px-4 py-3">
                              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#6D5E50]">
                                <FileText size={14} className="text-[#C07A59]" />
                                本轮纪要
                              </div>
                              <p className="text-sm leading-7 text-[#6B5B4D]">{round.summary}</p>
                            </div>
                          )}

                          {round.opinions && Object.keys(round.opinions).length > 0 ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                              {Object.entries(round.opinions).map(([name, opinion]) => (
                                <OpinionCard key={name} name={name} opinion={opinion} />
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-[#E3D7CA] bg-white px-4 py-6 text-sm text-[#91806E]">
                              本轮暂无详细专家意见
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
