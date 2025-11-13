"use client";

import React, { useState } from "react";
import { PatientList } from "./PatientList";
import { PathologyPatientProfile } from "./PathologyPatientProfile";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export function PatientFileManager() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
  };

  const handleBackToList = () => {
    setSelectedPatientId(null);
  };

  if (selectedPatientId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Back button */}
        <div className="bg-white border-b px-6 py-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            返回病人列表
          </Button>
        </div>

        {/* Patient Profile */}
        <div className="flex-1 overflow-hidden">
          <PathologyPatientProfile />
        </div>
      </div>
    );
  }

  return <PatientList onPatientSelect={handlePatientSelect} />;
}
