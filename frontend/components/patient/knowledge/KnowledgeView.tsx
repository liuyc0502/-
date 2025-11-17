"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Heart, Sparkles, ChevronRight, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock data
const mockRecommendations = [
  {
    id: "1",
    title: "结肠腺癌基础知识",
    category: "疾病介绍",
    readTime: "5分钟",
    description: "了解结肠腺癌的基本概念、发病原因和常见症状",
    progress: 100,
    isNew: false
  },
  {
    id: "2",
    title: "术后康复指南",
    category: "康复护理",
    readTime: "8分钟",
    description: "结肠癌术后的康复要点、饮食建议和注意事项",
    progress: 60,
    isNew: false
  },
  {
    id: "3",
    title: "肿瘤标志物解读",
    category: "检查解读",
    readTime: "6分钟",
    description: "CEA、CA199等肿瘤标志物的含义和临床意义",
    progress: 0,
    isNew: true
  }
];

const mockKnowledgeCards = [
  {
    id: "1",
    category: "疾病介绍",
    icon: "🏥",
    items: [
      { id: "1-1", title: "什么是结肠腺癌？", hasRead: true },
      { id: "1-2", title: "结肠癌的分期", hasRead: true },
      { id: "1-3", title: "常见的治疗方法", hasRead: false },
      { id: "1-4", title: "预后与生存率", hasRead: false }
    ]
  },
  {
    id: "2",
    category: "治疗方案",
    icon: "💊",
    items: [
      { id: "2-1", title: "手术治疗详解", hasRead: true },
      { id: "2-2", title: "化疗的作用与副作用", hasRead: false },
      { id: "2-3", title: "放疗适应症", hasRead: false },
      { id: "2-4", title: "靶向治疗新进展", hasRead: false }
    ]
  },
  {
    id: "3",
    category: "日常护理",
    icon: "🍎",
    items: [
      { id: "3-1", title: "术后饮食指南", hasRead: true },
      { id: "3-2", title: "伤口护理要点", hasRead: true },
      { id: "3-3", title: "适宜的运动方式", hasRead: false },
      { id: "3-4", title: "心理调适建议", hasRead: false }
    ]
  },
  {
    id: "4",
    category: "常见问题",
    icon: "❓",
    items: [
      { id: "4-1", title: "为什么会得结肠癌？", hasRead: true },
      { id: "4-2", title: "能完全治愈吗？", hasRead: false },
      { id: "4-3", title: "需要注意哪些复发征兆？", hasRead: false },
      { id: "4-4", title: "家人需要做筛查吗？", hasRead: false }
    ]
  }
];

const mockMyCollections = [
  {
    id: "1",
    title: "低脂饮食食谱推荐",
    category: "日常护理",
    collectedAt: "2025-11-15"
  },
  {
    id: "2",
    title: "CEA指标详解",
    category: "检查解读",
    collectedAt: "2025-11-10"
  }
];

