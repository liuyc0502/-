"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, TestTube, Pill, TrendingDown, AlertCircle, Users } from "lucide-react";
import { App } from "antd";
import patientService from "@/services/patientService";
import type { Patient, TimelineStage, PatientTodo } from "@/types/patient";

interface PatientOverviewProps {
  patientId: string;
}

export function PatientOverview({ patientId }: PatientOverviewProps) {
  const { message } = App.useApp();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timelines, setTimelines] = useState<TimelineStage[]>([]);
  const [todos, setTodos] = useState<PatientTodo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPatientInfo();
  }, [patientId]);

  const loadPatientInfo = async () => {
    try {
      setLoading(true);
      const [patientData, timelineData, todoData] = await Promise.all([
        patientService.getPatient(parseInt(patientId)),
        patientService.getPatientTimeline(parseInt(patientId)),
        patientService.getPatientTodos(parseInt(patientId)),
      ]);
      setPatient(patientData);
      setTimelines(timelineData);
      setTodos(todoData);
    } catch (error) {
      message.error("加载患者信息失败");
      console.error("Failed to load patient:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("zh-CN");
  };

  const formatDaysUntil = (dateString?: string): string => {
    if (!dateString) return "未设置";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "今天";
    if (diffDays === 1) return "明天";
    if (diffDays === 2) return "后天";
    if (diffDays > 0) return `${diffDays}天后`;
    if (diffDays < 0) return `已过期${Math.abs(diffDays)}天`;
    return "未设置";
  };

  const getStageIcon = (stageType: string) => {
    switch (stageType) {
      case "治疗":
        return Pill;
      case "检查":
        return TestTube;
      default:
        return FileText;
    }
  };

  // Computed values
  const visitCount = timelines.length;
  const pendingTodosCount = todos.filter((t) => t.status !== "completed").length;
  const urgentTodos = useMemo(
    () => todos.filter((t) => t.status !== "completed" && t.priority === "high").slice(0, 3),
    [todos]
  );
  const nextCheckup = useMemo(
    () =>
      todos
        .filter((t) => t.status !== "completed" && t.todo_type === "复查" && t.due_date)
        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0],
    [todos]
  );

  const recentTimelines = useMemo(
    () => timelines.slice(-5).reverse(),
    [timelines]
  );

  const checkCount = useMemo(
    () => timelines.filter((t) => t.stage_type === "检查").length,
    [timelines]
  );

  const completedCount = useMemo(
    () => timelines.filter((t) => t.status === "completed").length,
    [timelines]
  );

  const treatmentCount = useMemo(
    () => timelines.filter((t) => t.stage_type === "治疗").length,
    [timelines]
  );

  const followupCount = useMemo(
    () => timelines.filter((t) => t.stage_type === "随访").length,
    [timelines]
  );

  const latestTimeline = timelines.length > 0 ? timelines[timelines.length - 1] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#D94527] border-r-transparent mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">未找到患者信息</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column - 40% width */}
      <div className="col-span-12 lg:col-span-5 space-y-4">
        {/* Basic Info Card */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">姓名:</span>
                <span className="ml-2 font-medium">{patient.name}</span>
              </div>
              <div>
                <span className="text-gray-500">性别:</span>
                <span className="ml-2 font-medium">{patient.gender}</span>
              </div>
              <div>
                <span className="text-gray-500">年龄:</span>
                <span className="ml-2 font-medium">{patient.age}岁</span>
              </div>
              <div>
                <span className="text-gray-500">病历号:</span>
                <span className="ml-2 font-medium">{patient.medical_record_no}</span>
              </div>
            </div>
            {patient.date_of_birth && (
              <div className="text-sm">
                <span className="text-gray-500">出生日期:</span>
                <span className="ml-2 font-medium">{formatDate(patient.date_of_birth)}</span>
              </div>
            )}
            {patient.phone && (
              <div className="text-sm">
                <span className="text-gray-500">联系电话:</span>
                <span className="ml-2 font-medium">{patient.phone}</span>
              </div>
            )}
            {patient.email && (
              <div className="text-sm">
                <span className="text-gray-500">邮箱:</span>
                <span className="ml-2 font-medium">{patient.email}</span>
              </div>
            )}
            {patient.address && (
              <div className="text-sm">
                <span className="text-gray-500">地址:</span>
                <span className="ml-2 font-medium">{patient.address}</span>
              </div>
            )}
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-red-700">过敏史:</span>
                    <span className="ml-2 text-sm text-gray-700">{patient.allergies.join("、")}</span>
                  </div>
                </div>
              </div>
            )}
            {patient.family_history && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-semibold text-gray-700">家族史:</span>
                  <span className="ml-2 text-sm text-gray-600">{patient.family_history}</span>
                </div>
              </div>
            )}
            {patient.past_medical_history && patient.past_medical_history.length > 0 && (
              <div className="pt-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">既往病史:</p>
                <ul className="text-sm text-gray-600 space-y-1 pl-4 list-disc">
                  {patient.past_medical_history.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Treatment Summary Card */}
        {timelines.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="text-blue-600">诊疗摘要</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-gray-700 leading-relaxed">
                患者{patient.name}，{patient.age}岁{patient.gender}性，共有{visitCount}次就诊记录。
                {pendingTodosCount > 0 && (
                  <span>
                    {" "}
                    当前有<span className="bg-yellow-200 px-1 rounded">{pendingTodosCount}项待办事项</span>
                    需要处理。
                  </span>
                )}
              </p>
              {latestTimeline && (
                <p className="text-gray-700 leading-relaxed">
                  最近就诊：{latestTimeline.stage_title}
                  {latestTimeline.diagnosis && <span> - {latestTimeline.diagnosis}</span>}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{visitCount}</div>
              <div className="text-sm text-gray-500 mt-1">就诊次数</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${pendingTodosCount > 0 ? "text-red-600" : "text-gray-900"}`}>
                {pendingTodosCount}
              </div>
              <div className="text-sm text-gray-500 mt-1">待办事项</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{todos.length}</div>
              <div className="text-sm text-gray-500 mt-1">总任务数</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${nextCheckup ? "text-blue-600" : "text-gray-400"}`}>
                {nextCheckup ? formatDaysUntil(nextCheckup.due_date) : "未安排"}
              </div>
              <div className="text-sm text-gray-500 mt-1">下次复查</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Column - 60% width */}
      <div className="col-span-12 lg:col-span-7 space-y-4">
        {/* Quick Access Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 space-y-3">
              <FileText className="h-8 w-8 text-[#D94527]" />
              <h3 className="font-bold text-gray-900">就诊记录</h3>
              <p className="text-sm text-gray-600">共{visitCount}次就诊</p>
              {latestTimeline && (
                <p className="text-sm text-gray-500">最近: {formatDate(latestTimeline.stage_date)}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 space-y-3">
              <TestTube className="h-8 w-8 text-blue-600" />
              <h3 className="font-bold text-gray-900">时间线节点</h3>
              <p className="text-sm text-gray-600">{checkCount}次检查记录</p>
              <p className="text-sm text-gray-500">{completedCount}个已完成</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 space-y-3">
              <Pill className="h-8 w-8 text-green-600" />
              <h3 className="font-bold text-gray-900">待办任务</h3>
              <p className="text-sm text-gray-600">{pendingTodosCount}项待处理</p>
              <p className="text-sm text-gray-500">总计{todos.length}项任务</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 space-y-3">
              <TrendingDown className="h-8 w-8 text-purple-600" />
              <h3 className="font-bold text-gray-900">治疗进度</h3>
              <p className="text-sm text-gray-600">{treatmentCount}次治疗</p>
              <p className="text-sm text-gray-500">{followupCount}次随访</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities Timeline */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold">最近动态</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTimelines.length > 0 ? (
              <div className="space-y-4">
                {recentTimelines.map((timeline) => {
                  const IconComponent = getStageIcon(timeline.stage_type);
                  return (
                    <div key={timeline.timeline_id} className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500 font-mono w-24 flex-shrink-0">
                        {formatDate(timeline.stage_date)}
                      </span>
                      <IconComponent className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-gray-700 flex-1">
                        {timeline.stage_title}
                        {timeline.diagnosis && <span className="text-gray-500"> - {timeline.diagnosis}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">暂无就诊记录</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks Banner */}
        {urgentTodos.length > 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <h3 className="font-bold text-yellow-900 mb-3">紧急待办</h3>
              <div
                className={`grid ${
                  urgentTodos.length === 1 ? "grid-cols-1" : urgentTodos.length === 2 ? "grid-cols-2" : "grid-cols-3"
                } gap-3`}
              >
                {urgentTodos.map((todo) => (
                  <div key={todo.todo_id} className="bg-white p-3 rounded-lg border border-yellow-200">
                    <p className="text-sm font-medium text-gray-900">{todo.todo_title}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDaysUntil(todo.due_date)}截止</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
