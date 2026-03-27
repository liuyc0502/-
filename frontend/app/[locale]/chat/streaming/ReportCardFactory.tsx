"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import type { ReportCardData } from "@/types/chat";
import ReportInterpretationCard from "./ReportInterpretationCard";
import QCCheckCard from "./QCCheckCard";
import SymptomSummaryCard from "./SymptomSummaryCard";
import TriageRecommendationCard from "./TriageRecommendationCard";
import ReasoningChainCard from "./ReasoningChainCard";
import ConsultationReportCard from "./ConsultationReportCard";
import KnowledgeGraphCard from "./KnowledgeGraphCard";

interface ReportCardFactoryProps {
  data: ReportCardData;
}

function renderCard(data: ReportCardData) {
  switch (data.card_type) {
    case "report_interpretation":
      return <ReportInterpretationCard data={data} />;
    case "qc_check":
      return <QCCheckCard data={data} />;
    case "symptom_summary":
      return <SymptomSummaryCard data={data} />;
    case "triage_recommendation":
      return <TriageRecommendationCard data={data} />;
    case "reasoning_chain":
      return <ReasoningChainCard data={data} />;
    case "consultation_report":
      return <ConsultationReportCard data={data as any} />;
    case "knowledge_graph":
      return <KnowledgeGraphCard data={data as any} />;
    default:
      return null;
  }
}

function FullscreenModal({
  data,
  onClose,
}: {
  data: ReportCardData;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Content container */}
      <div
        className="relative w-[90vw] max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="sticky top-3 float-right mr-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors shadow-sm"
          title="关闭"
        >
          <X size={16} />
        </button>

        {/* Render the card at larger scale */}
        <div className="p-4 [&>div]:my-0 [&>div]:shadow-none [&>div]:border-0">
          {renderCard(data)}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ReportCardFactory({ data }: ReportCardFactoryProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const openFullscreen = useCallback(() => setFullscreen(true), []);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  const card = renderCard(data);
  if (!card) return null;

  return (
    <>
      <div className="relative group">
        {/* Expand button - top right corner */}
        <button
          onClick={openFullscreen}
          className="absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-md bg-white/80 hover:bg-white text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-gray-200"
          title="放大查看"
        >
          <Maximize2 size={14} />
        </button>
        {card}
      </div>

      {fullscreen && <FullscreenModal data={data} onClose={closeFullscreen} />}
    </>
  );
}
