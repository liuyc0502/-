"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { App } from "antd";
import patientService from "@/services/patientService";
import type { Patient } from "@/types/patient";
import { PatientOverview } from "./PatientOverview";
import { PatientTimeline } from "./PatientTimeline";
import { PatientTodos } from "./PatientTodos";
import { PatientCarePlans } from "./PatientCarePlans";

interface PatientDetailViewProps {
  patientId: string;
  onBack: () => void;
  onConversationClick?: (conversationId: number) => void;
}

export function PatientDetailView({ patientId, onBack, onConversationClick }: PatientDetailViewProps) {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState("overview");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPatientInfo();
  }, [patientId]);

  const loadPatientInfo = async () => {
    try {
      setLoading(true);
      const data = await patientService.getPatient(parseInt(patientId));
      setPatient(data);
    } catch (error) {
      message.error("加载患者信息失败");
      console.error("Failed to load patient:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-app-surface overflow-hidden">
      {/* Header with Tab Navigation */}
      <div className="bg-app-surface border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {loading ? (
              <h1 className="text-2xl font-bold text-gray-900">加载中...</h1>
            ) : patient ? (
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                 {patient.name} · {patient.gender} · {patient.age}岁
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  病历号: {patient.medical_record_no}
                </p>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">患者信息</h1>
            )}
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-14 gap-1 rounded-xl border border-gray-200 bg-transparent px-1">
              <TabsTrigger
                value="overview"
                className="h-12 rounded-lg border border-transparent bg-transparent px-8 py-3 text-base font-bold text-gray-600 hover:bg-[#F6F0EA] data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
              >
                患者概览
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="h-12 rounded-lg border border-transparent bg-transparent px-8 py-3 text-base font-bold text-gray-600 hover:bg-[#F6F0EA] data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
              >
                诊疗时间线
              </TabsTrigger>
              <TabsTrigger
                value="todos"
                className="h-12 rounded-lg border border-transparent bg-transparent px-8 py-3 text-base font-bold text-gray-600 hover:bg-[#F6F0EA] data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
              >
                待办事项
              </TabsTrigger>
              <TabsTrigger
                value="careplans"
                className="h-12 rounded-lg border border-transparent bg-transparent px-8 py-3 text-base font-bold text-gray-600 hover:bg-[#F6F0EA] data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
              >
                康复计划
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="overview" className="mt-0">
              <PatientOverview patientId={patientId} onConversationClick={onConversationClick} />
            </TabsContent>
            <TabsContent value="timeline" className="mt-0">
              <PatientTimeline patientId={patientId} onConversationClick={onConversationClick} />
            </TabsContent>
            <TabsContent value="todos" className="mt-0">
              <PatientTodos patientId={patientId} />
            </TabsContent>
            <TabsContent value="careplans" className="mt-0">
              <PatientCarePlans patientId={patientId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
