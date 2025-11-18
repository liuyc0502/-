"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Pill, Activity, AlertCircle, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { App } from "antd";
import { useAuth } from "@/hooks/useAuth";
import patientService from "@/services/patientService";
import carePlanService from "@/services/carePlanService";
import type { TodayPlanResponse, WeeklyProgressResponse } from "@/types/carePlan";
import type { Patient } from "@/types/patient";

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
  const { user } = useAuth();
  const { message } = App.useApp();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todayPlan, setTodayPlan] = useState<TodayPlanResponse | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Load patient profile first
  useEffect(() => {
    const loadPatientProfile = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const data = await patientService.getPatientByEmail(user.email);
        setPatient(data);
      } catch (error: any) {
        console.error("Failed to load patient profile:", error);
        message.error("加载患者档案失败");
        setLoading(false);
      }
    };

    loadPatientProfile();
  }, [user?.email, message]);

  // Load care plan data when patient is loaded
  useEffect(() => {
    if (patient?.patient_id) {
      loadTodayPlan();
      loadWeeklyProgress();
    }
  }, [patient?.patient_id, selectedDate]);

  const loadTodayPlan = async () => {
    if (!patient?.patient_id) return;

    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const plan = await carePlanService.getTodayPlan(patient.patient_id, dateStr);
      setTodayPlan(plan);
    } catch (error) {
      message.error("加载康复计划失败");
      console.error("Failed to load today's plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyProgress = async () => {
    if (!patient?.patient_id) return;

    try {
      const progress = await carePlanService.getWeeklyProgress(patient.patient_id);
      setWeeklyProgress(progress);
    } catch (error) {
      console.error("Failed to load weekly progress:", error);
    }
  };

  const handleCompletionChange = async (
    itemType: 'medication' | 'task',
    itemId: number,
    completed: boolean
  ) => {
    if (!todayPlan || !patient?.patient_id) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await carePlanService.recordCompletion({
        plan_id: todayPlan.plan_id,
        patient_id: patient.patient_id,
        record_date: dateStr,
        item_type: itemType,
        item_id: itemId,
        completed,
      });

      // Update local state
      if (itemType === 'medication') {
        setTodayPlan({
          ...todayPlan,
          medications: todayPlan.medications.map(med =>
            med.medication_id === itemId ? { ...med, completed } : med
          ),
        });
      } else {
        setTodayPlan({
          ...todayPlan,
          tasks: todayPlan.tasks.map(task =>
            task.task_id === itemId ? { ...task, completed } : task
          ),
        });
      }

      // Reload weekly progress to reflect changes
      loadWeeklyProgress();
    } catch (error) {
      message.error("保存失败，请重试");
      console.error("Failed to record completion:", error);
    }
  };

  const completedMedications = todayPlan?.medications.filter(m => m.completed).length || 0;
  const completedTasks = todayPlan?.tasks.filter(t => t.completed).length || 0;
  const totalItems = (todayPlan?.medications.length || 0) + (todayPlan?.tasks.length || 0);
  const completedItems = completedMedications + completedTasks;
  const todayCompletionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

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
                    {todayPlan?.date || selectedDate.toISOString().split('T')[0]} (今天)
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
                      {completedMedications}/{todayPlan?.medications.length || 0} 已完成
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-8 text-gray-500">加载中...</div>
                  ) : !todayPlan || todayPlan.medications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">今日暂无用药安排</div>
                  ) : (
                    <div className="space-y-3">
                      {todayPlan.medications.map((med) => (
                        <div
                          key={med.medication_id}
                          className={`p-4 rounded-lg border transition-all ${
                            med.completed
                              ? "bg-green-50 border-green-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={med.completed || false}
                              onCheckedChange={(checked) =>
                                handleCompletionChange('medication', med.medication_id, checked as boolean)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className={`font-bold ${med.completed ? "text-gray-500 line-through" : "text-gray-900"}`}>
                                  {med.medication_name}
                                </h3>
                                {med.time_slots && med.time_slots.length > 0 && (
                                  <div className="text-sm font-semibold text-gray-600">
                                    {med.time_slots.join(', ')}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                剂量: {med.dosage} · 频率: {med.frequency}
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
                  )}
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
                      {completedTasks}/{todayPlan?.tasks.length || 0} 已完成
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-8 text-gray-500">加载中...</div>
                  ) : !todayPlan || todayPlan.tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">今日暂无康复任务</div>
                  ) : (
                    <div className="space-y-3">
                      {todayPlan.tasks.map((task) => (
                        <div
                          key={task.task_id}
                          className={`p-4 rounded-lg border transition-all ${
                            task.completed
                              ? "bg-green-50 border-green-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={task.completed || false}
                              onCheckedChange={(checked) =>
                                handleCompletionChange('task', task.task_id, checked as boolean)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-bold ${task.completed ? "text-gray-500 line-through" : "text-gray-900"}`}>
                                  {task.task_title}
                                </h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(task.task_category)}`}>
                                  {task.task_category}
                                </span>
                              </div>
                              {task.task_description && (
                                <p className="text-sm text-gray-600">{task.task_description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

                  {weeklyProgress ? (
                    <>
                      <div className="space-y-3">
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-green-200">
                          <div className="text-3xl font-bold text-[#10B981]">
                            {weeklyProgress.completionRate}%
                          </div>
                          <div className="text-sm text-gray-600 mt-1">平均完成率</div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">用药依从性</span>
                            <span className="font-bold text-gray-900">{weeklyProgress.medicationCompliance}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-[#10B981] h-2 rounded-full" style={{ width: `${weeklyProgress.medicationCompliance}%` }}></div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">任务完成率</span>
                            <span className="font-bold text-gray-900">{weeklyProgress.taskCompletion}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${weeklyProgress.taskCompletion}%` }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Week Chart */}
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 mb-2">每日完成度</div>
                        <div className="flex items-end justify-between gap-1 h-24">
                          {weeklyProgress.weekData.map((day, index) => (
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
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">加载中...</div>
                  )}

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

                  {!todayPlan || todayPlan.precautions.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">暂无注意事项</div>
                  ) : (
                    <ul className="space-y-2">
                      {todayPlan.precautions.map((item, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

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
