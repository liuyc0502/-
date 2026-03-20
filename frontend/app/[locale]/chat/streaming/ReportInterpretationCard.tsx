"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import type { ReportInterpretationData } from "@/types/reportInterpretation";

interface ReportInterpretationCardProps {
  data: ReportInterpretationData;
}

export default function ReportInterpretationCard({ data }: ReportInterpretationCardProps) {
  // Default: expand the highlighted section (core_diagnosis), collapse others
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    data.sections.forEach((s) => {
      if (s.highlight) initial.add(s.id);
    });
    // If nothing is highlighted, expand the first section
    if (initial.size === 0 && data.sections.length > 0) {
      initial.add(data.sections[0].id);
    }
    return initial;
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="my-2 rounded-lg border border-blue-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-blue-50/80">
        <div className="flex items-center gap-2 text-blue-700">
          <BookOpen size={18} />
          <span className="font-medium text-sm">{data.report_title}</span>
        </div>
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 border border-blue-200">
          结构化解读
        </span>
      </div>

      {/* Sections */}
      <div className="divide-y divide-gray-100">
        {data.sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          return (
            <div key={section.id} className={section.highlight && isExpanded ? "bg-blue-50/30" : ""}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50/50 transition-colors"
              >
                {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                <span className="mr-1">{section.icon}</span>
                <span className={`font-medium ${section.highlight ? "text-blue-700" : "text-gray-700"}`}>
                  {section.title}
                </span>
              </button>

              {/* Section content */}
              {isExpanded && (
                <div className="px-4 pb-3 pl-10 text-sm text-gray-700 leading-relaxed">
                  {section.content && <p className="whitespace-pre-wrap">{section.content}</p>}
                  {section.items && section.items.length > 0 && (
                    <ul className="space-y-1.5 mt-1">
                      {section.items.map((item, idx) => (
                        <li key={idx}>
                          {item.term ? (
                            <div>
                              <span className="font-medium text-gray-800">{item.term}</span>
                              <span className="text-gray-500">：</span>
                              <span className="text-gray-600">{item.explanation}</span>
                            </div>
                          ) : (
                            <div className="flex items-start gap-1.5">
                              <span className="text-blue-400 mt-0.5">•</span>
                              <span>{item.text || item.explanation}</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Source references */}
      {data.source_references && data.source_references.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400 mb-1">知识来源</p>
          <div className="flex flex-wrap gap-2">
            {data.source_references.map((ref, idx) => (
              <span key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {ref.source}{ref.relevance ? ` — ${ref.relevance}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
