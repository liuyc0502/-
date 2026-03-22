"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UsersRound,
  Trash2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { App } from "antd";
import { API_ENDPOINTS } from "@/services/api";
import { fetchWithAuth } from "@/lib/auth";

interface ConsultationRecord {
  consultation_id: number;
  consultation_uuid: string;
  question: string;
  status: string;
  total_rounds: number;
  max_rounds: number;
  specialist_agents: Array<{ name: string; specialty: string; agent_id?: number }>;
  final_recommendation?: string;
  agreements?: string[];
  disagreements?: string[];
  confidence: number;
  conversation_id?: number;
  patient_id?: number;
  create_time: string;
}

interface ConsultationHistoryViewProps {
  onSelectConsultation?: (id: number) => void;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence);
  let bg = "bg-red-50 text-red-700 border-red-200";
  if (percent >= 80) bg = "bg-emerald-50 text-emerald-700 border-emerald-200";
  else if (percent >= 50) bg = "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${bg}`}>
      {percent}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    completed: { label: "已完成", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    running: { label: "进行中", className: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
    timeout: { label: "已超时", className: "bg-orange-50 text-orange-700 border-orange-200", icon: AlertTriangle },
  };
  const c = config[status] || config.completed;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${c.className}`}>
      <Icon size={10} />
      {c.label}
    </span>
  );
}

function ConsultationCard({
  record,
  onSelect,
  onDelete,
}: {
  record: ConsultationRecord;
  onSelect: (id: number) => void;
  onDelete: (record: ConsultationRecord, e: React.MouseEvent) => void;
}) {
  const date = new Date(record.create_time);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  return (
    <Card
      className="bg-white border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 group relative"
      onClick={() => onSelect(record.consultation_id)}
    >
      <CardContent className="p-5 space-y-3">
        {/* Top: status + confidence + delete */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={record.status} />
            <ConfidenceBadge confidence={record.confidence} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{dateStr}</span>
            <button
              onClick={(e) => onDelete(record, e)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>
        </div>

        {/* Question */}
        <h3 className="font-bold text-base text-gray-900 line-clamp-2">
          {record.question}
        </h3>

        {/* Specialists */}
        <div className="flex flex-wrap gap-1.5">
          {record.specialist_agents?.map((agent, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-200"
            >
              {agent.name}
            </span>
          ))}
        </div>

        {/* Rounds info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{record.total_rounds} 轮讨论 · {record.specialist_agents?.length || 0} 位专家</span>
          <ChevronRight size={14} className="text-gray-400" />
        </div>

        {/* Final recommendation preview */}
        {record.final_recommendation && (
          <p className="text-sm text-gray-600 line-clamp-2 border-t border-gray-100 pt-2">
            {record.final_recommendation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ConsultationHistoryView({ onSelectConsultation }: ConsultationHistoryViewProps) {
  const { message, modal } = App.useApp();
  const [records, setRecords] = useState<ConsultationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API_ENDPOINTS.consultation.history}?page=${page}&page_size=${pageSize}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotal(data.total || 0);
      } else {
        message.error("加载会诊记录失败");
      }
    } catch (error) {
      console.error("Failed to load consultation history:", error);
      message.error("加载会诊记录失败");
    } finally {
      setLoading(false);
    }
  }, [page, message]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleDelete = (record: ConsultationRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    modal.confirm({
      title: "确认删除",
      content: `确定要删除此会诊记录吗？`,
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await fetchWithAuth(
            API_ENDPOINTS.consultation.historyDelete(record.consultation_id),
            { method: "DELETE" }
          );
          if (res.ok) {
            message.success("已删除");
            loadRecords();
          } else {
            message.error("删除失败");
          }
        } catch {
          message.error("删除失败");
        }
      },
    });
  };

  const handleSelect = (id: number) => {
    onSelectConsultation?.(id);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between min-h-[6.5rem]">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">会诊记录</h1>
            <span className="text-sm text-gray-400">共 {total} 条</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          {loading ? (
            <div className="py-12 text-center text-gray-500">加载中...</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <UsersRound className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>暂无会诊记录</p>
              <p className="text-xs text-gray-400 mt-1">
                在对话界面点击「发起会诊」开始多学科会诊
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {records.map((record) => (
                  <ConsultationCard
                    key={record.consultation_id}
                    record={record}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-gray-500">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
