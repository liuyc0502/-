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

  if (selectedCaseId) {
    return <CaseDetailView caseId={selectedCaseId} onBack={() => setSelectedCaseId(null)} />;
  }

  return <CaseLibraryView activeTab={activeTab} onTabChange={setActiveTab} onSelectCase={setSelectedCaseId} />;
}
