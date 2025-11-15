"use client";

import { useState } from "react";
import { Search, Filter, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface CaseData {
  id: string;
  caseNo: string;
  diagnosis: string;
  age: number;
  gender: string;
  symptoms: string[];
  similarity?: number;
}

const mockCases: CaseData[] = [
  {
    id: "1",
    caseNo: "#0234",
    diagnosis: "类风湿关节炎",
    age: 58,
    gender: "女",
    symptoms: ["双膝肿痛", "晨僵", "RF阳性"],
    similarity: 87,
  },
  {
    id: "2",
    caseNo: "#0156",
    diagnosis: "系统性红斑狼疮",
    age: 45,
    gender: "女",
    symptoms: ["面部红斑", "关节痛", "ANA阳性"],
    similarity: 72,
  },
  {
    id: "3",
    caseNo: "#0189",
    diagnosis: "强直性脊柱炎",
    age: 35,
    gender: "男",
    symptoms: ["腰背痛", "晨僵", "HLA-B27阳性"],
  },
];

const diseaseTypes = ["类风湿", "红斑狼疮", "强直性脊柱炎", "痛风", "骨关节炎", "干燥综合征"];
const ageRanges = ["<30岁", "30-50岁", "50-70岁", ">70岁"];

interface CaseLibraryViewProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSelectCase: (id: string) => void;
}

export function CaseLibraryView({ activeTab, onTabChange, onSelectCase }: CaseLibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header with Tab Navigation */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">病例库</h1>
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="bg-gray-100 h-14 p-1 gap-1">
              <TabsTrigger
                value="search"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                病例检索
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                我的收藏
              </TabsTrigger>
              <TabsTrigger
                value="recent"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                最近浏览
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsContent value="search" className="mt-0 space-y-6">
            {/* Search Area */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="描述症状或搜索病例，如：60岁男性，双膝关节肿痛3个月，晨僵明显"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 bg-white border-gray-200 text-base"
                />
              </div>

              {/* Filter Toolbar */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-700">疾病类型:</span>
                {diseaseTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedDiseases((prev) =>
                        prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedDiseases.includes(type)
                        ? "bg-[#D94527] text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {type}
                  </button>
                ))}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="ml-auto px-4 py-1.5 rounded-lg bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? "收起筛选" : "展开筛选"}
                </button>
              </div>

              {/* Advanced Filters (Expandable) */}
              {showFilters && (
                <Card className="bg-white border-gray-200">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-gray-700 w-20">年龄段:</span>
                      {ageRanges.map((range) => (
                        <button
                          key={range}
                          className="px-3 py-1.5 rounded-lg text-sm bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700 w-20">性别:</span>
                      <button className="px-3 py-1.5 rounded-lg text-sm bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
                        男
                      </button>
                      <button className="px-3 py-1.5 rounded-lg text-sm bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
                        女
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700 w-20">时间:</span>
                      <button className="px-3 py-1.5 rounded-lg text-sm bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
                        最近添加
                      </button>
                      <button className="px-3 py-1.5 rounded-lg text-sm bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
                        本月新增
                      </button>
                      <button className="px-3 py-1.5 rounded-lg text-sm bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
                        经典病例
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Case Cards Grid - Reference Image 3 Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockCases.map((caseItem) => (
                <Card
                  key={caseItem.id}
                  className="bg-white border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1"
                  onClick={() => onSelectCase(caseItem.id)}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-500">病例 {caseItem.caseNo}</span>
                      {caseItem.similarity && (
                        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          <Target className="h-3 w-3" />
                          <span className="text-xs font-semibold">{caseItem.similarity}%</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-bold text-lg text-gray-900">{caseItem.diagnosis}</h3>

                    <div className="text-sm text-gray-600">
                      {caseItem.gender} · {caseItem.age}岁
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-gray-500">关键症状:</span>
                      <div className="flex flex-wrap gap-1">
                        {caseItem.symptoms.map((symptom, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                          >
                            {symptom}
                          </span>
                        ))}
                      </div>
                    </div>

                    {caseItem.similarity && (
                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                        匹配点: 双膝肿痛、晨僵、RF阳性
                      </div>
                    )}

                    <Button
                      variant="outline"
                      className="w-full text-[#D94527] border-[#D94527] hover:bg-[#D94527] hover:text-white"
                    >
                      查看详情
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            <div className="text-center py-12">
              <p className="text-gray-500">您还没有收藏任何病例</p>
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-0">
            <div className="space-y-3">
              {mockCases.slice(0, 2).map((caseItem) => (
                <Card
                  key={caseItem.id}
                  className="bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onSelectCase(caseItem.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-bold text-gray-500">病例 {caseItem.caseNo}</div>
                      <div className="font-bold text-gray-900">{caseItem.diagnosis}</div>
                      <div className="text-sm text-gray-500">
                        {caseItem.gender} · {caseItem.age}岁
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">2小时前浏览</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* AI Recommendation Floating Window */}
        {searchQuery.includes("肿痛") && (
        <div className="fixed bottom-8 right-8 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 p-5 space-y-3 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-gray-900">为您推荐相似病例</h3>
          </div>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">病例 #0234</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">87% 相似</span>
              </div>
              <p className="text-xs text-gray-600">女, 58岁</p>
              <p className="text-xs text-gray-600">匹配点: 双膝肿痛、晨僵、RF阳性</p>
              <Button size="sm" className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white">
                展开详情
              </Button>
            </CardContent>
          </Card>
        </div>
        )}
        </div>
      </div>
    </div>
  );
}
