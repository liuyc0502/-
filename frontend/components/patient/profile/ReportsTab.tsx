"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Calendar, User, TrendingDown, TrendingUp, Minus, Sparkles, Search } from "lucide-react";

// Mock data
const mockReports = [
  {
    id: "1",
    type: "病理报告",
    date: "2025-11-15",
    doctor: "李医生",
    status: "已解读",
    hasAI: true,
    keyFindings: [
      { indicator: "CEA", value: "3.2 ng/mL", status: "normal", trend: "down" },
      { indicator: "CA199", value: "45 U/mL", status: "slightly_high", trend: "down" }
    ],
    aiSummary: "本次检查结果显示，您的肿瘤标志物指标整体向好。CEA已降至正常范围，CA199虽略高于正常值但较上次明显下降，说明治疗效果良好。建议继续观察并保持健康的生活方式。"
  },
  {
    id: "2",
    type: "血液检查",
    date: "2025-11-10",
    doctor: "李医生",
    status: "已解读",
    hasAI: true,
    keyFindings: [
      { indicator: "白细胞", value: "6.5×10⁹/L", status: "normal", trend: "stable" },
      { indicator: "血红蛋白", value: "128 g/L", status: "normal", trend: "up" }
    ]
  },
  {
    id: "3",
    type: "CT影像",
    date: "2025-11-01",
    doctor: "李医生",
    status: "未解读",
    hasAI: false
  }
];

const filterOptions = [
  { id: "all", label: "全部报告" },
  { id: "pathology", label: "病理报告" },
  { id: "blood", label: "血液检查" },
  { id: "imaging", label: "影像检查" },
  { id: "ai_interpreted", label: "已AI解读" }
];

const getStatusColor = (status: string) => {
  return status === "已解读"
    ? "bg-green-100 text-green-700 border-green-200"
    : "bg-gray-100 text-gray-600 border-gray-200";
};

const getIndicatorColor = (status: string) => {
  const colors: Record<string, string> = {
    "normal": "text-green-600",
    "slightly_high": "text-yellow-600",
    "high": "text-red-600",
    "low": "text-blue-600"
  };
  return colors[status] || "text-gray-600";
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="h-3 w-3 text-red-500" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3 text-green-500" />;
  return <Minus className="h-3 w-3 text-gray-400" />;
};

export function ReportsTab() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  if (selectedReport) {
    const report = mockReports.find(r => r.id === selectedReport);
    if (!report) return null;

    return (
      <div className="space-y-5">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => setSelectedReport(null)} className="text-gray-600 hover:text-gray-900 -ml-2">
          ← 返回报告列表
        </Button>

        {/* Report Detail */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{report.type}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {report.date}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {report.doctor}
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(report.status)}`}>
                {report.status}
              </div>
            </div>

            {/* Original Report Section */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                原始报告
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[200px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">PDF预览或图片展示区域</p>
                </div>
              </div>
            </div>

            {/* AI Interpretation Section */}
            {report.hasAI && (
              <div className="space-y-4 p-5 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <Sparkles className="h-5 w-5 text-[#10B981]" />
                  AI智能解读
                </div>

                {/* Summary */}
                {report.aiSummary && (
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm font-semibold text-gray-700 mb-2">通俗版解释</div>
                    <p className="text-sm text-gray-700 leading-relaxed">{report.aiSummary}</p>
                  </div>
                )}

                {/* Key Findings */}
                {report.keyFindings && report.keyFindings.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700">关键指标</div>
                    {report.keyFindings.map((finding, index) => (
                      <div key={index} className="p-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-semibold text-gray-900">{finding.indicator}</div>
                          <div className={`text-lg font-bold ${getIndicatorColor(finding.status)}`}>
                            {finding.value}
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendIcon trend={finding.trend} />
                            <span className="text-xs text-gray-500">
                              {finding.trend === "up" ? "上升" : finding.trend === "down" ? "下降" : "平稳"}
                            </span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          finding.status === "normal" ? "bg-green-100 text-green-700 border-green-200" :
                          finding.status === "slightly_high" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                          "bg-gray-100 text-gray-600 border-gray-200"
                        }`}>
                          {finding.status === "normal" ? "正常" :
                           finding.status === "slightly_high" ? "略高" :
                           finding.status === "high" ? "偏高" : "偏低"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Trend Chart Placeholder */}
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-3">趋势分析</div>
                  <div className="h-40 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="text-sm">趋势图表区域</div>
                      <div className="text-xs mt-1">(与历史数据对比)</div>
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-2">建议</div>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• 继续观察CA199指标变化</li>
                    <li>• 保持清淡饮食，避免油腻食物</li>
                    <li>• 适量运动，增强体质</li>
                    <li>• 按时服药，定期复查</li>
                  </ul>
                </div>
              </div>
            )}

            {/* AI Q&A Section */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-700">💬 向AI提问</div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="text-gray-600 hover:bg-gray-100">
                  这个指标升高严重吗？
                </Button>
                <Button variant="outline" size="sm" className="text-gray-600 hover:bg-gray-100">
                  我需要做什么？
                </Button>
                <Button variant="outline" size="sm" className="text-gray-600 hover:bg-gray-100">
                  为什么会有这个变化？
                </Button>
              </div>
              <div className="relative">
                <Input
                  placeholder="输入您的问题..."
                  className="pr-20 h-12"
                />
                <Button className="absolute right-1 top-1 bg-[#10B981] hover:bg-[#059669] text-white h-10">
                  提问
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Report List View
  return (
    <div className="space-y-5">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          共 {mockReports.length} 份报告
        </div>
        <Button className="bg-[#10B981] hover:bg-[#059669] text-white">
          <Upload className="h-4 w-4 mr-2" />
          上传新报告
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-1/2">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="搜索报告类型、日期..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 bg-white border-gray-200"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-3">
        {filterOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setActiveFilter(option.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeFilter === option.id
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockReports.map((report) => (
          <Card
            key={report.id}
            className="bg-white border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1"
            onClick={() => setSelectedReport(report.id)}
          >
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#10B981]" />
                  <h3 className="font-bold text-lg text-gray-900">{report.type}</h3>
                </div>
                {report.hasAI && (
                  <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    <Sparkles className="h-3 w-3" />
                    <span className="text-xs font-semibold">AI已解读</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {report.date}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {report.doctor}
                </div>
              </div>

              {report.keyFindings && report.keyFindings.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-500">关键发现</div>
                  <div className="space-y-1">
                    {report.keyFindings.slice(0, 2).map((finding, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{finding.indicator}</span>
                        <span className={`font-semibold ${getIndicatorColor(finding.status)}`}>
                          {finding.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full text-[#10B981] border-[#10B981] hover:bg-[#10B981] hover:text-white"
              >
                查看详细解读
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
