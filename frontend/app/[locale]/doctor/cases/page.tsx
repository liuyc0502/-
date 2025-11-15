"use client";

import { useState } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { CaseLibraryView } from "@/components/doctor/cases/CaseLibraryView";
import { CaseDetailView } from "@/components/doctor/cases/CaseDetailView";

export default function CasesPage() {
  const { isLoading } = usePortalAuth("doctor");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("search");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA] text-[#6B6B6B]">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      {selectedCaseId ? (
        <CaseDetailView caseId={selectedCaseId} onBack={() => setSelectedCaseId(null)} />
      ) : (
        <CaseLibraryView activeTab={activeTab} onTabChange={setActiveTab} onSelectCase={setSelectedCaseId} />
      )}
    </div>
  );
}
