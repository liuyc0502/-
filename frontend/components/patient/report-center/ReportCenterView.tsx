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
    <div className="h-full flex flex-col bg-app-surface overflow-hidden">
      {/* Header with Tab Navigation */}
      <div className="bg-app-surface border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">报告解读</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-14 rounded-xl border border-gray-200 bg-white p-1">
              <TabsTrigger
                value="reports"
                className="h-12 rounded-lg border border-transparent bg-white px-8 py-3 text-base font-bold text-gray-600 hover:bg-gray-50 data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none"
              >
                报告列表
              </TabsTrigger>
              <TabsTrigger
                value="trends"
                className="h-12 rounded-lg border border-transparent bg-white px-8 py-3 text-base font-bold text-gray-600 hover:bg-gray-50 data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none"
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
