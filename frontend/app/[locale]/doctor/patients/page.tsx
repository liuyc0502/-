"use client";

import { useState } from "react";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { PatientListView } from "@/components/doctor/patients/PatientListView";
import { PatientDetailView } from "@/components/doctor/patients/PatientDetailView";

export default function PatientsPage() {
  const { isLoading } = usePortalAuth("doctor");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA] text-[#6B6B6B]">
        Loading...
      </div>
    );
  }

  if (selectedPatientId) {
    return (
      <PatientDetailView
        patientId={selectedPatientId}
        onBack={() => setSelectedPatientId(null)}
      />
    );
  }

  return <PatientListView onSelectPatient={setSelectedPatientId} />;
}
