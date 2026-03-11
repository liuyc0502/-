"use client";

import { useState, useEffect } from "react";
import { Modal, Spin, App, Button as AntButton, Image } from "antd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  X,
  Calendar,
  FileText,
  MessageCircle,
  Download,
  ArrowUp,
  ArrowDown,
  Minus,
  TestTube,
  Scan,
  Pill,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import patientService from "@/services/patientService";
import { storageService } from "@/services/storageService";
import type { TimelineWithDetail, LabReport, ImagingReport } from "@/types/patient";
import { AssociatedConversations } from "@/components/doctor/chat/AssociatedConversations";

interface DiagnosisDetailModalProps {
  open: boolean;
  onClose: () => void;
  timelineId: number | null;
  patientId: number;
}

// Helper function to resolve file URLs
const ensureFileUrl = async (raw?: string) => {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/api/")) return raw;
  const objectName = raw.replace(/^\/+/, "");
  try {
    return await storageService.getFileUrl(objectName);
  } catch (error) {
    console.error("Failed to resolve file url:", error);
    return raw;
  }
};

// Format date helper
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "待定";
  return new Date(dateString).toLocaleDateString("zh-CN");
};

// Get metric status color
const getMetricStatusColor = (status?: string) => {
  switch (status) {
    case "normal":
      return "text-green-600 bg-green-50 border-green-200";
    case "slightly_high":
    case "slightly_low":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "high":
    case "low":
      return "text-red-600 bg-red-50 border-red-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

// Get metric trend icon
const getTrendIcon = (trend?: string) => {
  switch (trend) {
    case "up":
      return <ArrowUp className="h-4 w-4 text-red-500" />;
    case "down":
      return <ArrowDown className="h-4 w-4 text-blue-500" />;
    case "stable":
      return <Minus className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
};

// Get stage type color
const getStageTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    初诊: "bg-blue-100 text-blue-700 border-blue-200",
    检查: "bg-yellow-100 text-yellow-700 border-yellow-200",
    确诊: "bg-red-100 text-red-700 border-red-200",
    治疗: "bg-purple-100 text-purple-700 border-purple-200",
    随访: "bg-green-100 text-green-700 border-green-200",
  };
  return colors[type] || "bg-gray-100 text-gray-700 border-gray-200";
};

// Get status text and color
const getStatusDisplay = (status: string) => {
  switch (status) {
    case "completed":
      return { text: "已完成", color: "text-green-600 bg-green-50" };
    case "current":
      return { text: "进行中", color: "text-blue-600 bg-blue-50" };
    case "pending":
      return { text: "待处理", color: "text-gray-600 bg-gray-50" };
    default:
      return { text: "未知", color: "text-gray-600 bg-gray-50" };
  }
};

export function DiagnosisDetailModal({
  open,
  onClose,
  timelineId,
  patientId,
}: DiagnosisDetailModalProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [timelineData, setTimelineData] = useState<TimelineWithDetail | null>(null);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [imagingReports, setImagingReports] = useState<ImagingReport[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open && timelineId) {
      loadTimelineDetail();
    }
  }, [open, timelineId]);

  const loadTimelineDetail = async () => {
    if (!timelineId) return;

    try {
      setLoading(true);

      // Load timeline detail
      const detail = await patientService.getTimelineDetail(timelineId);
      setTimelineData(detail);

      // Load lab reports
      try {
        const labs = await patientService.getLabReportsByTimeline(timelineId);
        setLabReports(labs || []);
      } catch (err) {
        console.error("Failed to load lab reports:", err);
        setLabReports([]);
      }

      // Load imaging reports
      try {
        const imaging = await patientService.getImagingReportsByTimeline(timelineId);
        setImagingReports(imaging || []);
      } catch (err) {
        console.error("Failed to load imaging reports:", err);
        setImagingReports([]);
      }

      // Resolve image URLs
      if (detail.images && detail.images.length > 0) {
        const urls: Record<number, string> = {};
        await Promise.all(
          detail.images.map(async (img) => {
            urls[img.image_id] = await ensureFileUrl(img.image_url);
          })
        );
        setImageUrls(urls);
      }
    } catch (error: any) {
      console.error("Failed to load timeline detail:", error);
      message.error(error?.message || "加载详情失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAskAI = () => {
    message.info("即将跳转到 AI 对话界面");
    // TODO: Navigate to chat with context
  };

  const handleDownloadReport = () => {
    message.info("下载功能开发中");
    // TODO: Implement download functionality
  };

  if (!open) return null;

  const statusDisplay = timelineData ? getStatusDisplay(timelineData.status) : null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="90vw"
      closeIcon={<X className="h-5 w-5" />}
      title={null}
      centered
      styles={{
        body: { padding: 0, height: "85vh", overflow: "hidden" },
      }}
    >
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Spin size="large" />
        </div>
      ) : timelineData ? (
        <div className="h-full flex flex-col overflow-hidden">
          {/* Header Section - Fixed */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getStageTypeColor(
                    timelineData.stage_type
                  )}`}
                >
                  {timelineData.stage_type}
                </span>
                <span className="text-gray-500 text-sm flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(timelineData.stage_date)}
                </span>
                {statusDisplay && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}
                  >
                    {statusDisplay.text}
                  </span>
                )}
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {timelineData.stage_title}
            </h2>
          </div>

          {/* Content Area - Two Column Layout */}
          <div className="flex-1 overflow-hidden grid grid-cols-2 gap-6 px-6 py-4">
            {/* Left Column */}
            <div className="space-y-3 overflow-y-auto pr-3">
              {/* AI Patient Summary - Highlighted */}
              {timelineData.detail?.patient_summary && (
                <Card className="border-[#6E977B] bg-gradient-to-r from-[#EFF7F5] to-white">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="h-4 w-4 text-[#6E977B]" />
                      <h3 className="font-semibold text-sm text-gray-900">为您解读</h3>
                      <span className="text-xs bg-[#6E977B] text-white px-2 py-0.5 rounded-full">
                        AI 通俗版
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {timelineData.detail.patient_summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Diagnosis Description */}
              {timelineData.diagnosis && (
                <Card className="border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-[#6E977B]" />
                      <h3 className="font-semibold text-sm text-gray-900">诊断说明</h3>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">
                      {timelineData.diagnosis}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Key Metrics */}
              {timelineData.metrics && timelineData.metrics.length > 0 && (
                <Card className="border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TestTube className="h-4 w-4 text-[#6E977B]" />
                      <h3 className="font-semibold text-sm text-gray-900">关键检查指标</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {timelineData.metrics.slice(0, 4).map((metric) => (
                        <div
                          key={metric.metric_id}
                          className={`p-2 rounded-lg border text-xs ${getMetricStatusColor(
                            metric.metric_status
                          )}`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-medium truncate">{metric.metric_name}</span>
                            {getTrendIcon(metric.metric_trend)}
                          </div>
                          <div className="text-lg font-bold">
                            {metric.metric_value}
                            {metric.metric_unit && (
                              <span className="text-xs font-normal ml-1">{metric.metric_unit}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Medications */}
              {timelineData.detail?.medications && timelineData.detail.medications.length > 0 && (
                <Card className="border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="h-4 w-4 text-[#6E977B]" />
                      <h3 className="font-semibold text-sm text-gray-900">用药信息</h3>
                    </div>
                    <ul className="space-y-1 text-sm">
                      {timelineData.detail.medications.slice(0, 3).map((med, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-[#6E977B] mt-0.5">💊</span>
                          <span className="line-clamp-1">{med}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-3 overflow-y-auto pr-3">
              {/* Medical Images */}
              {timelineData.images && timelineData.images.length > 0 && (
                <Card className="border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Scan className="h-4 w-4 text-[#6E977B]" />
                      <h3 className="font-semibold text-sm text-gray-900">医学影像</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Image.PreviewGroup>
                        {timelineData.images.slice(0, 6).map((img) => (
                          <div key={img.image_id} className="relative group">
                            <Image
                              src={imageUrls[img.image_id] || ""}
                              alt={img.image_label || "医学影像"}
                              className="rounded-lg object-cover w-full h-20 border border-gray-200 hover:border-[#6E977B] transition-colors"
                              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-[10px] p-0.5 rounded-b-lg truncate">
                              {img.image_label || "影像"}
                            </div>
                          </div>
                        ))}
                      </Image.PreviewGroup>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lab Reports - Compact */}
              {labReports.length > 0 && (
                <Card className="border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TestTube className="h-4 w-4 text-[#6E977B]" />
                      <h3 className="font-semibold text-sm text-gray-900">化验报告</h3>
                    </div>
                    <div className="space-y-2">
                      {labReports.slice(0, 1).map((report) => (
                        <div key={report.report_id} className="text-xs">
                          <div className="font-medium text-gray-900 mb-1">
                            {report.report_type || "化验报告"}
                          </div>
                          {report.ai_summary && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                              <p className="text-xs text-gray-700 line-clamp-2">
                                {report.ai_summary}
                              </p>
                            </div>
                          )}
                          {report.items && report.items.length > 0 && (
                            <div className="text-xs">
                              {report.items.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex justify-between py-1 border-b last:border-0">
                                  <span className="truncate flex-1">{item.test_item_name}</span>
                                  <span className="font-medium ml-2">
                                    {item.test_result}
                                    {item.abnormal_flag === "high" && (
                                      <ArrowUp className="inline h-3 w-3 text-red-600 ml-1" />
                                    )}
                                    {item.abnormal_flag === "low" && (
                                      <ArrowDown className="inline h-3 w-3 text-blue-600 ml-1" />
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Imaging Reports - Compact */}
              {imagingReports.length > 0 && (
                <Card className="border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Scan className="h-4 w-4 text-[#6E977B]" />
                      <h3 className="font-semibold text-sm text-gray-900">影像检查</h3>
                    </div>
                    <div className="space-y-3">
                      {imagingReports.map((report) => (
                        <div key={report.report_id} className="space-y-2">
                          <div className="font-medium text-gray-900 text-xs">
                            {report.imaging_type || "影像检查"}
                            {report.examination_site && <span className="text-gray-500 ml-1">- {report.examination_site}</span>}
                          </div>

                          {report.ai_summary && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-2">
                              <div className="text-[10px] font-semibold text-gray-600 mb-1">AI 通俗解读</div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {report.ai_summary}
                              </p>
                            </div>
                          )}

                          {report.imaging_findings && (
                            <div className="bg-gray-50 border border-gray-200 rounded p-2">
                              <div className="text-[10px] font-semibold text-gray-600 mb-1">影像表现</div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {report.imaging_findings}
                              </p>
                            </div>
                          )}

                          {report.diagnostic_impression && (
                            <div className="bg-gray-50 border border-gray-200 rounded p-2">
                              <div className="text-[10px] font-semibold text-gray-600 mb-1">诊断印象</div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {report.diagnostic_impression}
                              </p>
                            </div>
                          )}

                          {report.recommendations && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                              <div className="text-[10px] font-semibold text-gray-600 mb-1">建议</div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {report.recommendations}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Patient Suggestions */}
              {timelineData.detail?.patient_suggestions &&
                timelineData.detail.patient_suggestions.length > 0 && (
                  <Card className="border-gray-200">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-[#6E977B]" />
                        <h3 className="font-semibold text-sm text-gray-900">医生建议</h3>
                      </div>
                      <ul className="space-y-1 text-sm">
                        {timelineData.detail.patient_suggestions.slice(0, 3).map((suggestion, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700">
                            <span className="text-[#6E977B] mt-0.5">📌</span>
                            <span className="line-clamp-1">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>

        </div>
      ) : null}
    </Modal>
  );
}
