"use client";

import React, { useState } from "react";
import {
  Search,
  User,
  Calendar,
  Phone,
  Mail,
  ChevronRight,
  Filter,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Patient card interface
export interface PatientCard {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female";
  patientId: string;
  phone?: string;
  email?: string;
  lastVisit: string;
  diagnosis?: string;
  status: "active" | "inactive";
  caseCount: number;
}

interface PatientListProps {
  onPatientSelect?: (patientId: string) => void;
}

export function PatientList({ onPatientSelect }: PatientListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">("all");

  // Demo patient data
  const patients: PatientCard[] = [
    {
      id: "1",
      name: "张明",
      age: 45,
      gender: "male",
      patientId: "P-2024-001",
      phone: "+86 138-0000-0001",
      email: "zhangming@example.com",
      lastVisit: "2025-11-10",
      diagnosis: "膝关节类风湿性关节炎",
      status: "active",
      caseCount: 3,
    },
    {
      id: "2",
      name: "王芳",
      age: 38,
      gender: "female",
      patientId: "P-2024-002",
      phone: "+86 138-0000-0002",
      email: "wangfang@example.com",
      lastVisit: "2025-11-11",
      diagnosis: "乳腺导管内癌",
      status: "active",
      caseCount: 5,
    },
    {
      id: "3",
      name: "刘强",
      age: 52,
      gender: "male",
      patientId: "P-2024-003",
      phone: "+86 138-0000-0003",
      lastVisit: "2025-11-12",
      diagnosis: "肺部结节待查",
      status: "active",
      caseCount: 2,
    },
    {
      id: "4",
      name: "赵丽",
      age: 41,
      gender: "female",
      patientId: "P-2024-004",
      phone: "+86 138-0000-0004",
      email: "zhaoli@example.com",
      lastVisit: "2025-10-25",
      diagnosis: "胃黏膜慢性炎症",
      status: "inactive",
      caseCount: 1,
    },
    {
      id: "5",
      name: "孙伟",
      age: 56,
      gender: "male",
      patientId: "P-2024-005",
      phone: "+86 138-0000-0005",
      lastVisit: "2025-11-09",
      diagnosis: "前列腺增生",
      status: "active",
      caseCount: 3,
    },
    {
      id: "6",
      name: "周敏",
      age: 35,
      gender: "female",
      patientId: "P-2024-006",
      phone: "+86 138-0000-0006",
      email: "zhoumin@example.com",
      lastVisit: "2025-11-12",
      diagnosis: "甲状腺结节",
      status: "active",
      caseCount: 2,
    },
    {
      id: "7",
      name: "陈杰",
      age: 48,
      gender: "male",
      patientId: "P-2024-007",
      phone: "+86 138-0000-0007",
      lastVisit: "2025-11-08",
      diagnosis: "结肠息肉",
      status: "active",
      caseCount: 1,
    },
    {
      id: "8",
      name: "林雪",
      age: 42,
      gender: "female",
      patientId: "P-2024-008",
      email: "linxue@example.com",
      lastVisit: "2025-10-30",
      diagnosis: "子宫肌瘤",
      status: "inactive",
      caseCount: 2,
    },
  ];

  // Filter patients
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.diagnosis && patient.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGender = selectedGender === "all" || patient.gender === selectedGender;

    return matchesSearch && matchesGender;
  });

  const getInitials = (name: string) => {
    return name.slice(0, 2);
  };

  const getGenderColor = (gender: "male" | "female") => {
    return gender === "male"
      ? "from-blue-400 to-blue-600"
      : "from-pink-400 to-pink-600";
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6" />
              病人档案
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              共 {patients.length} 位患者 • 活跃 {patients.filter(p => p.status === "active").length} 位
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              高级筛选
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <User className="h-4 w-4 mr-2" />
              新增患者
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mt-4 flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索患者姓名、病案号或诊断..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedGender("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedGender === "all"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setSelectedGender("male")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedGender === "male"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              男性
            </button>
            <button
              onClick={() => setSelectedGender("female")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedGender === "female"
                  ? "bg-pink-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              女性
            </button>
          </div>
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => onPatientSelect?.(patient.id)}
              className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
            >
              {/* Header with Avatar and Status */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-14 h-14 rounded-full bg-gradient-to-br ${getGenderColor(
                      patient.gender
                    )} flex items-center justify-center text-white text-lg font-bold shadow-md`}
                  >
                    {getInitials(patient.name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{patient.name}</h3>
                    <p className="text-xs text-gray-500">
                      {patient.age} 岁 • {patient.gender === "male" ? "男" : "女"}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {patient.status === "active" ? "活跃" : "非活跃"}
                </span>
              </div>

              {/* Patient ID */}
              <div className="mb-3 pb-3 border-b border-gray-100">
                <p className="text-xs text-gray-500 mb-1">病案号</p>
                <p className="text-sm font-mono font-semibold text-blue-600">
                  {patient.patientId}
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-3">
                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{patient.email}</span>
                  </div>
                )}
              </div>

              {/* Diagnosis */}
              {patient.diagnosis && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">最近诊断</p>
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {patient.diagnosis}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{patient.lastVisit}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{patient.caseCount} 个病例</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Users className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">未找到匹配的患者</p>
            <p className="text-sm mt-1">请尝试调整搜索条件</p>
          </div>
        )}
      </div>
    </div>
  );
}
