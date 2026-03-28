"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import type { ReportInterpretationData } from "@/types/reportInterpretation";
import { cardSurface, reportCardTheme } from "./cardTheme";

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
    <div className={`my-2 overflow-hidden rounded-xl border bg-white shadow-sm ${reportCardTheme.border}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${cardSurface.headerBorder} ${reportCardTheme.headerBg}`}>
        <div className={`flex items-center gap-2 ${reportCardTheme.headerText}`}>
          <BookOpen size={18} />
          <span className={`font-medium text-sm ${cardSurface.textPrimary}`}>{data.report_title}</span>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${reportCardTheme.badgeBg} ${reportCardTheme.badgeText} ${reportCardTheme.badgeBorder}`}>
          结构化解读
        </span>
      </div>

      {/* Sections */}
      <div className={`divide-y ${cardSurface.sectionBorder}`}>
        {data.sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          return (
            <div key={section.id} className={section.highlight && isExpanded ? reportCardTheme.highlightBg : ""}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${cardSurface.hoverSoftBg}`}
              >
                {isExpanded ? <ChevronDown size={14} className={cardSurface.textMuted} /> : <ChevronRight size={14} className={cardSurface.textMuted} />}
                <span className="mr-1">{section.icon}</span>
                <span className={`font-medium ${section.highlight ? reportCardTheme.headerText : cardSurface.textPrimary}`}>
                  {section.title}
                </span>
              </button>

              {/* Section content */}
              {isExpanded && (
                <div className={`px-4 pb-3 pl-10 text-sm leading-relaxed ${cardSurface.textSecondary}`}>
                  {section.content && <p className="whitespace-pre-wrap">{section.content}</p>}
                  {section.items && section.items.length > 0 && (
                    <ul className="space-y-1.5 mt-1">
                      {section.items.map((item, idx) => (
                        <li key={idx}>
                          {item.term ? (
                            <div>
                              <span className={`font-medium ${cardSurface.textPrimary}`}>{item.term}</span>
                              <span className={cardSurface.textMuted}>：</span>
                              <span className={cardSurface.textSecondary}>{item.explanation}</span>
                            </div>
                          ) : (
                            <div className="flex items-start gap-1.5">
                              <span className={`mt-0.5 ${reportCardTheme.bullet}`}>•</span>
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
        <div className={`px-4 py-2 border-t ${cardSurface.headerBorder} ${cardSurface.softBg}`}>
          <p className={`text-xs mb-1 ${cardSurface.textMuted}`}>知识来源</p>
          <div className="flex flex-wrap gap-2">
            {data.source_references.map((ref, idx) => (
              <span key={idx} className={`rounded-full border px-2 py-0.5 text-xs ${reportCardTheme.badgeBg} ${reportCardTheme.badgeText} ${reportCardTheme.badgeBorder}`}>
                {ref.source}{ref.relevance ? ` — ${ref.relevance}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
