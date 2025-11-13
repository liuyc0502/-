"use client";

import React, { useState, useEffect } from "react";
import { PatientTimeline, TimelineEvent } from "./PatientTimeline";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Activity,
  FileText,
  Stethoscope,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";

// Patient info interface
export interface PatientInfo {
  id: string;
  name: string;
  age?: number;
  gender?: "male" | "female" | "other";
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  registrationDate?: string;
}

// Main diagnosis interface
export interface MainDiagnosis {
  title: string;
  description: string;
  doctor: string;
  specialty: string;
  treatments: string[];
  riskLevel?: "high" | "medium" | "low";
}

// Pathology image interface
export interface PathologyImage {
  id: string;
  name: string;
  date: string;
  type: string;
  thumbnail?: string;
}

interface PathologyPatientProfileProps {
  patient?: PatientInfo;
}

export function PathologyPatientProfile({
  patient,
}: PathologyPatientProfileProps) {
  // Demo patient data
  const defaultPatient: PatientInfo = {
    id: "1",
    name: "张明",
    age: 45,
    gender: "male",
    email: "zhangming@example.com",
    phone: "+86 138-0000-0000",
    address: "北京市朝阳区某某街道123号",
    dateOfBirth: "1979-03-15",
    registrationDate: "2023-01-10",
  };

  const currentPatient = patient || defaultPatient;

  // Main diagnosis
  const mainDiagnosis: MainDiagnosis = {
    title: "膝关节类风湿性关节炎",
    description:
      "在体格检查中，医生检查患者关节是否有肿胀、发红和温热。同时评估关节活动度。患者右膝关节活动受限，伴有明显压痛。",
    doctor: "李建国 主任医师",
    specialty: "风湿免疫科专家",
    treatments: ["限制关节负重", "物理治疗", "消炎止痛", "居家康复训练"],
    riskLevel: "medium",
  };

  // Current pathology slide
  const currentSlide = {
    date: "2025年11月10日",
    complaint: "右膝关节",
    status: "待分析",
  };

  // Pathology images
  const pathologyImages: PathologyImage[] = [
    {
      id: "1",
      name: "右膝关节切片-1",
      date: "2025-11-10",
      type: "HE染色",
    },
    {
      id: "2",
      name: "右膝关节切片-2",
      date: "2025-11-10",
      type: "免疫组化",
    },
    {
      id: "3",
      name: "滑膜组织切片",
      date: "2025-11-05",
      type: "HE染色",
    },
  ];

  // Timeline events state
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  // Load events from localStorage
  useEffect(() => {
    const storedEvents = localStorage.getItem(
      `patient_timeline_${currentPatient.id}`
    );
    if (storedEvents) {
      try {
        setTimelineEvents(JSON.parse(storedEvents));
      } catch (error) {
        console.error("Failed to parse timeline events:", error);
      }
    } else {
      // Demo timeline events
      const demoEvents: TimelineEvent[] = [
        {
          id: uuidv4(),
          date: "2025-11-10",
          type: "diagnosis",
          title: "确诊膝关节类风湿性关节炎",
          description:
            "患者确诊为类风湿性关节炎，累及右膝关节。体格检查发现肿胀和温热。",
        },
        {
          id: uuidv4(),
          date: "2025-11-05",
          type: "examination",
          title: "实验室检查",
          description: "完成血常规和炎症指标检测。结果显示C反应蛋白水平升高。",
        },
      ];
      setTimelineEvents(demoEvents);
      localStorage.setItem(
        `patient_timeline_${currentPatient.id}`,
        JSON.stringify(demoEvents)
      );
    }
  }, [currentPatient.id]);

  // Save events
  const saveEvents = (events: TimelineEvent[]) => {
    setTimelineEvents(events);
    localStorage.setItem(
      `patient_timeline_${currentPatient.id}`,
      JSON.stringify(events)
    );
  };

  const handleAddEvent = (event: Omit<TimelineEvent, "id">) => {
    const newEvent: TimelineEvent = { ...event, id: uuidv4() };
    saveEvents([...timelineEvents, newEvent]);
  };

  const handleEditEvent = (id: string, updates: Partial<TimelineEvent>) => {
    const updatedEvents = timelineEvents.map((event) =>
      event.id === id ? { ...event, ...updates } : event
    );
    saveEvents(updatedEvents);
  };

  const handleDeleteEvent = (id: string) => {
    const filteredEvents = timelineEvents.filter((event) => event.id !== id);
    saveEvents(filteredEvents);
  };

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
            {currentPatient.name.slice(0, 2)}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold mb-1">{currentPatient.name}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>{currentPatient.age} 岁</span>
              <span>•</span>
              <span>{currentPatient.gender === "male" ? "男" : "女"}</span>
              <span>•</span>
              <span>病案号: {currentPatient.id}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              病历记录
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              就诊历史
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Fixed layout without scroll */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col gap-4">
          {/* Top Section: Left (Pathology Slide) + Right (Diagnosis Info) */}
          <div className="grid grid-cols-5 gap-4" style={{ height: '48%' }}>
            {/* Left: Pathology Slide Display - 2/5 width */}
            <div className="col-span-2">
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 h-full flex flex-col shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-gray-800">病理切片信息</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(
                      mainDiagnosis.riskLevel
                    )}`}
                  >
                    {mainDiagnosis.riskLevel === "high"
                      ? "高风险"
                      : mainDiagnosis.riskLevel === "medium"
                      ? "中度"
                      : "低风险"}
                  </span>
                </div>

                {/* Slide Visualization */}
                <div className="flex-1 bg-gray-50 rounded-xl flex items-center justify-center mb-3 border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                      <Activity className="h-10 w-10 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-500 mb-1">当前切片</p>
                    <p className="font-semibold text-gray-800 text-lg">{currentSlide.complaint}</p>
                  </div>
                </div>

                {/* Slide Info Card */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">送检日期</span>
                    <span className="font-medium text-gray-800">{currentSlide.date}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">样本部位</span>
                    <span className="font-medium text-gray-800">{currentSlide.complaint}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">分析状态</span>
                    <span className="text-orange-600 font-semibold">
                      {currentSlide.status}
                    </span>
                  </div>
                  <Button size="sm" className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white">
                    查看实验室报告 →
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: Diagnosis Card - 3/5 width */}
            <div className="col-span-3">
              <div className="bg-white rounded-2xl border shadow-sm p-5 h-full flex flex-col overflow-hidden">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-gray-900">{mainDiagnosis.title}</h2>
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    </div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">主要诊断</p>
                  </div>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed mb-4 line-clamp-3">
                  {mainDiagnosis.description}
                </p>

                {/* Doctor Info */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl mb-4 border border-blue-200">
                  <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {mainDiagnosis.doctor}
                    </p>
                    <p className="text-xs text-gray-600">{mainDiagnosis.specialty}</p>
                  </div>
                </div>

                {/* Treatment Tags */}
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide">治疗方案</p>
                  <div className="flex flex-wrap gap-2">
                    {mainDiagnosis.treatments.map((treatment, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs border border-blue-200 font-medium hover:shadow-sm transition-shadow"
                      >
                        {treatment}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Pathology Images + Timeline */}
          <div className="grid grid-cols-5 gap-4 flex-1 overflow-hidden">
            {/* Left: Pathology Images Library - 2/5 width */}
            <div className="col-span-2 overflow-hidden">
              <div className="bg-white rounded-2xl border shadow-sm p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h3 className="font-bold text-base text-gray-800">病理图片库</h3>
                  <Button variant="link" size="sm" className="text-blue-600 text-xs h-auto p-0">
                    查看全部 →
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {pathologyImages.map((img) => (
                    <div
                      key={img.id}
                      className="border rounded-xl p-3 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          <ImageIcon className="h-7 w-7 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-0.5 truncate text-gray-800">
                            {img.name}
                          </h4>
                          <p className="text-xs text-gray-500">{img.date}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {img.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" size="sm" className="w-full mt-3 flex-shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  上传新切片
                </Button>
              </div>
            </div>

            {/* Right: Timeline - 3/5 width */}
            <div className="col-span-3 overflow-hidden">
              <div className="bg-white rounded-2xl border shadow-sm h-full overflow-hidden">
                <PatientTimeline
                  patientId={currentPatient.id}
                  patientName={currentPatient.name}
                  events={timelineEvents}
                  onAddEvent={handleAddEvent}
                  onEditEvent={handleEditEvent}
                  onDeleteEvent={handleDeleteEvent}
                  editable={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
