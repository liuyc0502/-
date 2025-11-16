"use client";

import { useState,useEffect, useCallback} from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { KnowledgeBaseView } from "@/components/doctor/knowledge/KnowledgeBaseView";
import { KnowledgeDetailView } from "@/components/doctor/knowledge/KnowledgeDetailView";

export default function KnowledgePage() {
  const { isLoading } = usePortalAuth("doctor");
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string | null>(null);

  useEffect(()=>{
    console.log("=== [PAGE] selectedKnowledgeId state changed ===");
    console.log("[PAGE] New value:", selectedKnowledgeId);
  }, [selectedKnowledgeId]);

  const handleSelectKnowledge = useCallback((id: string) => {
    console.log("=== [PAGE] handleSelectKnowledge called ===");
    console.log("[PAGE] Received id:", id);
    setSelectedKnowledgeId(id);
  }, []);

  const handleClearSelection = useCallback(() => {
    console.log("=== [PAGE] handleClearSelection called ===");
    setSelectedKnowledgeId(null);
  }, []);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA] text-[#6B6B6B]">
        Loading...
      </div>
    );
  }

  
  return (
    <div className="h-screen overflow-hidden">
      <KnowledgeBaseView
        onSelectKnowledge={handleSelectKnowledge} 
        selectedKnowledgeId={selectedKnowledgeId}
        onClearSelection={handleClearSelection} 
      />
    </div>
  );
}
