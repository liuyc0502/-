"use client";

import { useState, useEffect } from "react";
import { Search, ChevronRight, BookOpen, TrendingUp, Lightbulb,ArrowLeft} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { doctorKnowledgeService, DoctorKnowledgeBase, DoctorKnowledgeFile, KnowledgeCard } from "@/services/doctorKnowledgeService"
import { message } from "antd";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import remarkGfm from "remark-gfm";


interface KnowledgeTreeNode {
  id: string;
  label: string;
  children?: KnowledgeTreeFile[];
  kbId?: number;
}

interface KnowledgeTreeFile {
  id: string;
  label: string;
  fullPath: string;
}

interface KnowledgeBaseViewProps {
  onSelectKnowledge: (id: string) => void;
  selectedKnowledgeId: string | null;
  onClearSelection: () => void;
}

export function KnowledgeBaseView({
  onSelectKnowledge,
  selectedKnowledgeId,
  onClearSelection,
}:KnowledgeBaseViewProps){
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("search");
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [knowledgeTree, setKnowledgeTree] = useState<KnowledgeTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [knowledgeCards, setKnowledgeCards] = useState<KnowledgeCard[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [cardsLoading, setCardsLoading] = useState(false);
  const[fileContent, setFileContent] = useState<string>("");
  const[fileLoading, setFileLoading] = useState(false);
  const[fileName, setFileName] = useState<string | null>(null);
  

  // Load knowledge bases and build tree structure
  useEffect(() => {
    loadKnowledgeBases();
    loadKnowledgeCards();
  }, []);

  // Load cards when category changes
  useEffect(() => {
    loadKnowledgeCards(selectedCategory);
  }, [selectedCategory]);

  // Load file content when selected
  useEffect(() => {
    console.log("=== selectedKnowledgeId changed ===");
    console.log("New value:", selectedKnowledgeId);
    if (selectedKnowledgeId) {
      loadFileContent(selectedKnowledgeId);
    } else {
      console.log("No knowledge selected, showing cards view");
    }
  }, [selectedKnowledgeId]);

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const bases = await doctorKnowledgeService.getKnowledgeBases();

      // Transform to tree structure
      const tree: KnowledgeTreeNode[] = bases.map((kb) => ({
        id: kb.id.toString(),
        label: kb.name,
        kbId: kb.id,
        children: [] // Will be loaded on expand
      }));

      setKnowledgeTree(tree);

      // Auto-expand first node and load its files
      if (tree.length > 0) {
        const firstNodeId = tree[0].id;
        setExpandedNodes([firstNodeId]);
        await loadNodeFiles(tree[0]);
      }
    } catch (error) {
      message.error("Failed to load knowledge bases");
      console.error("Failed to load knowledge bases:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadNodeFiles = async (node: KnowledgeTreeNode) => {
    if (!node.kbId) return;

    try {
      const files = await doctorKnowledgeService.getKnowledgeBaseFiles(node.kbId);

      // Update the node's children with files
      setKnowledgeTree((prev) =>
        prev.map((n) =>
          n.id === node.id
            ? {
                ...n,
                children: files.map((file) => ({
                  id: file.id,
                  label: file.name,
                  fullPath: file.full_path,
                })),
              }
            : n
        )
      );
    } catch (error) {
      message.error(`Failed to load files for ${node.label}`);
      console.error("Failed to load files:", error);
    }
  };

  const toggleNode = async (node: KnowledgeTreeNode) => {
    const isExpanded = expandedNodes.includes(node.id);

    if (isExpanded) {
      // Collapse
      setExpandedNodes((prev) => prev.filter((id) => id !== node.id));
    } else {
      // Expand and load files if not loaded
      setExpandedNodes((prev) => [...prev, node.id]);

      if (!node.children || node.children.length === 0) {
        await loadNodeFiles(node);
      }
    }
  };

  const handleFileClick = (file: KnowledgeTreeFile) => {
    // Pass the full path to parent for rendering
    onSelectKnowledge(file.fullPath);
  };

  const loadKnowledgeCards = async (category?: string) => {
    try {
      setCardsLoading(true);
      const cards = await doctorKnowledgeService.getAllCards(category);
      console.log("Knowledge cards loaded:", cards);
      console.log("Category filter:", category);
      console.log("Number of cards:", cards.length);
      console.log("Cards data:", cards);
      setKnowledgeCards(cards);
    } catch (error) {
      message.error("Failed to load knowledge cards");
      console.error("Failed to load knowledge cards:", error);
    } finally {
      setCardsLoading(false);
    }
  };

  const handleCategoryClick = (category: string) => {
    // Toggle category selection
    if (selectedCategory === category) {
      setSelectedCategory(undefined);
    } else {
      setSelectedCategory(category);
    }
  };

  const loadFileContent = async (filePath: string) => {
    try {
      console.log("=== Loading file content ===");
      console.log("File path:", filePath);
      setFileLoading(true);
      const fileData = await doctorKnowledgeService.getFileContent(filePath);
      console.log("File data received:", fileData);
      setFileContent(fileData.content);
      // Extract file name from path
      const parts = filePath.split("/");
      const name = parts[parts.length - 1].replace(".md", "");
      setFileName(name);
      console.log("File loaded successfully:", name);
    } catch (error) {
      console.error("=== Error loading file ===");
      console.error("File path:", filePath);
      console.error("Error details:", error);
      message.error(`加载文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setFileLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header with Tab Navigation */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">知识库</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-100 h-14 p-1 gap-1">
              <TabsTrigger
                value="search"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                知识检索
              </TabsTrigger>
              <TabsTrigger
                value="learning"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                学习记录
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                知识地图
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Knowledge Search Tab */}
          <TabsContent value="search" className="mt-0">
            <div className="grid grid-cols-12 gap-4">
              {/* Left Sidebar - Knowledge Tree */}
              <div className="col-span-12 lg:col-span-3">
                <Card className="bg-white border-gray-200 sticky top-8">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">知识分类</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-1">
                      {loading ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                          加载中...
                        </div>
                      ) : knowledgeTree.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                          暂无知识库
                        </div>
                      ) : (
                        knowledgeTree.map((node) => (
                          <div key={node.id}>
                            <button
                              onClick={() => toggleNode(node)}
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
                            {expandedNodes.includes(node.id) && node.children && (
                              <div className="ml-8 space-y-1">
                                {node.children.length === 0 ? (
                                  <div className="px-4 py-2 text-xs text-gray-400">
                                    暂无文件
                                  </div>
                                ) : (
                                  node.children.map((child) => (
                                    <button
                                      key={child.id}
                                      onClick={() => handleFileClick(child)}
                                      className="w-full text-left px-4 py-1.5 text-sm text-gray-600 hover:text-[#D94527] hover:bg-gray-50 transition-colors"
                                    >
                                      {child.label}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Content Area */}
              <div className="col-span-12 lg:col-span-9 space-y-6">
                {selectedKnowledgeId ? (
                  // Document Detail View
                  <div className="space-y-4">
                    {/* Back Button and Title */}
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        onClick={onClearSelection}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        返回知识库
                      </Button>
                      <h2 className="text-2xl font-bold text-gray-900">{fileName || "加载中..."}</h2>
                    </div>

                    {/* Document Content */}
                    {fileLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                          <div className="text-lg text-gray-600">加载中...</div>
                        </div>
                      </div>
                    ) : (
                      <Card className="bg-white border-gray-200">
                        <CardContent className="p-8">
                          <article className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-[#D94527] prose-strong:text-gray-900 prose-code:text-[#D94527] prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {fileContent}
                            </ReactMarkdown>
                          </article>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  // Knowledge Search and Cards View
                  <>
                    {/* Search Bar */}
                    <div className="relative w-1/2">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="搜索疾病、药物、诊断标准..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-14 bg-white border-gray-200 text-base"
                      />
                    </div>

                    {/* Quick Category Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {["解剖学", "病理学", "诊断标准", "药物信息", "治疗方案"].map((category) => (
                        <button
                          key={category}
                          onClick={() => handleCategoryClick(category)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedCategory === category
                              ? "bg-[#D94527] text-white border border-[#D94527]"
                              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>

                    {/* Knowledge Cards */}
                    <div className="space-y-4">
                      {cardsLoading ? (
                        <div className="text-center py-20">
                          <div className="text-lg text-gray-600">加载中...</div>
                        </div>
                      ) : knowledgeCards.length === 0 ? (
                        <div className="text-center py-20">
                          <div className="text-lg text-gray-500">暂无知识卡片</div>
                          <p className="text-sm text-gray-400 mt-2">管理员可以在设置中为知识库文件创建卡片</p>
                        </div>
                      ) : (
                        knowledgeCards.map((card) => (
                          <Card
                            key={card.card_id}
                            className="bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => {
                              console.log("=== Card clicked ===");
                              console.log("Card title:", card.card_title);
                              console.log("File path:", card.file_path);
                              console.log("Full card data:", card);
                              onSelectKnowledge(card.file_path)}}
                          >
                            <CardContent className="p-5 space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {card.category && (
                                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                                        {card.category}
                                      </span>
                                    )}
                                    {card.view_count && card.view_count > 100 && (
                                      <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200">
                                        热门
                                      </span>
                                    )}
                                    {card.tags && card.tags.length > 0 && (
                                      <div className="flex gap-1 flex-wrap">
                                        {card.tags.slice(0, 3).map((tag, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <h3 className="font-bold text-lg text-gray-900 mb-2">{card.card_title}</h3>
                                  <p className="text-sm text-gray-600 line-clamp-2">
                                    {card.card_summary || "暂无摘要"}
                                  </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                                <span>更新: {new Date(card.update_time).toLocaleDateString()}</span>
                                {card.view_count !== undefined && <span>浏览: {card.view_count}次</span>}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </>
                )}
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
    </div>
  );
}
