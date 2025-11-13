"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Eye,
  Download,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Case status type
type CaseStatus = "pending" | "in-progress" | "completed" | "archived";

// Case interface
interface PathologyCase {
  id: string;
  patientName: string;
  patientId: string;
  caseNumber: string;
  diagnosis: string;
  sampleType: string;
  receivedDate: string;
  completedDate?: string;
  status: CaseStatus;
  pathologist: string;
  priority: "high" | "medium" | "low";
  tags: string[];
  slideCount: number;
}

// Status badge component
const StatusBadge = ({ status }: { status: CaseStatus }) => {
  const statusConfig = {
    pending: {
      label: "待处理",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
    },
    "in-progress": {
      label: "进行中",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: AlertCircle,
    },
    completed: {
      label: "已完成",
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle2,
    },
    archived: {
      label: "已归档",
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: XCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

// Priority badge component
const PriorityBadge = ({
  priority,
}: {
  priority: "high" | "medium" | "low";
}) => {
  const priorityConfig = {
    high: { label: "高", color: "bg-red-100 text-red-800 border-red-200" },
    medium: {
      label: "中",
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
    low: { label: "低", color: "bg-gray-100 text-gray-800 border-gray-200" },
  };

  const config = priorityConfig[priority];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.color}`}
    >
      {config.label}
    </span>
  );
};

export function PathologyCaseLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus | "all">(
    "all"
  );
  const [selectedCase, setSelectedCase] = useState<PathologyCase | null>(null);

  // Demo case data
  const cases: PathologyCase[] = [
    {
      id: "1",
      patientName: "张明",
      patientId: "P-2024-001",
      caseNumber: "C-2024-11-001",
      diagnosis: "膝关节类风湿性关节炎",
      sampleType: "滑膜组织活检",
      receivedDate: "2024-11-10",
      completedDate: "2024-11-11",
      status: "completed",
      pathologist: "李建国",
      priority: "medium",
      tags: ["关节", "免疫"],
      slideCount: 3,
    },
    {
      id: "2",
      patientName: "王芳",
      patientId: "P-2024-002",
      caseNumber: "C-2024-11-002",
      diagnosis: "疑似乳腺导管内癌",
      sampleType: "乳腺穿刺活检",
      receivedDate: "2024-11-11",
      status: "in-progress",
      pathologist: "陈医生",
      priority: "high",
      tags: ["肿瘤", "乳腺"],
      slideCount: 5,
    },
    {
      id: "3",
      patientName: "刘强",
      patientId: "P-2024-003",
      caseNumber: "C-2024-11-003",
      diagnosis: "待诊断",
      sampleType: "肺部结节活检",
      receivedDate: "2024-11-12",
      status: "pending",
      pathologist: "李建国",
      priority: "high",
      tags: ["肺部", "肿瘤"],
      slideCount: 4,
    },
    {
      id: "4",
      patientName: "赵丽",
      patientId: "P-2024-004",
      caseNumber: "C-2024-10-025",
      diagnosis: "胃黏膜慢性炎症",
      sampleType: "胃镜活检",
      receivedDate: "2024-10-25",
      completedDate: "2024-10-27",
      status: "archived",
      pathologist: "王医生",
      priority: "low",
      tags: ["消化", "炎症"],
      slideCount: 2,
    },
    {
      id: "5",
      patientName: "孙伟",
      patientId: "P-2024-005",
      caseNumber: "C-2024-11-004",
      diagnosis: "前列腺增生",
      sampleType: "前列腺穿刺",
      receivedDate: "2024-11-09",
      completedDate: "2024-11-10",
      status: "completed",
      pathologist: "陈医生",
      priority: "medium",
      tags: ["泌尿", "良性"],
      slideCount: 3,
    },
    {
      id: "6",
      patientName: "周敏",
      patientId: "P-2024-006",
      caseNumber: "C-2024-11-005",
      diagnosis: "待诊断",
      sampleType: "甲状腺细针穿刺",
      receivedDate: "2024-11-12",
      status: "pending",
      pathologist: "李建国",
      priority: "medium",
      tags: ["内分泌"],
      slideCount: 2,
    },
  ];

  // Filter cases
  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Status tabs
  const statusTabs: { value: CaseStatus | "all"; label: string; count: number }[] = [
    { value: "all", label: "全部", count: cases.length },
    {
      value: "pending",
      label: "待处理",
      count: cases.filter((c) => c.status === "pending").length,
    },
    {
      value: "in-progress",
      label: "进行中",
      count: cases.filter((c) => c.status === "in-progress").length,
    },
    {
      value: "completed",
      label: "已完成",
      count: cases.filter((c) => c.status === "completed").length,
    },
    {
      value: "archived",
      label: "已归档",
      count: cases.filter((c) => c.status === "archived").length,
    },
  ];

  return (
    <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">病例库</h1>
            <p className="text-sm text-gray-500 mt-1">
              管理和查看所有病理诊断病例
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              高级筛选
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              导出数据
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索病例号、患者姓名或诊断..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status tabs */}
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedStatus === tab.value
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs opacity-75">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-4">
          {filteredCases.map((caseItem) => (
            <div
              key={caseItem.id}
              className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedCase(caseItem)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Top row: Case number, status, priority */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-bold text-blue-600">
                      {caseItem.caseNumber}
                    </span>
                    <StatusBadge status={caseItem.status} />
                    <PriorityBadge priority={caseItem.priority} />
                  </div>

                  {/* Patient and diagnosis */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <User className="h-4 w-4" />
                        <span>患者信息</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">
                        {caseItem.patientName}
                      </p>
                      <p className="text-xs text-gray-500">{caseItem.patientId}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <FileText className="h-4 w-4" />
                        <span>诊断结果</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">
                        {caseItem.diagnosis}
                      </p>
                      <p className="text-xs text-gray-500">
                        {caseItem.sampleType}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2 mb-3">
                    {caseItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Bottom row: Dates and pathologist */}
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>接收：{caseItem.receivedDate}</span>
                    </div>
                    {caseItem.completedDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>完成：{caseItem.completedDate}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{caseItem.pathologist}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{caseItem.slideCount} 张切片</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    查看
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    报告
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCases.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">未找到匹配的病例</p>
            <p className="text-sm mt-1">请尝试调整搜索条件</p>
          </div>
        )}
      </div>
    </div>
  );
}

