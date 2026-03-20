"use client";


import { Stethoscope, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { TriageRecommendationData } from "@/types/symptomReport";

interface TriageRecommendationCardProps {
  data: TriageRecommendationData;
}

const SEVERITY_STYLES: Record<
  TriageRecommendationData["severity"],
  { bg: string; border: string; text: string; banner: string }
> = {
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    banner: "bg-green-100/80",
  },
  yellow: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    banner: "bg-yellow-100/80",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    banner: "bg-red-100/80",
  },
};

const URGENCY_STYLES: Record<
  TriageRecommendationData["urgency"],
  { bg: string; text: string }
> = {
  emergency: { bg: "bg-red-100", text: "text-red-700" },
  urgent: { bg: "bg-orange-100", text: "text-orange-700" },
  scheduled: { bg: "bg-blue-100", text: "text-blue-700" },
  observation: { bg: "bg-green-100", text: "text-green-700" },
};

const SEVERITY_LABELS: Record<TriageRecommendationData["severity"], string> = {
  green: "症状较轻，可观察",
  yellow: "建议就医检查",
  red: "建议尽快就诊",
};

export default function TriageRecommendationCard({
  data,
}: TriageRecommendationCardProps) {
  const sev = SEVERITY_STYLES[data.severity];
  const urg = URGENCY_STYLES[data.urgency];

  return (
    <div
      className={`my-2 rounded-lg border ${sev.border} bg-white shadow-sm overflow-hidden`}
    >
      {/* Severity banner */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 ${sev.banner} border-b ${sev.border}`}
      >
        <div className={`flex items-center gap-2 ${sev.text}`}>
          <Stethoscope size={18} />
          <span className="font-medium text-sm">
            智能导诊建议
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${urg.bg} ${urg.text} font-medium`}
          >
            {data.urgency === "emergency" && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
            )}
            {data.urgency_label}
          </span>
          <span
            className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${sev.bg} ${sev.text} border ${sev.border}`}
          >
            {SEVERITY_LABELS[data.severity]}
          </span>
        </div>
      </div>

      {/* Recommended departments */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-500 mb-2">
          推荐就诊科室
        </p>
        <div className="space-y-2">
          {data.recommended_departments.map((dept, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-medium mt-0.5">
                {dept.priority}
              </span>
              <div>
                <span className="text-sm font-medium text-gray-800">
                  {dept.department}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">{dept.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preparation tips */}
      {data.preparation_tips.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-1.5">
            就诊前准备
          </p>
          <ul className="space-y-1">
            {data.preparation_tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-700">
                <CheckCircle2
                  size={13}
                  className="text-emerald-500 mt-0.5 flex-shrink-0"
                />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warning signs */}
      {data.warning_signs.length > 0 && (
        <div className="px-4 py-3 border-b border-red-100 bg-red-50/30">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={13} className="text-red-500" />
            <p className="text-xs text-red-600 font-medium">
              出现以下情况请立即就诊
            </p>
          </div>
          <ul className="space-y-1">
            {data.warning_signs.map((sign, idx) => (
              <li key={idx} className="text-xs text-red-600 pl-5">
                • {sign}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className="px-4 py-2 bg-gray-50/50">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          {data.disclaimer}
        </p>
      </div>
    </div>
  );
}
