"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Target, Plus,Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { App } from "antd";
import medicalCaseService from "@/services/medicalCaseService";
import type { MedicalCase } from "@/types/medicalcase";
import { CreateCaseDialog } from "./CreateCaseDialog";

const diseaseTypes = ["类风湿", "红斑狼疮", "强直性脊柱炎", "痛风", "骨关节炎", "干燥综合征"];
const ageRanges = ["<30", "30-50", "50-70", ">70"];

interface CaseLibraryViewProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSelectCase: (id: string) => void;
}

// Case Card Component
function CaseCard({
  caseItem,
  onSelect,
  onDelete
}: {
  caseItem: MedicalCase;
  onSelect: (id: string) => void;
  onDelete: (caseItem: MedicalCase, e: React.MouseEvent) => void;
}) {
  return (
    <Card
      className="bg-white border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 group relative"
      onClick={() => onSelect(caseItem.case_id.toString())}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-500">病例 {caseItem.case_no}</span>
          <div className="flex items-center gap-2">
            {caseItem.is_classic && (
              <div className="flex items-center gap-1 rounded-full bg-[#EAF5F1] px-2 py-1 text-[#4A8B69]">
                <Target className="h-3 w-3" />
                <span className="text-xs font-semibold">经典</span>
              </div>
            )}
            <button
              onClick={(e) => onDelete(caseItem, e)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#FCEAE8] rounded"
            >
              <Trash2 className="h-4 w-4 text-[#B65B54]" />
            </button>
          </div>
        </div>

        <h3 className="font-bold text-lg text-gray-900">{caseItem.diagnosis}</h3>

        <div className="text-sm text-gray-600">
          {caseItem.gender} · {caseItem.age}岁
        </div>

        {caseItem.tags && caseItem.tags.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500">标签:</span>
            <div className="flex flex-wrap gap-1">
              {caseItem.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-[#EEF5FF] text-[#4D79CB] text-xs rounded-full border border-[#CFDBFB]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full border-[#E6BDA8] text-[#C06E4E] hover:bg-[#FFF1E8] hover:text-[#B85E40]"
        >
          查看详情
        </Button>
      </CardContent>
    </Card>
  );
}

export function CaseLibraryView({ activeTab, onTabChange, onSelectCase }: CaseLibraryViewProps) {
  const { message,modal } = App.useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [cases, setCases] = useState<MedicalCase[]>([]);
  const [favoriteCases, setFavoriteCases] = useState<MedicalCase[]>([]);
  const [recentCases, setRecentCases] = useState<MedicalCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'search') {
        const result = await medicalCaseService.getList({
          search: searchQuery,
          disease_types: selectedDiseases.length > 0 ? selectedDiseases : undefined,
          age_range: selectedAgeRange || undefined,
          gender: selectedGender || undefined,
          limit: 100,
        });
        setCases(result.cases || []);
      } else if (activeTab === 'favorites') {
        const result = await medicalCaseService.getFavorites();
        setFavoriteCases(result.cases || []);
      } else if (activeTab === 'recent') {
        const result = await medicalCaseService.getRecentCases();
        setRecentCases(result.cases || []);
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
      message.error('加载病例失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedDiseases, selectedAgeRange, selectedGender, searchQuery, message]);

  // Load cases based on active tab
  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleDeleteCase = (caseItem: MedicalCase, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event

    modal.confirm({
      title: "确认删除",
      content: `确定要删除病例"${caseItem.diagnosis || caseItem.case_no}"吗？删除后将无法恢复。`,
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            await medicalCaseService.delete(caseItem.case_id);
            message.success("删除成功");
            await loadCases();
            resolve();
          } catch (error) {
            console.error("Failed to delete case:", error);
            const errorMessage = error instanceof Error ? error.message : '删除失败';
            message.error(errorMessage);
            reject(error);
          }
        });
      },
    });
  };

  return (
    <div className="h-full flex flex-col bg-app-surface overflow-hidden">
      <div className="bg-app-surface border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">病例库</h1>
          <div className="flex items-center gap-4">
            <Tabs value={activeTab} onValueChange={onTabChange}>
              <TabsList className="h-14 gap-1 rounded-xl border border-gray-200 bg-transparent px-1">
                <TabsTrigger
                  value="search"
                  className="h-12 rounded-lg border border-transparent bg-transparent px-8 py-3 text-base font-bold text-gray-600 hover:bg-[#F6F0EA] data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
                >
                  病例检索
                </TabsTrigger>
                <TabsTrigger
                  value="favorites"
                  className="h-12 rounded-lg border border-transparent bg-transparent px-8 py-3 text-base font-bold text-gray-600 hover:bg-[#F6F0EA] data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
                >
                  我的收藏
                </TabsTrigger>
                <TabsTrigger
                  value="recent"
                  className="h-12 rounded-lg border border-transparent bg-transparent px-8 py-3 text-base font-bold text-gray-600 hover:bg-[#F6F0EA] data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
                >
                  最近浏览
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsContent value="search" className="mt-0 space-y-5">
              {/* Search Area */}
              <div className="space-y-4">
                <div className="relative w-1/2">
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
                          ? "border border-[#F0D3C0] bg-[#FFF1E8] text-[#C06E4E]"
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-[#FAF7F2]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      onClick={() => setCreateDialogOpen(true)}
                      className="bg-[#DA7756] hover:bg-[#C46B4D] text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      新建病例
                    </Button>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-gray-600 hover:bg-[#FAF7F2]"
                    >
                      <Filter className="h-4 w-4" />
                      {showFilters ? "收起筛选" : "展开筛选"}
                    </button>
                  </div>
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
                            onClick={() => setSelectedAgeRange(selectedAgeRange === range ? "" : range)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                              selectedAgeRange === range
                                ? "border border-[#F0D3C0] bg-[#FFF1E8] text-[#C06E4E]"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-[#FAF7F2]"
                            }`}
                          >
                            {range}岁
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700 w-20">性别:</span>
                        <button
                          onClick={() => setSelectedGender(selectedGender === "男" ? "" : "男")}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                            selectedGender === "男"
                              ? "border border-[#F0D3C0] bg-[#FFF1E8] text-[#C06E4E]"
                              : "bg-white text-gray-600 border border-gray-200 hover:bg-[#FAF7F2]"
                          }`}
                        >
                          男
                        </button>
                        <button
                          onClick={() => setSelectedGender(selectedGender === "女" ? "" : "女")}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                            selectedGender === "女"
                              ? "border border-[#F0D3C0] bg-[#FFF1E8] text-[#C06E4E]"
                              : "bg-white text-gray-600 border border-gray-200 hover:bg-[#FAF7F2]"
                          }`}
                        >
                          女
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700 w-20">时间:</span>
                        <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-[#FAF7F2]">
                          最近添加
                        </button>
                        <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-[#FAF7F2]">
                          本月新增
                        </button>
                        <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-[#FAF7F2]">
                          经典病例
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Case Cards Grid - Reference Image 3 Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-3 text-center py-12">
                    <p className="text-gray-500">加载中...</p>
                  </div>
                ) : cases.length === 0 ? (
                  <div className="col-span-3 text-center py-12">
                    <p className="text-gray-500">暂无病例</p>
                  </div>
                ) : (
                  cases.map((caseItem) => (
                    <CaseCard key={caseItem.case_id} caseItem={caseItem} onSelect={onSelectCase} onDelete={handleDeleteCase} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="favorites" className="mt-0">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">加载中...</p>
                </div>
              ) : favoriteCases.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">您还没有收藏任何病例</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteCases.map((caseItem) => (
                    <CaseCard key={caseItem.case_id} caseItem={caseItem} onSelect={onSelectCase} onDelete={handleDeleteCase} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="recent" className="mt-0">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">加载中...</p>
                </div>
              ) : recentCases.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">暂无最近浏览记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCases.map((caseItem) => (
                    <Card
                      key={caseItem.case_id}
                      className="bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onSelectCase(caseItem.case_id.toString())}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-bold text-gray-500">病例 {caseItem.case_no}</div>
                          <div className="font-bold text-gray-900">{caseItem.diagnosis}</div>
                          <div className="text-sm text-gray-500">
                            {caseItem.gender} · {caseItem.age}岁
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* AI Recommendation Floating Window */}
          {searchQuery.includes("肿痛") && (
            <div className="fixed bottom-8 right-8 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 p-5 space-y-3 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#4D79CB]" />
                <h3 className="font-bold text-gray-900">为您推荐相似病例</h3>
              </div>
              <Card className="bg-[#F4F8FF] border-[#D9E5FB]">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">病例 #0234</span>
                    <span className="text-xs bg-[#EAF5F1] text-[#4A8B69] px-2 py-0.5 rounded-full">87% 相似</span>
                  </div>
                  <p className="text-xs text-gray-600">女, 58岁</p>
                  <p className="text-xs text-gray-600">匹配点: 双膝肿痛、晨僵、RF阳性</p>
                  <Button size="sm" className="w-full mt-2 bg-[#4D79CB] hover:bg-[#416AB8] text-white">
                    展开详情
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      {/* Create Case Dialog */}
      <CreateCaseDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={loadCases}
      />
    </div>
  );
}
