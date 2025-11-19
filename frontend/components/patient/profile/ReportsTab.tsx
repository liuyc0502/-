"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Calendar, User, TrendingDown, TrendingUp, Minus, Sparkles, Search } from "lucide-react";
import patientReportService from "@/services/patientReportService";
import { message } from "antd";
import type { PatientReport, ReportDetail } from "@/types/patientReport";


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
  const [reports, setReports] = useState<PatientReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // TODO: Get patient_id from authentication context or props
  const PATIENT_ID = 1; // Temporary hardcoded value

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await patientReportService.getReportList(PATIENT_ID);
      setReports(data);
    } catch (error) {
      message.error('加载报告失败');
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };
 
  const loadReportDetail = async (reportId: string) => {
    try {
      setDetailLoading(true);
      const detail = await patientReportService.getReportDetail(Number(reportId));
      setSelectedReport(detail);
    } catch (error) {
      message.error('加载报告详情失败');
      console.error('Failed to load report detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  if (selectedReport) {
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#10B981] border-r-transparent mb-4"></div>
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      );
    }

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
                <h2 className="text-2xl font-bold text-gray-900">{selectedReport.type}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {selectedReport.date}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {selectedReport.doctor}
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedReport.status)}`}>
                {selectedReport.status}
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
            {selectedReport.hasAI && (
              <div className="space-y-4 p-5 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <Sparkles className="h-5 w-5 text-[#10B981]" />
                  AI智能解读
                </div>

                {/* Summary */}
                {selectedReport.aiSummary && (
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm font-semibold text-gray-700 mb-2">通俗版解释</div>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedReport.aiSummary}</p>
                  </div>
                )}

                {/* Key Findings */}
                {selectedReport.metrics && selectedReport.metrics.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700">关键指标</div>
                    {selectedReport.metrics.map((metric, index) => (
                      <div key={index} className="p-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-semibold text-gray-900">{metric.metric_name}</div>
                          <div className={`text-lg font-bold ${getIndicatorColor(metric.metric_status || 'normal')}`}>
                            {metric.metric_value} {metric.metric_unit || ''}
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendIcon trend={metric.metric_trend || 'stable'} />
                            <span className="text-xs text-gray-500">
                              {metric.metric_trend === "up" ? "上升" : metric.metric_trend === "down" ? "下降" : "平稳"}
                            </span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          metric.metric_status === "normal" ? "bg-green-100 text-green-700 border-green-200" :
                          metric.metric_status === "slightly_high" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                          "bg-gray-100 text-gray-600 border-gray-200"
                        }`}>
                          {metric.metric_status === "normal" ? "正常" :
                           metric.metric_status === "slightly_high" ? "略高" :
                           metric.metric_status === "high" ? "偏高" : "偏低"}
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
                {selectedReport.suggestions && selectedReport.suggestions.length > 0 && (
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm font-semibold text-gray-700 mb-2">建议</div>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {selectedReport.suggestions.map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#10B981] border-r-transparent mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  // Filter and search reports
  const filteredReports = reports.filter((report) => {
    // Filter by category
    if (activeFilter === 'pathology' && !report.type.includes('病理')) return false;
    if (activeFilter === 'blood' && !report.type.includes('血液') && !report.type.includes('化验')) return false;
    if (activeFilter === 'imaging' && !report.type.includes('影像') && !report.type.includes('CT') && !report.type.includes('X光')) return false;
    if (activeFilter === 'ai_interpreted' && !report.hasAI) return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        report.type.toLowerCase().includes(query) ||
        report.date.includes(query) ||
        report.doctor.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          共 {filteredReports.length} 份报告
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
      {filteredReports.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">暂无检查报告</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <Card
              key={report.id}
              className="bg-white border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1"
              onClick={() => loadReportDetail(report.id)}
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
      )}
    </div>
  );
}
