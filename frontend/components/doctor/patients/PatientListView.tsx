"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { App } from "antd";
import patientService from "@/services/patientService";
import type { Patient } from "@/types/patient";

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
  const { message } = App.useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load patients on mount and when filter changes
  useEffect(() => {
    loadPatients();
  }, [activeFilter]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (searchQuery) {
        loadPatients();
      }
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const result = await patientService.listPatients({
        search: searchQuery || undefined,
        filter_type: activeFilter === "all" ? undefined : activeFilter,
        limit: 50,
      });
      setPatients(result.patients);
    } catch (error) {
      message.error("加载患者列表失败");
      console.error("Failed to load patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDiagnosisColor = (diagnosis?: string) => {
    if (!diagnosis) return "bg-gray-100 text-gray-700 border-gray-200";

    const colors: Record<string, string> = {
      "类风湿关节炎": "bg-red-100 text-red-700 border-red-200",
      "系统性红斑狼疮": "bg-purple-100 text-purple-700 border-purple-200",
      "强直性脊柱炎": "bg-blue-100 text-blue-700 border-blue-200",
    };

    for (const [key, value] of Object.entries(colors)) {
      if (diagnosis.includes(key)) return value;
    }

    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">患者档案</h1>
          <Button className="bg-[#D94527] hover:bg-[#C23E21] text-white h-14">
            <Plus className="h-4 w-4 mr-2" />
            新建档案
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5 space-y-5">

        {/* Search Bar */}
        <div className="relative w-1/2">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="搜索患者姓名、病历号或诊断关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 bg-white border-gray-200 text-base"
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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#D94527] border-r-transparent mb-4"></div>
              <p className="text-gray-500">加载中...</p>
            </div>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">暂无患者数据</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((patient) => {
              // Get the latest timeline for diagnosis
              const latestDiagnosis = patient.diagnosis || "暂无诊断";
              const lastVisit = patient.update_time
                ? new Date(patient.update_time).toLocaleDateString('zh-CN')
                : "未记录";

              return (
                <Card
                  key={patient.patient_id}
                  className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 bg-white border-gray-200"
                  onClick={() => onSelectPatient(patient.patient_id.toString())}
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{patient.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {patient.gender} · {patient.age}岁 · {patient.medical_record_no}
                        </p>
                      </div>
                    </div>

                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getDiagnosisColor(latestDiagnosis)}`}>
                      {latestDiagnosis}
                    </div>

                    {patient.allergies && patient.allergies.length > 0 && (
                      <div className="text-sm text-orange-600">
                        过敏史: {patient.allergies.join(", ")}
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-600">
                        最近更新: <span className="font-medium text-gray-900">{lastVisit}</span>
                      </p>
                    </div>

                    <Button variant="outline" className="w-full text-[#D94527] border-[#D94527] hover:bg-[#D94527] hover:text-white">
                      查看档案
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
