"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Pill, Activity, AlertCircle, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

// Mock data
const mockTodayPlan = {
  date: "2025-11-17",
  medications: [
    {
      id: "1",
      name: "奥美拉唑肠溶胶囊",
      dosage: "20mg",
      time: "08:00",
      completed: true,
      notes: "饭前30分钟服用"
    },
    {
      id: "2",
      name: "复合维生素片",
      dosage: "1片",
      time: "12:00",
      completed: false,
      notes: "饭后服用"
    },
    {
      id: "3",
      name: "奥美拉唑肠溶胶囊",
      dosage: "20mg",
      time: "20:00",
      completed: false,
      notes: "饭前30分钟服用"
    }
  ],
  tasks: [
    {
      id: "1",
      title: "步行30分钟",
      description: "在小区内慢走，注意不要剧烈运动",
      completed: true,
      category: "运动"
    },
    {
      id: "2",
      title: "伤口换药",
      description: "保持伤口清洁干燥，观察有无红肿",
      completed: false,
      category: "护理"
    },
    {
      id: "3",
      title: "记录体温",
      description: "早晚各测量一次，如超过37.5℃及时就医",
      completed: false,
      category: "监测"
    }
  ],
  precautions: [
    "避免剧烈运动，以散步为主",
    "饮食清淡，避免辛辣刺激食物",
    "保持伤口清洁干燥",
    "如有发热、疼痛加剧等情况及时就医"
  ]
};

const mockWeeklyProgress = {
  completionRate: 85,
  medicationCompliance: 90,
  taskCompletion: 80,
  weekData: [
    { day: "周一", completion: 90 },
    { day: "周二", completion: 85 },
    { day: "周三", completion: 80 },
    { day: "周四", completion: 85 },
    { day: "周五", completion: 90 },
    { day: "周六", completion: 75 },
    { day: "周日", completion: 85 }
  ]
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    "运动": "bg-blue-100 text-blue-700 border-blue-200",
    "护理": "bg-green-100 text-green-700 border-green-200",
    "监测": "bg-purple-100 text-purple-700 border-purple-200",
    "饮食": "bg-orange-100 text-orange-700 border-orange-200"
  };
  return colors[category] || "bg-gray-100 text-gray-700 border-gray-200";
};

export function CarePlanView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medicationStates, setMedicationStates] = useState<Record<string, boolean>>(
    Object.fromEntries(mockTodayPlan.medications.map(m => [m.id, m.completed]))
  );
  const [taskStates, setTaskStates] = useState<Record<string, boolean>>(
    Object.fromEntries(mockTodayPlan.tasks.map(t => [t.id, t.completed]))
  );

  const completedMedications = Object.values(medicationStates).filter(Boolean).length;
  const completedTasks = Object.values(taskStates).filter(Boolean).length;
  const totalItems = mockTodayPlan.medications.length + mockTodayPlan.tasks.length;
  const completedItems = completedMedications + completedTasks;
  const todayCompletionRate = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="h-full flex flex-col bg-[#F4FBF7] overflow-hidden">
      {/* Header */}
      <div className="bg-[#F4FBF7] border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center ">
          <h1 className="text-3xl font-bold text-gray-900">康复计划</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5 space-y-5">
          {/* Date Selector */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#10B981]" />
                    {mockTodayPlan.date} (今天)
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    完成度: <span className="font-bold text-[#10B981]">{todayCompletionRate}%</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Column - Today's Plan */}
            <div className="lg:col-span-2 space-y-5">
              {/* Medications Section */}
              <Card className="bg-white border-gray-200">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Pill className="h-5 w-5 text-[#10B981]" />
                      用药提醒
                    </h2>
                    <div className="text-sm text-gray-600">
                      {completedMedications}/{mockTodayPlan.medications.length} 已完成
                    </div>
                  </div>

                  <div className="space-y-3">
                    {mockTodayPlan.medications.map((med) => (
                      <div
                        key={med.id}
                        className={`p-4 rounded-lg border transition-all ${
                          medicationStates[med.id]
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={medicationStates[med.id]}
                            onCheckedChange={(checked) =>
                              setMedicationStates(prev => ({ ...prev, [med.id]: checked as boolean }))
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className={`font-bold ${medicationStates[med.id] ? "text-gray-500 line-through" : "text-gray-900"}`}>
                                {med.name}
                              </h3>
                              <div className="text-sm font-semibold text-gray-600">
                                {med.time}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              剂量: {med.dosage}
                            </div>
                            {med.notes && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {med.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full text-[#10B981] border-[#10B981] hover:bg-[#10B981] hover:text-white"
                  >
                    查看用药详情
                  </Button>
                </CardContent>
              </Card>

              {/* Recovery Tasks Section */}
              <Card className="bg-white border-gray-200">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-[#10B981]" />
                      康复任务
                    </h2>
                    <div className="text-sm text-gray-600">
                      {completedTasks}/{mockTodayPlan.tasks.length} 已完成
                    </div>
                  </div>

                  <div className="space-y-3">
                    {mockTodayPlan.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-4 rounded-lg border transition-all ${
                          taskStates[task.id]
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={taskStates[task.id]}
                            onCheckedChange={(checked) =>
                              setTaskStates(prev => ({ ...prev, [task.id]: checked as boolean }))
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-bold ${taskStates[task.id] ? "text-gray-500 line-through" : "text-gray-900"}`}>
                                {task.title}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(task.category)}`}>
                                {task.category}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{task.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full text-[#10B981] border-[#10B981] hover:bg-[#10B981] hover:text-white"
                  >
                    记录完成情况
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Progress & Precautions */}
            <div className="space-y-5">
              {/* Weekly Progress */}
              <Card className="bg-white border-gray-200">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#10B981]" />
                    本周进度
                  </h3>

                  <div className="space-y-3">
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-green-200">
                      <div className="text-3xl font-bold text-[#10B981]">
                        {mockWeeklyProgress.completionRate}%
                      </div>
                      <div className="text-sm text-gray-600 mt-1">平均完成率</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">用药依从性</span>
                        <span className="font-bold text-gray-900">{mockWeeklyProgress.medicationCompliance}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-[#10B981] h-2 rounded-full" style={{ width: `${mockWeeklyProgress.medicationCompliance}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">任务完成率</span>
                        <span className="font-bold text-gray-900">{mockWeeklyProgress.taskCompletion}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${mockWeeklyProgress.taskCompletion}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Week Chart */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-2">每日完成度</div>
                    <div className="flex items-end justify-between gap-1 h-24">
                      {mockWeeklyProgress.weekData.map((day, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-gray-200 rounded-t flex items-end" style={{ height: "80px" }}>
                            <div
                              className="w-full bg-[#10B981] rounded-t transition-all"
                              style={{ height: `${day.completion}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500">{day.day.slice(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full bg-[#10B981] hover:bg-[#059669] text-white">
                    查看详细统计
                  </Button>
                </CardContent>
              </Card>

              {/* Precautions */}
              <Card className="bg-white border-gray-200">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    注意事项
                  </h3>

                  <ul className="space-y-2">
                    {mockTodayPlan.precautions.map((item, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="outline"
                    className="w-full text-gray-600 hover:bg-gray-100"
                  >
                    向AI咨询
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
