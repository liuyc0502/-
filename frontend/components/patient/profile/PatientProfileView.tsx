"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BasicInfoTab } from "./BasicInfoTab";
import { DiagnosisHistoryTab } from "./DiagnosisHistoryTab";
import { TimelineTab } from "./TimelineTab";

export function PatientProfileView() {
  const [activeTab, setActiveTab] = useState("basic");

  return (
    <div className="h-full flex flex-col bg-app-surface overflow-hidden">
      {/* Header with Tab Navigation */}
      <div className="bg-app-surface border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">我的档案</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-14 rounded-xl border border-gray-200 bg-white p-1">
              <TabsTrigger
                value="basic"
                className="h-12 rounded-lg border border-transparent bg-white px-8 py-3 text-base font-bold text-gray-600 hover:bg-gray-50 data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none"
              >
                基本信息
              </TabsTrigger>
              <TabsTrigger
                value="diagnosis"
                className="h-12 rounded-lg border border-transparent bg-white px-8 py-3 text-base font-bold text-gray-600 hover:bg-gray-50 data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none"
              >
                诊断记录
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="h-12 rounded-lg border border-transparent bg-white px-8 py-3 text-base font-bold text-gray-600 hover:bg-gray-50 data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none"
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
            <TabsContent value="timeline" className="mt-0">
              <TimelineTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
