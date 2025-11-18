"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TestTube, Pill, TrendingDown, AlertCircle, Users, Edit, Check, X } from "lucide-react";
import { App, Input, InputNumber, Select } from "antd";
import patientService from "@/services/patientService";
import type { Patient, TimelineStage, PatientTodo } from "@/types/patient";

const { TextArea } = Input;

interface PatientOverviewProps {
  patientId: string;
}

export function PatientOverview({ patientId }: PatientOverviewProps) {
  const { message } = App.useApp();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timelines, setTimelines] = useState<TimelineStage[]>([]);
  const [todos, setTodos] = useState<PatientTodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

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

  // Edit handlers
  const handleEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValues({ [field]: currentValue });
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValues({});
  };

  const handleSave = async (field: string) => {
    try {
      let value = editValues[field];

      // Handle array fields (allergies, past_medical_history)
      if ((field === "allergies" || field === "past_medical_history") && typeof value === "string") {
        value = value
          .split(/[,，、]/) // Support multiple separators
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }

      await patientService.updatePatient(parseInt(patientId), { [field]: value });
      message.success("保存成功");
      await loadPatientInfo();
      setEditingField(null);
      setEditValues({});
    } catch (error) {
      message.error("保存失败");
      console.error("Failed to save patient info:", error);
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

  // EditableField component
  const EditableField = ({
    field,
    value,
    label,
    type = "text",
    rows = 3,
    options = [],
  }: {
    field: string;
    value: any;
    label: string;
    type?: "text" | "textarea" | "number" | "select";
    rows?: number;
    options?: Array<{ value: any; label: string }>;
  }) => {
    const isEditing = editingField === field;
    const displayValue = value || <span className="text-gray-400 italic">暂无{label}</span>;
    return (
      <div className="group">
        <div className="flex items-start justify-between gap-2">
          {!isEditing ? (
            <>
              <div className="flex-1 text-sm text-gray-900 font-medium">{displayValue}</div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(field, value)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
              >
                <Edit className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <div className="flex-1 flex items-start gap-2">
              <div className="flex-1">
                {type === "textarea" ? (
                  <TextArea
                    value={editValues[field]}
                    onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                    rows={rows}
                    className="w-full"
                  />
                ) : type === "number" ? (
                  <InputNumber
                    value={editValues[field]}
                    onChange={(val) => setEditValues({ ...editValues, [field]: val })}
                    className="w-full"
                  />
                ) : type === "select" ? (
                  <Select
                    value={editValues[field]}
                    onChange={(val) => setEditValues({ ...editValues, [field]: val })}
                    className="w-full"
                    options={options}
                  />
                ) : (
                  <Input
                    value={editValues[field]}
                    onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                    className="w-full"
                  />
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => handleSave(field)}
                  className="bg-green-500 hover:bg-green-600 text-white h-8 px-2"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} className="h-8 px-2">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
                <span className="text-gray-500 block mb-1">姓名:</span>
                <EditableField field="name" value={patient.name} label="姓名" />
              </div>
              <div>
                <span className="text-gray-500 block mb-1">性别:</span>
                <EditableField
                  field="gender"
                  value={patient.gender}
                  label="性别"
                  type="select"
                  options={[
                    { value: "男", label: "男" },
                    { value: "女", label: "女" },
                  ]}
                />
              </div>
              <div>
                <span className="text-gray-500 block mb-1">年龄:</span>
                <EditableField field="age" value={patient.age} label="年龄" type="number" />
              </div>
              <div>
                <span className="text-gray-500 block mb-1">病历号:</span>
                <EditableField field="medical_record_no" value={patient.medical_record_no} label="病历号" />
              </div>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">出生日期:</span>
              <EditableField field="date_of_birth" value={patient.date_of_birth || ""} label="出生日期" />
            </div>
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">联系电话:</span>
              <EditableField field="phone" value={patient.phone || ""} label="联系电话" />
            </div>
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">邮箱:</span>
              <EditableField field="email" value={patient.email || ""} label="邮箱" />
            </div>
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">地址:</span>
              <EditableField field="address" value={patient.address || ""} label="地址" type="textarea" rows={2} />
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-red-700 block mb-1">过敏史:</span>
                  <EditableField
                    field="allergies"
                    value={patient.allergies?.join("、") || ""}
                    label="过敏史"
                    type="textarea"
                    rows={2}
                  />
                  <p className="text-xs text-gray-400 mt-1">多个过敏项请用顿号（、）或逗号分隔</p>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-700 block mb-1">家族史:</span>
                <EditableField
                  field="family_history"
                  value={patient.family_history || ""}
                  label="家族史"
                  type="textarea"
                  rows={2}
                />
              </div>
            </div>
            <div className="pt-2">
              <p className="text-sm font-semibold text-gray-700 mb-1">既往病史:</p>
              <EditableField
                field="past_medical_history"
                value={patient.past_medical_history?.join("、") || ""}
                label="既往病史"
                type="textarea"
                rows={3}
              />
              <p className="text-xs text-gray-400 mt-1">多项病史请用顿号（、）或逗号分隔</p>
            </div>
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
