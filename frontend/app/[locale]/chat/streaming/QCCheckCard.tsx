"use client";

import { useState } from "react";

import { ClipboardCheck, CheckCircle2, AlertTriangle, XCircle, Minus, ChevronDown, ChevronUp } from "lucide-react";
import type { QCCheckData } from "@/types/chat";
import type { QCField } from "@/types/reportInterpretation";
interface QCCheckCardProps {
  data: QCCheckData;
}

const statusConfig: Record<QCField["status"], { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  pass: {
    icon: <CheckCircle2 size={14} />,
    color: "text-green-600",
    bg: "bg-green-50",
    label: "通过",
  },
  warning: {
    icon: <AlertTriangle size={14} />,
    color: "text-amber-600",
    bg: "bg-amber-50",
    label: "警告",
  },
  missing: {
    icon: <XCircle size={14} />,
    color: "text-red-600",
    bg: "bg-red-50",
    label: "缺失",
  },
  not_applicable: {
    icon: <Minus size={14} />,
    color: "text-gray-400",
    bg: "bg-gray-50",
    label: "不适用",
  },
};

// Sort: missing first, then warning, then pass, then not_applicable
const statusOrder: Record<QCField["status"], number> = {
  missing: 0,
  warning: 1,
  pass: 2,
  not_applicable: 3,
};

export default function QCCheckCard({ data }: QCCheckCardProps) {
  const [showAll, setShowAll] = useState(false);

  const sortedFields = [...data.fields].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status]
  );

  // Show only issues by default (missing + warning), expand to show all
  const issueFields = sortedFields.filter((f) => f.status === "missing" || f.status === "warning");
  const displayFields = showAll ? sortedFields : (issueFields.length > 0 ? issueFields : sortedFields.slice(0, 3));

  return (
    <div className="my-2 rounded-lg border border-amber-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-amber-50/80">
        <div className="flex items-center gap-2 text-amber-700">
          <ClipboardCheck size={18} />
          <span className="font-medium text-sm">{data.report_title}</span>
        </div>
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">
          质控检查
        </span>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50/50 text-xs">
        <span className="inline-flex items-center gap-1 text-green-600">
          <CheckCircle2 size={12} /> {data.summary.pass} 通过
        </span>
        {data.summary.warning > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <AlertTriangle size={12} /> {data.summary.warning} 警告
          </span>
        )}
        {data.summary.missing > 0 && (
          <span className="inline-flex items-center gap-1 text-red-600">
            <XCircle size={12} /> {data.summary.missing} 缺失
          </span>
        )}
      </div>

      {/* Field list */}
      <div className="divide-y divide-gray-50">
        {displayFields.map((field, idx) => {
          const config = statusConfig[field.status];
          return (
            <div key={idx} className={`px-4 py-2 ${config.bg}`}>
              <div className="flex items-center gap-2 text-sm">
                <span className={config.color}>{config.icon}</span>
                <span className="text-gray-700 font-medium min-w-[5rem]">{field.field}</span>
                <span className="text-gray-500 flex-1 truncate">
                  {field.value || (field.status === "missing" ? "缺失" : "—")}
                </span>
              </div>
              {field.suggestion && (
                <p className="text-xs text-gray-500 mt-0.5 ml-6 pl-1">
                  💡 {field.suggestion}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more / less toggle */}
      {sortedFields.length > displayFields.length || showAll ? (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-1 px-4 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-t border-gray-100 transition-colors"
        >
          {showAll ? (
            <><ChevronUp size={12} /> 收起</>
          ) : (
            <><ChevronDown size={12} /> 查看全部 {sortedFields.length} 项</>
          )}
        </button>
      ) : null}
    </div>
  );
}
