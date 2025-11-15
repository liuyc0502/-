"use client";

import { useState } from "react";
import { Search, ChevronRight, BookOpen, TrendingUp, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  lastUpdated: string;
  viewCount?: number;
}

const mockKnowledge: KnowledgeItem[] = [
  {
    id: "1",
    title: "类风湿关节炎诊断标准",
    category: "诊断标准",
    summary: "2010 ACR/EULAR类风湿关节炎分类标准详解...",
    lastUpdated: "2024-11-01",
    viewCount: 156,
  },
  {
    id: "2",
    title: "甲氨蝶呤使用指南",
    category: "药物信息",
    summary: "MTX的用法、用量、监测指标及不良反应...",
    lastUpdated: "2024-10-28",
    viewCount: 89,
  },
  {
    id: "3",
    title: "TNF-α抑制剂应用时机",
    category: "药物信息",
    summary: "生物制剂的适应症、禁忌症及选择原则...",
    lastUpdated: "2024-10-15",
    viewCount: 67,
  },
];

const knowledgeTree = [
  {
    id: "1",
    label: "风湿免疫学",
    children: [
      { id: "1-1", label: "类风湿关节炎" },
      { id: "1-2", label: "系统性红斑狼疮" },
      { id: "1-3", label: "强直性脊柱炎" },
    ],
  },
  {
    id: "2",
    label: "诊断标准",
    children: [
      { id: "2-1", label: "ACR/EULAR标准" },
      { id: "2-2", label: "SLE分类标准" },
    ],
  },
  {
    id: "3",
    label: "药物治疗",
    children: [
      { id: "3-1", label: "DMARDs" },
      { id: "3-2", label: "生物制剂" },
      { id: "3-3", label: "糖皮质激素" },
    ],
  },
];

interface KnowledgeBaseViewProps {
  onSelectKnowledge: (id: string) => void;
}

export function KnowledgeBaseView({ onSelectKnowledge }: KnowledgeBaseViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("search");
  const [expandedNodes, setExpandedNodes] = useState<string[]>(["1"]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => (prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]));
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header with Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">知识库</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-100 h-12 p-1 gap-1">
              <TabsTrigger
                value="search"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-6 font-bold"
              >
                知识检索
              </TabsTrigger>
              <TabsTrigger
                value="learning"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-6 font-bold"
              >
                学习记录
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-6 font-bold"
              >
                知识地图
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Knowledge Search Tab */}
          <TabsContent value="search" className="mt-0">
            <div className="grid grid-cols-12 gap-6">
              {/* Left Sidebar - Knowledge Tree */}
              <div className="col-span-12 lg:col-span-3">
                <Card className="bg-white border-gray-200 sticky top-8">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">知识分类</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-1">
                      {knowledgeTree.map((node) => (
                        <div key={node.id}>
                          <button
                            onClick={() => toggleNode(node.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                          >
                            <ChevronRight
                              className={`h-4 w-4 transition-transform ${
                                expandedNodes.includes(node.id) ? "rotate-90" : ""
                              }`}
                            />
                            <BookOpen className="h-4 w-4 text-[#D94527]" />
                            <span className="font-medium text-gray-900">{node.label}</span>
                          </button>
                          {expandedNodes.includes(node.id) && (
                            <div className="ml-8 space-y-1">
                              {node.children.map((child) => (
                                <button
                                  key={child.id}
                                  className="w-full text-left px-4 py-1.5 text-sm text-gray-600 hover:text-[#D94527] hover:bg-gray-50 transition-colors"
                                >
                                  {child.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Content Area */}
              <div className="col-span-12 lg:col-span-9 space-y-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="搜索疾病、药物、诊断标准..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-white border-gray-200"
                  />
                </div>

                {/* Quick Category Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {["解剖学", "病理学", "诊断标准", "药物信息", "治疗方案"].map((category) => (
                    <button
                      key={category}
                      className="px-4 py-2 rounded-lg bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 text-sm font-medium"
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Knowledge Cards */}
                <div className="space-y-4">
                  {mockKnowledge.map((item) => (
                    <Card
                      key={item.id}
                      className="bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onSelectKnowledge(item.id)}
                    >
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                                {item.category}
                              </span>
                              {item.viewCount && item.viewCount > 100 && (
                                <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200">
                                  热门
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2">{item.summary}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                          <span>更新: {item.lastUpdated}</span>
                          {item.viewCount && <span>浏览: {item.viewCount}次</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Learning Records Tab */}
          <TabsContent value="learning" className="mt-0 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-white border-gray-200">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-[#D94527]">42</div>
                  <div className="text-sm text-gray-600 mt-2">本周查阅知识点</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600">3.5h</div>
                  <div className="text-sm text-gray-600 mt-2">学习时长</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-green-600">85%</div>
                  <div className="text-sm text-gray-600 mt-2">知识掌握度</div>
                </CardContent>
              </Card>
            </div>

            {/* Knowledge Heatmap */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#D94527]" />
                  学习热力图
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 28 }).map((_, index) => {
                    const intensity = Math.floor(Math.random() * 4);
                    const colors = ["bg-gray-100", "bg-blue-200", "bg-blue-400", "bg-blue-600"];
                    return (
                      <div
                        key={index}
                        className={`h-12 rounded ${colors[intensity]} hover:ring-2 hover:ring-[#D94527] cursor-pointer transition-all`}
                        title={`${intensity} 个知识点`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                  <span>深色表示查阅频次高</span>
                  <div className="flex items-center gap-2">
                    <span>少</span>
                    <div className="flex gap-1">
                      {["bg-gray-100", "bg-blue-200", "bg-blue-400", "bg-blue-600"].map((color, i) => (
                        <div key={i} className={`h-3 w-3 rounded ${color}`} />
                      ))}
                    </div>
                    <span>多</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-purple-900 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  AI学习建议
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-2">薄弱知识点</h4>
                  <p className="text-sm text-gray-700 mb-3">您对"生物制剂使用时机"相关知识查阅较少</p>
                  <div className="space-y-1 text-sm text-gray-600 pl-4">
                    <p>• TNF-α抑制剂的适应症</p>
                    <p>• 生物制剂的安全性监测</p>
                  </div>
                  <button className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                    开始学习
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Knowledge Map Tab */}
          <TabsContent value="map" className="mt-0">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-8">
                <div className="flex items-center justify-center min-h-[500px]">
                  <div className="text-center space-y-4">
                    <div className="w-64 h-64 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <BookOpen className="h-16 w-16 text-[#D94527] mx-auto mb-4" />
                        <p className="text-lg font-bold text-gray-900">知识图谱</p>
                        <p className="text-sm text-gray-600 mt-2">交互式知识关系可视化</p>
                      </div>
                    </div>
                    <p className="text-gray-500">知识图谱功能开发中...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
