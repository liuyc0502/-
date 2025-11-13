"use client";

import React, { useState } from "react";
import {
  Search,
  BookOpen,
  Microscope,
  FileText,
  Star,
  Clock,
  TrendingUp,
  ChevronRight,
  Eye,
  Bookmark,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Knowledge category
type KnowledgeCategory =
  | "diagnosis"
  | "staining"
  | "technique"
  | "research"
  | "guideline";

// Knowledge article interface
interface KnowledgeArticle {
  id: string;
  title: string;
  category: KnowledgeCategory;
  summary: string;
  author: string;
  publishDate: string;
  readTime: number;
  views: number;
  bookmarked: boolean;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

// Category badge component
const CategoryBadge = ({ category }: { category: KnowledgeCategory }) => {
  const categoryConfig = {
    diagnosis: { label: "诊断标准", color: "bg-blue-100 text-blue-800" },
    staining: { label: "染色方法", color: "bg-purple-100 text-purple-800" },
    technique: { label: "技术规范", color: "bg-green-100 text-green-800" },
    research: { label: "研究进展", color: "bg-orange-100 text-orange-800" },
    guideline: { label: "临床指南", color: "bg-red-100 text-red-800" },
  };

  const config = categoryConfig[category];

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// Difficulty badge component
const DifficultyBadge = ({
  difficulty,
}: {
  difficulty: "beginner" | "intermediate" | "advanced";
}) => {
  const difficultyConfig = {
    beginner: { label: "入门", color: "bg-green-100 text-green-800" },
    intermediate: { label: "进阶", color: "bg-yellow-100 text-yellow-800" },
    advanced: { label: "高级", color: "bg-red-100 text-red-800" },
  };

  const config = difficultyConfig[difficulty];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

export function PathologyKnowledge() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    KnowledgeCategory | "all"
  >("all");

  // Demo knowledge articles
  const articles: KnowledgeArticle[] = [
    {
      id: "1",
      title: "HE染色技术规范与常见问题解决方案",
      category: "staining",
      summary:
        "详细介绍苏木精-伊红染色的标准流程、关键步骤、质量控制要点以及常见染色问题的解决方法。",
      author: "李建国",
      publishDate: "2024-11-10",
      readTime: 15,
      views: 1245,
      bookmarked: true,
      tags: ["HE染色", "质量控制", "技术规范"],
      difficulty: "beginner",
    },
    {
      id: "2",
      title: "乳腺癌病理诊断共识与鉴别要点",
      category: "diagnosis",
      summary:
        "基于最新国际指南，系统阐述乳腺癌的病理分型、分级标准、免疫组化标志物的应用及鉴别诊断要点。",
      author: "陈医生",
      publishDate: "2024-11-08",
      readTime: 25,
      views: 2156,
      bookmarked: false,
      tags: ["乳腺癌", "诊断标准", "免疫组化"],
      difficulty: "advanced",
    },
    {
      id: "3",
      title: "免疫组化染色标准操作流程",
      category: "technique",
      summary:
        "免疫组化技术的基本原理、操作步骤、抗体选择、结果判读以及质控要求的全面指南。",
      author: "王医生",
      publishDate: "2024-11-05",
      readTime: 20,
      views: 1876,
      bookmarked: true,
      tags: ["免疫组化", "操作规范", "质量控制"],
      difficulty: "intermediate",
    },
    {
      id: "4",
      title: "肺癌分子病理学最新研究进展",
      category: "research",
      summary:
        "总结肺癌分子标志物检测的最新技术、临床应用价值以及精准医疗时代的个体化治疗策略。",
      author: "李建国",
      publishDate: "2024-11-01",
      readTime: 30,
      views: 3421,
      bookmarked: false,
      tags: ["肺癌", "分子病理", "精准医疗"],
      difficulty: "advanced",
    },
    {
      id: "5",
      title: "消化道活检病理诊断临床路径",
      category: "guideline",
      summary:
        "消化道疾病病理活检的取材要求、诊断标准、报告规范及与临床的沟通要点。",
      author: "陈医生",
      publishDate: "2024-10-28",
      readTime: 18,
      views: 1654,
      bookmarked: true,
      tags: ["消化道", "活检", "临床路径"],
      difficulty: "intermediate",
    },
    {
      id: "6",
      title: "冰冻切片技术要点与快速诊断策略",
      category: "technique",
      summary:
        "术中冰冻切片的制作技巧、诊断原则、常见陷阱及如何提高诊断准确性。",
      author: "王医生",
      publishDate: "2024-10-25",
      readTime: 12,
      views: 987,
      bookmarked: false,
      tags: ["冰冻切片", "术中诊断", "快速诊断"],
      difficulty: "intermediate",
    },
  ];

  // Filter articles
  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "all" || article.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Category tabs
  const categoryTabs: {
    value: KnowledgeCategory | "all";
    label: string;
    icon: any;
  }[] = [
    { value: "all", label: "全部", icon: BookOpen },
    { value: "diagnosis", label: "诊断标准", icon: Microscope },
    { value: "staining", label: "染色方法", icon: FileText },
    { value: "technique", label: "技术规范", icon: Star },
    { value: "research", label: "研究进展", icon: TrendingUp },
    { value: "guideline", label: "临床指南", icon: BookOpen },
  ];

  // Featured topics
  const featuredTopics = [
    { name: "肿瘤病理学", count: 156 },
    { name: "免疫组化", count: 89 },
    { name: "分子病理", count: 72 },
    { name: "细胞病理", count: 54 },
    { name: "特殊染色", count: 43 },
  ];

  return (
    <div className="flex-1 bg-gray-50 overflow-hidden flex">
      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">病理知识库</h1>
              <p className="text-sm text-gray-500 mt-1">
                系统的病理学知识和临床指南
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Bookmark className="h-4 w-4 mr-2" />
                我的收藏
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                分享
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索知识文章、标签或关键词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {categoryTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => setSelectedCategory(tab.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === tab.value
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid gap-4">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Title and badges */}
                    <div className="flex items-start gap-3 mb-3">
                      <h3 className="text-lg font-bold text-gray-900 flex-1">
                        {article.title}
                      </h3>
                      {article.bookmarked && (
                        <Bookmark className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <CategoryBadge category={article.category} />
                      <DifficultyBadge difficulty={article.difficulty} />
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {article.summary}
                    </p>

                    {/* Tags */}
                    <div className="flex items-center gap-2 mb-3">
                      {article.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{article.author}</span>
                      <span>•</span>
                      <span>{article.publishDate}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{article.readTime} 分钟阅读</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{article.views} 次浏览</span>
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <Button variant="outline" size="sm" className="ml-4">
                    阅读
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <BookOpen className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">未找到相关知识文章</p>
              <p className="text-sm mt-1">请尝试其他搜索关键词</p>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar - Featured topics */}
      <div className="w-72 bg-white border-l overflow-auto p-6 flex-shrink-0">
        <h3 className="text-sm font-bold text-gray-900 mb-4">热门专题</h3>
        <div className="space-y-2">
          {featuredTopics.map((topic) => (
            <button
              key={topic.name}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                {topic.name}
              </span>
              <span className="text-xs text-gray-500">{topic.count} 篇</span>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-bold text-gray-900 mb-4">最新更新</h3>
          <div className="space-y-3">
            {articles.slice(0, 3).map((article) => (
              <div
                key={article.id}
                className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors"
              >
                <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                  {article.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{article.publishDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