export function KnowledgeView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("recommend");
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  if (selectedArticle) {
    return (
      <div className="h-full flex flex-col bg-[#F4FBF7] overflow-hidden">
        <div className="bg-[#F4FBF7] border-b border-gray-200 flex-shrink-0">
          <div className="px-8 py-6">
            <Button variant="ghost" onClick={() => setSelectedArticle(null)} className="text-gray-600 hover:text-gray-900 -ml-2 mb-4">
              ← 返回
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">什么是结肠腺癌？</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span>疾病介绍</span>
              <span>•</span>
              <span>5分钟阅读</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-8 prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  结肠腺癌是一种起源于结肠黏膜上皮细胞的恶性肿瘤，是消化道常见的恶性肿瘤之一。
                  随着生活方式的改变和人口老龄化，其发病率呈上升趋势。
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">发病原因</h3>
                <p className="text-gray-700 leading-relaxed">
                  结肠腺癌的发生是多因素综合作用的结果，包括：
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>高脂肪、低纤维饮食</li>
                  <li>遗传因素和家族史</li>
                  <li>结肠息肉等癌前病变</li>
                  <li>炎症性肠病</li>
                  <li>生活习惯（吸烟、饮酒等）</li>
                </ul>

                <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">常见症状</h3>
                <p className="text-gray-700 leading-relaxed">
                  早期结肠癌可能没有明显症状，随着病情进展可能出现：
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>排便习惯改变（便秘或腹泻）</li>
                  <li>便血或黑便</li>
                  <li>腹痛或腹部不适</li>
                  <li>体重下降</li>
                  <li>贫血和乏力</li>
                </ul>

                <div className="mt-8 p-5 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#10B981]" />
                    AI小贴士
                  </h4>
                  <p className="text-sm text-gray-700">
                    定期体检和早期筛查对于结肠癌的预防非常重要。如果您有家族史或出现上述症状，建议及时就医检查。
                    保持健康的生活方式，包括均衡饮食、适量运动、戒烟限酒，可以降低患病风险。
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="mt-5 flex gap-3">
              <Button className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white">
                向AI提问
              </Button>
              <Button variant="outline" className="flex-1 text-gray-600 hover:bg-gray-100">
                <Heart className="h-4 w-4 mr-2" />
                收藏
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#F4FBF7] overflow-hidden">
      {/* Header with Tab Navigation */}
      <div className="bg-[#F4FBF7] border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">疾病百科</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-100 h-14 p-1 gap-1">
              <TabsTrigger
                value="recommend"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                为您推荐
              </TabsTrigger>
              <TabsTrigger
                value="browse"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                知识浏览
              </TabsTrigger>
              <TabsTrigger
                value="collection"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                我的收藏
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* For You Tab */}
            <TabsContent value="recommend" className="mt-0 space-y-5">
              {/* Search */}
              <div className="relative w-1/2">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="搜索健康知识..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-white border-gray-200"
                />
              </div>

              {/* AI Recommendations */}
              <Card className="bg-gradient-to-br from-blue-50 to-green-50 border-blue-200">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#10B981]" />
                    <h2 className="text-lg font-bold text-gray-900">AI为您推荐</h2>
                  </div>
                  <p className="text-sm text-gray-700">
                    根据您的病情和学习进度，我们为您精选了以下内容
                  </p>
                </CardContent>
              </Card>

              {/* Recommended Articles */}
              <div className="space-y-3">
                {mockRecommendations.map((item) => (
                  <Card
                    key={item.id}
                    className="bg-white border-gray-200 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedArticle(item.id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-gray-900">{item.title}</h3>
                            {item.isNew && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                新
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                            <span>{item.category}</span>
                            <span>•</span>
                            <span>{item.readTime}</span>
                          </div>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                      </div>
                      {item.progress > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>学习进度</span>
                            <span>{item.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-[#10B981] h-1.5 rounded-full transition-all"
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Browse Tab */}
            <TabsContent value="browse" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockKnowledgeCards.map((card) => (
                  <Card key={card.id} className="bg-white border-gray-200">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{card.icon}</span>
                        <h3 className="font-bold text-lg text-gray-900">{card.category}</h3>
                      </div>
                      <div className="space-y-2">
                        {card.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedArticle(item.id)}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              {item.hasRead ? (
                                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                              )}
                              <span className={`text-sm ${item.hasRead ? "text-gray-500" : "text-gray-900 font-medium"}`}>
                                {item.title}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Collection Tab */}
            <TabsContent value="collection" className="mt-0 space-y-3">
              {mockMyCollections.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">您还没有收藏任何内容</p>
                </div>
              ) : (
                mockMyCollections.map((item) => (
                  <Card
                    key={item.id}
                    className="bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedArticle(item.id)}
                  >
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        <div>
                          <h3 className="font-bold text-gray-900">{item.title}</h3>
                          <div className="text-sm text-gray-600 mt-1">
                            {item.category} · 收藏于 {item.collectedAt}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
