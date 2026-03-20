"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import type { PatientReportInterpretation, PatientInterpretationSection } from "@/types/reportCenter";

interface ReportInterpretationDetailProps {
  interpretation: PatientReportInterpretation;
  onReinterpret: () => void;
  isReinterpreting?: boolean;
}

const severityBanner: Record<string, { bg: string; text: string; border: string }> = {
  green: { bg: "bg-green-50", text: "text-green-800", border: "border-green-200" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200" },
  red: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" },
};

const statusColor: Record<string, string> = {
  normal: "text-green-600",
  abnormal: "text-red-600",
  warning: "text-yellow-600",
};

export function ReportInterpretationDetail({
  interpretation,
  onReinterpret,
  isReinterpreting,
}: ReportInterpretationDetailProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const banner = severityBanner[interpretation.severity] || severityBanner.green;

  return (
    <div className="space-y-4">
      {/* Severity banner */}
      <div className={`rounded-lg px-4 py-3 border ${banner.bg} ${banner.border}`}>
        <span className={`font-semibold text-base ${banner.text}`}>
          {interpretation.severity_label}
        </span>
      </div>

      {/* Plain summary */}
      <div className="bg-gray-50 rounded-lg px-4 py-3">
        <p className="text-gray-700 leading-relaxed">{interpretation.plain_summary}</p>
      </div>

      {/* Collapsible sections */}
      {interpretation.sections?.map((section: PatientInterpretationSection) => {
        const isCollapsed = collapsedSections.has(section.id);
        return (
          <div
            key={section.id}
            className={`border rounded-lg overflow-hidden ${section.highlight ? "border-yellow-300 bg-yellow-50/30" : "border-gray-200"}`}
          >
            <button
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              onClick={() => toggleSection(section.id)}
            >
              <span className="font-medium text-gray-900">
                {section.icon} {section.title}
              </span>
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {!isCollapsed && (
              <div className="px-4 pb-3 border-t border-gray-100 pt-3">
                {section.content && (
                  <p className="text-base text-gray-600 leading-relaxed">{section.content}</p>
                )}
                {section.items && section.items.length > 0 && (
                  <div className="space-y-2 mt-1">
                    {section.items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-base">
                        <span className="font-medium text-gray-700 min-w-0">
                          {item.label}
                        </span>
                        {item.value && (
                          <span className={`font-mono ${statusColor[item.status || "normal"] || "text-gray-600"}`}>
                            {item.value}
                          </span>
                        )}
                        {item.explanation && (
                          <span className="text-gray-500 ml-1">{item.explanation}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Next steps */}
      {interpretation.next_steps && interpretation.next_steps.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <h4 className="font-medium text-blue-800 mb-2">下一步建议</h4>
          <ul className="space-y-1">
            {interpretation.next_steps.map((step, idx) => (
              <li key={idx} className="text-base text-blue-700 flex items-start gap-2">
                <span className="mt-0.5">&bull;</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      {interpretation.disclaimer && (
        <p className="text-xs text-gray-400 leading-relaxed">
          {interpretation.disclaimer}
        </p>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onReinterpret}
          disabled={isReinterpreting}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isReinterpreting ? "animate-spin" : ""}`} />
          重新解读
        </Button>
      </div>
    </div>
  );
}
