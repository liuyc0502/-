"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import patientService from "@/services/patientService";
import type { Patient } from "@/types/patient";
import { ReportListTab } from "./ReportListTab";
import { MetricTrendsTab } from "./MetricTrendsTab";

export function ReportCenterView() {
  const [activeTab, setActiveTab] = useState("reports");
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPatient = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      try {
        const data = await patientService.getPatientByEmail(user.email);
        setPatient(data);
      } catch (error) {
        console.error("Failed to load patient:", error);
      } finally {
        setLoading(false);
      }
    };
    loadPatient();
  }, [user?.email]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        加载中...
      </div>
    );
  }

  if (!patient?.patient_id) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        未找到患者信息
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header with Tab Navigation */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">报告解读</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-100 h-14 p-1 gap-1 rounded-full">
              <TabsTrigger
                value="reports"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                报告列表
              </TabsTrigger>
              <TabsTrigger
                value="trends"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                指标趋势
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="reports" className="mt-0">
              <ReportListTab patientId={patient.patient_id} />
            </TabsContent>
            <TabsContent value="trends" className="mt-0">
              <MetricTrendsTab patientId={patient.patient_id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
