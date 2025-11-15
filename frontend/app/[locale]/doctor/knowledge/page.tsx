"use client";

import { useState } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { KnowledgeBaseView } from "@/components/doctor/knowledge/KnowledgeBaseView";
import { KnowledgeDetailView } from "@/components/doctor/knowledge/KnowledgeDetailView";

export default function KnowledgePage() {
  const { isLoading } = usePortalAuth("doctor");
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA] text-[#6B6B6B]">
        Loading...
      </div>
    );
  }

  if (selectedKnowledgeId) {
    return <KnowledgeDetailView knowledgeId={selectedKnowledgeId} onBack={() => setSelectedKnowledgeId(null)} />;
  }

  return <KnowledgeBaseView onSelectKnowledge={setSelectedKnowledgeId} />;
}
