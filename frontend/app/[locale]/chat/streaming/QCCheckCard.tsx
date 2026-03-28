"use client";

import { useState } from "react";

import { ClipboardCheck, CheckCircle2, AlertTriangle, XCircle, Minus, ChevronDown, ChevronUp } from "lucide-react";
import type { QCCheckData } from "@/types/chat";
import type { QCField } from "@/types/reportInterpretation";
import { cardSurface, qcCardTheme } from "./cardTheme";
interface QCCheckCardProps {
  data: QCCheckData;
}

const statusConfig: Record<QCField["status"], { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  pass: {
    icon: <CheckCircle2 size={14} />,
    color: qcCardTheme.passText,
    bg: "bg-[#EEF7F1]",
    label: "通过",
  },
  warning: {
    icon: <AlertTriangle size={14} />,
    color: qcCardTheme.warningText,
    bg: "bg-[#FFF5E6]",
    label: "警告",
  },
  missing: {
    icon: <XCircle size={14} />,
    color: qcCardTheme.missingText,
    bg: "bg-[#FCEAE8]",
    label: "缺失",
  },
  not_applicable: {
    icon: <Minus size={14} />,
    color: cardSurface.textMuted,
    bg: cardSurface.softBg,
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
    <div className={`my-2 overflow-hidden rounded-xl border bg-white shadow-sm ${qcCardTheme.border}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${cardSurface.headerBorder} ${qcCardTheme.headerBg}`}>
        <div className={`flex items-center gap-2 ${qcCardTheme.headerText}`}>
          <ClipboardCheck size={18} />
          <span className={`font-medium text-sm ${cardSurface.textPrimary}`}>{data.report_title}</span>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${qcCardTheme.badgeBg} ${qcCardTheme.badgeText} ${qcCardTheme.badgeBorder}`}>
          质控检查
        </span>
      </div>

      {/* Summary bar */}
      <div className={`flex items-center gap-3 px-4 py-2 border-b ${cardSurface.headerBorder} ${qcCardTheme.summaryBg} text-xs`}>
        <span className={`inline-flex items-center gap-1 ${qcCardTheme.passText}`}>
          <CheckCircle2 size={12} /> {data.summary.pass} 通过
        </span>
        {data.summary.warning > 0 && (
          <span className={`inline-flex items-center gap-1 ${qcCardTheme.warningText}`}>
            <AlertTriangle size={12} /> {data.summary.warning} 警告
          </span>
        )}
        {data.summary.missing > 0 && (
          <span className={`inline-flex items-center gap-1 ${qcCardTheme.missingText}`}>
            <XCircle size={12} /> {data.summary.missing} 缺失
          </span>
        )}
      </div>

      {/* Field list */}
      <div className={`divide-y ${cardSurface.sectionBorder}`}>
        {displayFields.map((field, idx) => {
          const config = statusConfig[field.status];
          return (
            <div key={idx} className={`px-4 py-2 ${config.bg}`}>
              <div className="flex items-center gap-2 text-sm">
                <span className={config.color}>{config.icon}</span>
                <span className={`font-medium min-w-[5rem] ${cardSurface.textPrimary}`}>{field.field}</span>
                <span className={`flex-1 truncate ${cardSurface.textSecondary}`}>
                  {field.value || (field.status === "missing" ? "缺失" : "—")}
                </span>
              </div>
              {field.suggestion && (
                <p className={`text-xs mt-0.5 ml-6 pl-1 ${cardSurface.textSecondary}`}>
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
          className={`w-full flex items-center justify-center gap-1 px-4 py-2 text-xs border-t transition-colors ${cardSurface.headerBorder} ${cardSurface.textSecondary} ${cardSurface.hoverTextPrimary} ${cardSurface.hoverSoftBg}`}
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
