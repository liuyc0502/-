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

interface PatientDetailViewProps {
  patientId: string;
  onBack: () => void;
}

export function PatientDetailView({ patientId, onBack }: PatientDetailViewProps) {
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
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 px-8 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
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
        </div>
      </div>

      {/* Tab Navigation - Reference Image 2 Style */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-gray-100 h-14 p-1 gap-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base text-gray-600"
              >
                患者概览
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base text-gray-600"
              >
                诊疗时间线
              </TabsTrigger>
              <TabsTrigger
                value="todos"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base text-gray-600"
              >
                待办事项
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
              <PatientOverview patientId={patientId} />
            </TabsContent>
            <TabsContent value="timeline" className="mt-0">
              <PatientTimeline patientId={patientId} />
            </TabsContent>
            <TabsContent value="todos" className="mt-0">
              <PatientTodos patientId={patientId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
