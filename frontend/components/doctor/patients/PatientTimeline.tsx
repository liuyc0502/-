"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, FileText, TestTube, Pill, TrendingUp, Filter } from "lucide-react";

interface PatientTimelineProps {
  patientId: string;
}

const timelineStages = [
  { id: 1, label: "初诊", date: "2024-10-01", status: "completed" },
  { id: 2, label: "检查", date: "2024-10-05", status: "completed" },
  { id: 3, label: "确诊", date: "2024-10-10", status: "completed" },
  { id: 4, label: "治疗中", date: "2024-11-14", status: "current" },
  { id: 5, label: "随访", date: "待定", status: "pending" },
];

const visitRecords = [
  {
    id: 1,
    date: "2024-11-14",
    diagnosis: "类风湿关节炎复查",
    complaints: "双膝关节肿痛减轻",
    medications: ["甲氨蝶呤 15mg/周", "叶酸 5mg/日"],
    tests: ["血常规", "ESR", "CRP"],
    notes: "炎症指标下降，继续现有治疗方案",
  },
  {
    id: 2,
    date: "2024-11-10",
    diagnosis: "类风湿关节炎",
    complaints: "双膝关节肿痛加重",
    medications: ["甲氨蝶呤 10mg/周", "叶酸 5mg/日"],
    tests: ["RF", "抗CCP抗体"],
    notes: "调整甲氨蝶呤剂量至15mg/周",
  },
  {
    id: 3,
    date: "2024-11-05",
    diagnosis: "类风湿关节炎",
    complaints: "晨僵明显",
    medications: ["甲氨蝶呤 10mg/周"],
    tests: ["肝功能", "肾功能"],
    notes: "肝肾功能正常，继续用药",
  },
];

export function PatientTimeline({ patientId }: PatientTimelineProps) {
  const [selectedRecord, setSelectedRecord] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Timeline Progress Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-900">张三的就诊历程</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              筛选时间
            </Button>
          </div>
        </div>

        <div className="relative flex items-center justify-between">
          {timelineStages.map((stage, index) => (
            <div key={stage.id} className="flex flex-col items-center relative z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  stage.status === "completed"
                    ? "bg-green-500 text-white"
                    : stage.status === "current"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-500 border-2 border-gray-300"
                }`}
              >
                {stage.status === "completed" ? "✓" : stage.id}
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm font-semibold text-gray-900">{stage.label}</div>
                <div className="text-xs text-gray-500 mt-1">{stage.date}</div>
              </div>
              {index < timelineStages.length - 1 && (
                <div
                  className={`absolute top-5 left-1/2 w-full h-0.5 ${
                    stage.status === "completed" ? "bg-green-500" : "bg-gray-200"
                  }`}
                  style={{ transform: "translateX(50%)" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Split Layout: Visit Records (70%) + Sidebar (30%) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Visit Records Grid */}
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-2 gap-4">
            {visitRecords.map((record) => (
              <Card
                key={record.id}
                className="bg-white border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedRecord(record.id)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {record.date}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-gray-900">{record.diagnosis}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{record.complaints}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Pill className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{record.medications[0]}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <TestTube className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{record.tests.join(", ")}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500">{record.notes}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* AI Analysis Large Card */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 row-span-2">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <h3 className="font-bold text-purple-900">AI阶段性分析</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  患者病情呈现好转趋势，近3次复查显示炎症指标逐步下降。
                  用药方案调整后效果明显，建议继续观察。
                </p>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <div className="text-xs font-semibold text-gray-500 mb-2">炎症指标趋势</div>
                  <div className="h-24 flex items-end justify-between gap-1">
                    {[45, 38, 32, 28, 25].map((value, index) => (
                      <div key={index} className="flex-1 bg-purple-200 rounded-t" style={{ height: `${value}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>10/01</span>
                    <span>11/14</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-purple-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">AI建议</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full">
                      +
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    建议增加维生素D补充，注意监测肝功能
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: Sidebar with Key Info */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Current Stage Summary */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-sm font-bold">当前治疗阶段</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-semibold text-gray-700">阶段:</span>
                <span className="ml-2 text-gray-600">治疗中</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">用药方案:</span>
                <ul className="mt-2 space-y-1 text-gray-600 pl-4 list-disc">
                  <li>甲氨蝶呤 15mg/周</li>
                  <li>叶酸 5mg/日</li>
                </ul>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <span className="font-semibold text-gray-700">注意事项:</span>
                <p className="mt-1 text-gray-600">定期监测肝肾功能，避免饮酒</p>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Trend */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-sm font-bold">关键指标趋势</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ESR (血沉)</span>
                  <span className="text-green-600 font-semibold">↓ 25 mm/h</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "60%" }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">CRP (C反应蛋白)</span>
                  <span className="text-green-600 font-semibold">↓ 8 mg/L</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "40%" }} />
                </div>
              </div>
              <button className="text-[#D94527] hover:underline text-xs mt-2">
                查看完整趋势图 →
              </button>
            </CardContent>
          </Card>

          {/* Next Visit Reminder */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-blue-900">下次就诊提醒</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-semibold text-gray-700">复查时间:</span>
                <span className="ml-2 text-gray-900">2024-11-19</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">需准备:</span>
                <ul className="mt-1 space-y-1 text-gray-600 pl-4 list-disc">
                  <li>空腹抽血</li>
                  <li>携带用药记录</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Related Cases (AI Generated) */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-sm font-bold">相关病例推荐</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { id: 1, similarity: 87, match: "类似用药方案" },
                { id: 2, similarity: 82, match: "相似症状表现" },
              ].map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-900">病例 #023{caseItem.id}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {caseItem.similarity}% 相似
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{caseItem.match}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
