"use client";

import { useState } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PatientCardData {
  id: string;
  name: string;
  gender: string;
  age: number;
  medicalRecordNo: string;
  diagnosis: string;
  lastVisit: string;
  pendingTasks: number;
  diagnosisTag: string;
}

const mockPatients: PatientCardData[] = [
  {
    id: "1",
    name: "张三",
    gender: "男",
    age: 58,
    medicalRecordNo: "MR202401001",
    diagnosis: "类风湿关节炎",
    lastVisit: "2024-11-14",
    pendingTasks: 3,
    diagnosisTag: "rheumatoid"
  },
  {
    id: "2",
    name: "李四",
    gender: "女",
    age: 62,
    medicalRecordNo: "MR202401002",
    diagnosis: "系统性红斑狼疮",
    lastVisit: "2024-11-10",
    pendingTasks: 0,
    diagnosisTag: "lupus"
  },
  {
    id: "3",
    name: "王五",
    gender: "男",
    age: 45,
    medicalRecordNo: "MR202401003",
    diagnosis: "强直性脊柱炎",
    lastVisit: "2024-11-12",
    pendingTasks: 1,
    diagnosisTag: "spondylitis"
  },
];

const filterOptions = [
  { id: "all", label: "全部患者" },
  { id: "recent", label: "近期就诊" },
  { id: "pending", label: "待随访" },
  { id: "difficult", label: "疑难病例" },
];

interface PatientListViewProps {
  onSelectPatient: (id: string) => void;
}

export function PatientListView({ onSelectPatient }: PatientListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const getDiagnosisColor = (tag: string) => {
    const colors: Record<string, string> = {
      rheumatoid: "bg-red-100 text-red-700 border-red-200",
      lupus: "bg-purple-100 text-purple-700 border-purple-200",
      spondylitis: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return colors[tag] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">患者档案</h1>
          <Button className="bg-[#D94527] hover:bg-[#C23E21] text-white">
            <Plus className="h-4 w-4 mr-2" />
            新建档案
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="搜索患者姓名、病历号或诊断关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-white border-gray-200"
          />
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-3">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setActiveFilter(option.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeFilter === option.id
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {option.label}
            </button>
          ))}
          <button className="ml-auto px-4 py-2 rounded-lg bg-white text-gray-600 hover:bg-gray-100 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            高级筛选
          </button>
        </div>

        {/* Patient Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockPatients.map((patient) => (
            <Card
              key={patient.id}
              className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 bg-white border-gray-200"
              onClick={() => onSelectPatient(patient.id)}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{patient.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {patient.gender} · {patient.age}岁 · {patient.medicalRecordNo}
                    </p>
                  </div>
                  {patient.pendingTasks > 0 && (
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white text-xs font-semibold">
                      {patient.pendingTasks}
                    </span>
                  )}
                </div>

                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getDiagnosisColor(patient.diagnosisTag)}`}>
                  {patient.diagnosis}
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    最近就诊: <span className="font-medium text-gray-900">{patient.lastVisit}</span>
                  </p>
                </div>

                <Button variant="outline" className="w-full text-[#D94527] border-[#D94527] hover:bg-[#D94527] hover:text-white">
                  查看档案
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
