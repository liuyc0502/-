"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BasicInfoTab } from "./BasicInfoTab";
import { DiagnosisHistoryTab } from "./DiagnosisHistoryTab";
import { ReportsTab } from "./ReportsTab";
import { TimelineTab } from "./TimelineTab";

export function PatientProfileView() {
  const [activeTab, setActiveTab] = useState("basic");

  return (
    <div className="h-full flex flex-col bg-[#F4FBF7] overflow-hidden">
      {/* Header with Tab Navigation */}
      <div className="bg-[#F4FBF7] border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">我的档案</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-100 h-14 p-1 gap-1">
              <TabsTrigger
                value="basic"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                基本信息
              </TabsTrigger>
              <TabsTrigger
                value="diagnosis"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                诊断记录
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                检查报告
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                就诊时间线
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="basic" className="mt-0">
              <BasicInfoTab />
            </TabsContent>
            <TabsContent value="diagnosis" className="mt-0">
              <DiagnosisHistoryTab />
            </TabsContent>
            <TabsContent value="reports" className="mt-0">
              <ReportsTab />
            </TabsContent>
            <TabsContent value="timeline" className="mt-0">
              <TimelineTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
