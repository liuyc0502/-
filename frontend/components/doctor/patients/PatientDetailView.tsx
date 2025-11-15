"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientOverview } from "./PatientOverview";
import { PatientTimeline } from "./PatientTimeline";
import { PatientTodos } from "./PatientTodos";

interface PatientDetailViewProps {
  patientId: string;
  onBack: () => void;
}

export function PatientDetailView({ patientId, onBack }: PatientDetailViewProps) {
  const [activeTab, setActiveTab] = useState("overview");

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
            <h1 className="text-2xl font-bold text-gray-900">患者姓名: 张三</h1>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Reference Image 2 Style */}
      <div className="bg-gray-100 border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-14 p-0 gap-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-6 font-bold text-gray-600"
              >
                患者概览
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-6 font-bold text-gray-600"
              >
                诊疗时间线
              </TabsTrigger>
              <TabsTrigger
                value="todos"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-6 font-bold text-gray-600"
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
