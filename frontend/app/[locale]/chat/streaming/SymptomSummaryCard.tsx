"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight, ClipboardList } from "lucide-react";
import type { SymptomSummaryData } from "@/types/symptomReport";

interface SymptomSummaryCardProps {
  data: SymptomSummaryData;
}

function SeverityBar({ value }: { value: number }) {
  const percent = Math.min(Math.max(value, 1), 10) * 10;
  const color =
    value <= 3
      ? "bg-green-400"
      : value <= 6
        ? "bg-yellow-400"
        : "bg-red-400";

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">{value}/10</span>
    </div>
  );
}

export default function SymptomSummaryCard({ data }: SymptomSummaryCardProps) {
  const [showAdditional, setShowAdditional] = useState(false);

  const info = data.additional_info;
  const hasAdditional =
    (info.triggers && info.triggers.length > 0) ||
    (info.relieving_factors && info.relieving_factors.length > 0) ||
    (info.medical_history && info.medical_history.length > 0) ||
    (info.current_medications && info.current_medications.length > 0) ||
    (info.allergies && info.allergies.length > 0);

  return (
    <div className="my-2 rounded-lg border border-emerald-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-emerald-50/80">
        <div className="flex items-center gap-2 text-emerald-700">
          <ClipboardList size={18} />
          <span className="font-medium text-sm">
            症状摘要
          </span>
        </div>
        <span className="text-xs text-gray-500">{data.report_date}</span>
      </div>

      {/* Chief complaint */}
      <div className="px-4 py-2.5 border-b border-gray-100 bg-emerald-50/30">
        <p className="text-xs text-gray-500 mb-0.5">
          主诉
        </p>
        <p className="text-sm text-gray-800 font-medium">
          {data.chief_complaint}
        </p>
      </div>

      {/* Symptom list */}
      <div className="divide-y divide-gray-100">
        {data.symptoms.map((symptom) => (
          <div key={symptom.id} className="px-4 py-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                  {symptom.body_part}
                </span>
                <span className="text-sm text-gray-800">
                  {symptom.description}
                </span>
              </div>
              <SeverityBar value={symptom.severity} />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 pl-0.5">
              <span>持续 {symptom.duration}</span>
              {symptom.frequency && <span>· {symptom.frequency}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Additional info (collapsible) */}
      {hasAdditional && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowAdditional(!showAdditional)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50/50 transition-colors"
          >
            {showAdditional ? (
              <ChevronDown size={14} className="text-gray-400" />
            ) : (
              <ChevronRight size={14} className="text-gray-400" />
            )}
            <span>补充信息</span>
          </button>

          {showAdditional && (
            <div className="px-4 pb-3 pl-10 space-y-2 text-sm">
              {info.triggers && info.triggers.length > 0 && (
                <InfoRow
                  label="诱发因素"
                  items={info.triggers}
                />
              )}
              {info.relieving_factors && info.relieving_factors.length > 0 && (
                <InfoRow
                  label="缓解因素"
                  items={info.relieving_factors}
                />
              )}
              {info.medical_history && info.medical_history.length > 0 && (
                <InfoRow
                  label="既往病史"
                  items={info.medical_history}
                />
              )}
              {info.current_medications &&
                info.current_medications.length > 0 && (
                  <InfoRow
                    label="当前用药"
                    items={info.current_medications}
                  />
                )}
              {info.allergies && info.allergies.length > 0 && (
                <InfoRow
                  label="过敏史"
                  items={info.allergies}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <span className="text-gray-500 text-xs">{label}：</span>
      <span className="text-gray-700 text-xs">{items.join("、")}</span>
    </div>
  );
}
