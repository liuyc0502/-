"use client";

import { useState } from "react";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import type { ConsultationReportData } from "@/types/consultation";

interface ConsultationReportCardProps {
  data: ConsultationReportData;
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
      <span className={`text-xs font-medium ${textColor}`}>综合置信度</span>
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

export default function ConsultationReportCard({
  data,
}: ConsultationReportCardProps) {
  const [showSpecialists, setShowSpecialists] = useState(false);

  return (
    <div className="my-3 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#DA7756]" />
            <h3 className="text-sm font-semibold text-gray-900">
              会诊结论报告
            </h3>
          </div>
          <span className="text-xs text-gray-500">
            共 {data.total_rounds} 轮讨论 · {data.specialists?.length || 0} 位专家
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="px-4 py-3 border-b border-gray-100">
        <ConfidenceBar confidence={data.confidence} />
      </div>

      {/* Final recommendation */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h4 className="text-xs font-semibold text-gray-700 mb-1.5">
          最终推荐方案
        </h4>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {data.final_recommendation}
        </p>
      </div>

      {/* Agreements & Disagreements */}
      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-gray-100">
        {/* Agreements */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <h4 className="text-xs font-semibold text-emerald-700">
              共识点
            </h4>
          </div>
          {data.agreements && data.agreements.length > 0 ? (
            <ul className="space-y-1">
              {data.agreements.map((item, idx) => (
                <li
                  key={idx}
                  className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">暂无共识点</p>
          )}
        </div>

        {/* Disagreements */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={14} className="text-orange-500" />
            <h4 className="text-xs font-semibold text-orange-700">
              分歧点
            </h4>
          </div>
          {data.disagreements && data.disagreements.length > 0 ? (
            <ul className="space-y-1">
              {data.disagreements.map((item, idx) => (
                <li
                  key={idx}
                  className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded"
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

      {/* Specialist opinions (collapsible) */}
      <div className="px-4 py-2">
        <button
          onClick={() => setShowSpecialists(!showSpecialists)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
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
                className="p-2 bg-gray-50 rounded border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-800">
                    {specialist.name}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                    {specialist.specialty}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {specialist.final_opinion}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
