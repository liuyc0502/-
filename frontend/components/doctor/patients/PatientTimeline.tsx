"use client";

import { useState, useEffect, Fragment } from "react";
import { Card, App, Button, Modal } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  FileText,
  TestTube,
  Pill,
  ArrowUpDown,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Download,
} from "lucide-react";
import patientService from "@/services/patientService";
import type { Patient, TimelineStage, TimelineWithDetail, LabReport, ImagingReport } from "@/types/patient";
import { CreateTimelineModal } from "./CreateTimelineModal";
import { EditTimelineDetailModal } from "./EditTimelineDetailModal";
import { storageService } from "@/services/storageService";
import { AssociatedConversations } from "@/components/doctor/chat/AssociatedConversations";

// ============================================================================
// Constants
// ============================================================================
const PRIMARY_COLOR = "#D94527";

// ============================================================================
// Types
// ============================================================================
interface PatientTimelineProps {
  patientId: string;
  onConversationClick?: (conversationId: number) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "待定";
  return new Date(dateString).toLocaleDateString("zh-CN");
};

const getMetricStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    error: "异常",
    warning: "偏高",
    improving: "改善中",
    normal: "正常",
  };
  return statusMap[status] || "正常";
};

const ensureFileUrl = async (raw?: string) => {
  if (!raw) return "";
  // Already a full URL
  if (/^https?:\/\//i.test(raw)) return raw;
  // Already a backend API path (from new upload format)
  if (raw.startsWith("/api/")) return raw;
  const objectName = raw.replace(/^\/+/, "");
  try {
    return await storageService.getFileUrl(objectName);
  } catch (error) {
    console.error("Failed to resolve file url:", error);
    return raw;
  }
};

// ============================================================================
// Main Component
// ============================================================================
export function PatientTimeline({ patientId, onConversationClick }: PatientTimelineProps) {
  const { message, modal } = App.useApp();
  
  // ============================================================================
  // State
  // ============================================================================
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timelines, setTimelines] = useState<TimelineStage[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineWithDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentTimelineId, setCurrentTimelineId] = useState<number | null>(null);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [imagingReports, setImagingReports] = useState<ImagingReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    loadPatientAndTimeline();
  }, [patientId]);

  // ============================================================================
  // Data Loading Functions
  // ============================================================================
  const loadPatientAndTimeline = async () => {
    try {
      setLoading(true);
      const [patientData, timelineData] = await Promise.all([
        patientService.getPatient(parseInt(patientId)),
        patientService.getPatientTimeline(parseInt(patientId)),
      ]);

      setPatient(patientData);
      setTimelines(timelineData);

      if (timelineData.length > 0) {
        loadTimelineDetail(timelineData[0].timeline_id);
      }
    } catch (error) {
      message.error("加载时间线失败");
      console.error("Failed to load timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimelineDetail = async (timelineId: number) => {
    try {
      setDetailLoading(true);
      const detail = await patientService.getTimelineDetail(timelineId);

      // Resolve media URLs so browser can load images/attachments
      const resolvedImages = await Promise.all(
        (detail.images || []).map(async (img) => {
          const resolvedImageUrl = await ensureFileUrl(img.image_url);
          const resolvedThumb = await ensureFileUrl(img.thumbnail_url || img.image_url);
          return {
            ...img,
            image_url: resolvedImageUrl,
            thumbnail_url: resolvedThumb,
          };
        })
      );

      const resolvedAttachments = await Promise.all(
        (detail.attachments || []).map(async (att) => ({
          ...att,
          file_url: await ensureFileUrl(att.file_url),
        }))
      );

      setSelectedTimeline({
        ...detail,
        images: resolvedImages,
        attachments: resolvedAttachments,
      });

      // Load lab and imaging reports for this timeline
      loadReportsForTimeline(timelineId);
    } catch (error) {
      message.error("加载时间线详情失败");
      console.error("Failed to load timeline detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadReportsForTimeline = async (timelineId: number) => {
    try {
      setReportsLoading(true);
      const [labData, imagingData] = await Promise.all([
        patientService.getLabReportsByTimeline(timelineId),
        patientService.getImagingReportsByTimeline(timelineId),
      ]);
      setLabReports(labData || []);
      setImagingReports(imagingData || []);
    } catch (error) {
      console.error("Failed to load reports:", error);
      // Only show error message for real errors (not 404 - no reports)
      if (error instanceof Error && !error.message.includes('404')) {
        message.error("加载报告失败");
      }
      // Set empty arrays on error to prevent UI issues
      setLabReports([]);
      setImagingReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleStageClick = (timelineId: number) => {
    loadTimelineDetail(timelineId);
  };

  const handleDeleteTimeline = async (timeline: TimelineStage) => {
    if (!timeline.timeline_id) {
      message.error('时间线ID无效，无法删除');
      return;
    }

    modal.confirm({
      title: "确认删除",
      content: `确定要删除时间线节点"${timeline.stage_title}"吗？`,
      okText: "确认",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            await patientService.deleteTimeline(timeline.timeline_id);
            message.success("删除成功");
            await loadPatientAndTimeline();
            resolve();
          } catch (error) {
            console.error("Failed to delete timeline:", error);
            const errorMessage = error instanceof Error ? error.message : '删除失败';
            message.error(errorMessage);
            reject(error);
          }
        });
      },
    });
  };

  const getStageStatus = (timeline: TimelineStage) => {
    if (timeline.status === "completed") return "completed";
    if (timeline.status === "current") return "current";
    return "pending";
  };

  const handleDeleteLabReport = async (reportId: number) => {
    modal.confirm({
      title: "确认删除",
      content: "确定要删除此检验报告吗？",
      okText: "确认",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            await patientService.deleteLabReport(reportId);
            message.success("删除成功");
            if (selectedTimeline) {
              await loadReportsForTimeline(selectedTimeline.timeline_id);
            }
            resolve();
          } catch (error) {
            console.error("Failed to delete lab report:", error);
            message.error("删除失败");
            reject(error);
          }
        });
      },
    });
  };

  const handleDeleteImagingReport = async (reportId: number) => {
    modal.confirm({
      title: "确认删除",
      content: "确定要删除此影像报告吗？",
      okText: "确认",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            await patientService.deleteImagingReport(reportId);
            message.success("删除成功");
            if (selectedTimeline) {
              await loadReportsForTimeline(selectedTimeline.timeline_id);
            }
            resolve();
          } catch (error) {
            console.error("Failed to delete imaging report:", error);
            message.error("删除失败");
            reject(error);
          }
        });
      },
    });
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================
  const renderLoadingState = () => (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div
          className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-r-transparent mb-4"
          style={{ borderColor: PRIMARY_COLOR }}
        ></div>
        <p className="text-gray-500">加载中...</p>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="space-y-6">
      <Card className="bg-white border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {patient?.name || "患者"}的就诊历程
            </h2>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
              style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
            >
              创建节点
            </Button>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">暂无时间线数据，请创建第一个节点</p>
          </div>
        </div>
      </Card>

      <CreateTimelineModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        patientId={parseInt(patientId)}
        onSuccess={loadPatientAndTimeline}
      />
    </div>
  );

  const renderTimelineProgressBar = () => (
    <Card className="bg-white border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {patient?.name || "患者"}的就诊历程
          </h2>
          <div className="flex gap-2">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
              style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
            >
              创建节点
            </Button>
            {selectedTimeline && (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    setCurrentTimelineId(selectedTimeline.timeline_id);
                    setEditModalOpen(true);
                  }}
                >
                  编辑详情
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const timeline = timelines.find((t) => t.timeline_id === selectedTimeline.timeline_id);
                    if (timeline) {
                      handleDeleteTimeline(timeline);
                    }
                  }}
                >
                  删除节点
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="relative flex items-center justify-between gap-4">
          {timelines.map((timeline, index) => {
            const isSelected = selectedTimeline?.timeline_id === timeline.timeline_id;
            const status = getStageStatus(timeline);
            const isClickable = status !== "pending";

            return (
              <Fragment key={timeline.timeline_id}>
                <div className="flex flex-col items-center relative z-10">
                  <button
                    onClick={() => handleStageClick(timeline.timeline_id)}
                    disabled={!isClickable}
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      isSelected
                        ? "bg-[#D94527] text-white ring-4 ring-[#D94527]/30 scale-110"
                        : status === "completed"
                        ? "bg-green-500 text-white hover:scale-105 cursor-pointer"
                        : status === "current"
                        ? "bg-blue-500 text-white hover:scale-105 cursor-pointer"
                        : "bg-gray-200 text-gray-500 border-2 border-gray-300 cursor-not-allowed"
                    }`}
                  >
                    {status === "completed" ? "✓" : timeline.display_order || index + 1}
                  </button>
                  <div className="mt-3 text-center">
                    <div
                      className={`text-sm font-semibold ${isSelected ? "text-[#D94527]" : "text-gray-900"}`}
                    >
                      {timeline.stage_title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatDate(timeline.stage_date)}</div>
                  </div>
                </div>
                {index < timelines.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      status === "completed" ? "bg-green-500" : "bg-gray-200"
                    }`}
                    style={{ marginTop: "-60px" }}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </Card>
  );

  const renderTimelineDetail = () => {
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-r-transparent mb-2"
              style={{ borderColor: PRIMARY_COLOR }}
            ></div>
            <p className="text-gray-500 text-sm">加载详情...</p>
          </div>
        </div>
      );
    }

    if (!selectedTimeline) {
      return (
        <Card className="bg-gray-50 border-gray-200">
          <div className="p-12 text-center">
            <p className="text-gray-500">请选择一个时间点查看详情</p>
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{selectedTimeline.stage_title} 阶段详情</h3>
            <p className="text-sm text-gray-500 mt-1">
              {formatDate(selectedTimeline.stage_date)} | {selectedTimeline.diagnosis || "暂无诊断"}
            </p>
          </div>
        </div>

        {/* Image Gallery and Key Info */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Image Gallery */}
          <div className="col-span-12 lg:col-span-8">
            <Card
              className="bg-white border-gray-200 h-full"
              title={
                <div className="text-sm font-bold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#D94527]" />
                  影像资料
                </div>
              }
            >
              {selectedTimeline.images && selectedTimeline.images.length > 0 ? (
                <>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {selectedTimeline.images.map((image) => (
                      <div key={image.image_id} className="flex-shrink-0 w-64 group cursor-pointer">
                        <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-[#D94527] transition-colors">
                          <img
                            src={image.thumbnail_url || image.image_url}
                            alt={image.image_label}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <div className="text-xs text-white/90 font-medium">{image.image_type}</div>
                            <div className="text-sm text-white font-semibold">{image.image_label}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">点击图片可放大查看</p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <ImageIcon className="h-16 w-16 text-gray-400 mb-3" />
                  <p className="text-gray-500 text-sm">暂无影像资料</p>
                  <p className="text-gray-400 text-xs mt-1">点击"编辑详情"可添加影像</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right: Key Info */}
          <div className="col-span-12 lg:col-span-4">
            <Card className="bg-white border-gray-200 h-full" title="关键信息">
              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold text-gray-700">诊断:</span>
                  </div>
                  <p className="text-gray-900 ml-6">
                    {selectedTimeline.diagnosis || <span className="text-gray-400">暂无诊断</span>}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-gray-700">用药方案:</span>
                  </div>
                  {selectedTimeline.detail?.medications && selectedTimeline.detail.medications.length > 0 ? (
                    <ul className="space-y-1 text-gray-600 ml-6">
                      {selectedTimeline.detail.medications.map((med, idx) => (
                        <li key={idx} className="text-sm">• {med}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 text-sm ml-6">暂无用药记录</p>
                  )}
                </div>

                {selectedTimeline.attachments && selectedTimeline.attachments.length >0? (
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-gray-700">附件:</span>
                    </div>
                    <div className="space-y-2 ml-6">
                      {selectedTimeline.attachments.map((file) => (
                        <button
                          key={file.attachment_id}
                          className="flex items-center gap-2 text-xs text-[#D94527] hover:underline"
                          onClick={() => {
                            if (file.file_url) {
                              window.open(file.file_url, "_blank", "noopener,noreferrer");
                            }
                          }}
                        >
                          <FileText className="h-3 w-3" />
                          {file.file_name}
                          <span className="text-gray-400">({file.file_type}, {(file.file_size / 1024).toFixed(1)}KB)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ): (
                  <p className="text-gray-400 text-sm ml-6">暂无附件</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Metrics Cards */}
        {selectedTimeline.metrics && selectedTimeline.metrics.length >= 0 && (
          <Card
            className="bg-white border-gray-200"
            title={
              <div className="text-sm font-bold flex items-center gap-2">
                <TestTube className="h-4 w-4 text-[#D94527]" />
                检查指标详情
              </div>
            }
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedTimeline.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${
                    metric.metric_status === "error"
                      ? "bg-red-50 border-red-200"
                      : metric.metric_status === "warning"
                      ? "bg-orange-50 border-orange-200"
                      : metric.metric_status === "improving"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">{metric.metric_name}</span>
                    {metric.metric_trend === "down" && (
                      <ArrowDown className="h-4 w-4 text-green-600" />
                    )}
                    {metric.metric_trend === "up" && (
                      <ArrowUpDown className="h-4 w-4 text-orange-600" />
                    )}
                    {metric.metric_trend === "abnormal" && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    {metric.metric_trend === "normal" && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="text-xl font-bold text-gray-900 mb-1">
                    {metric.metric_value} {metric.metric_unit || ""}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">{metric.metric_full_name}</div>
                  {metric.percentage && metric.percentage > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          metric.metric_status === "error"
                            ? "bg-red-500"
                            : metric.metric_status === "warning"
                            ? "bg-orange-500"
                            : metric.metric_status === "improving"
                            ? "bg-blue-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${metric.percentage}%` }}
                      />
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {getMetricStatusText(metric.metric_status || "normal")}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Lab Reports Section */}
        {!reportsLoading && (
          <Card
            className="bg-white border-gray-200"
            title={
              <div className="text-sm font-bold flex items-center gap-2">
                <TestTube className="h-4 w-4 text-[#D94527]" />
                检验报告 ({labReports.length})
              </div>
            }
          >
            {labReports.length > 0 ? (
              <div className="space-y-4">
                {labReports.map((report) => (
                  <div key={report.report_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{report.report_type || "检验报告"}</h4>
                          <span className="text-xs text-gray-500">
                            {report.report_date ? formatDate(report.report_date) : ""}
                          </span>
                        </div>
                        {report.report_institution && (
                          <p className="text-xs text-gray-500 mt-1">检验机构: {report.report_institution}</p>
                        )}
                        {report.report_number && (
                          <p className="text-xs text-gray-500">报告编号: {report.report_number}</p>
                        )}
                      </div>
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteLabReport(report.report_id)}
                      >
                        删除
                      </Button>
                    </div>

                    {report.ai_summary && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
                        <p className="text-xs font-semibold text-blue-900 mb-1">AI 分析摘要</p>
                        <p className="text-sm text-blue-800">{report.ai_summary}</p>
                      </div>
                    )}

                    {report.items && report.items.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">检验项目</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">结果</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">参考范围</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">状态</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {report.items.map((item, idx) => (
                              <tr key={item.item_id || idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">{item.test_item_name}</td>
                                <td className="px-3 py-2">
                                  <span className="font-medium text-gray-900">
                                    {item.test_result} {item.test_unit || ""}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-600">{item.reference_range || "-"}</td>
                                <td className="px-3 py-2">
                                  {item.abnormal_flag === "↑" && (
                                    <span className="text-red-600 font-semibold">↑ 偏高</span>
                                  )}
                                  {item.abnormal_flag === "↓" && (
                                    <span className="text-blue-600 font-semibold">↓ 偏低</span>
                                  )}
                                  {(item.abnormal_flag === "正常" || !item.abnormal_flag) && (
                                    <span className="text-green-600">正常</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {report.report_image_url && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <a
                          href={report.report_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#D94527] hover:underline flex items-center gap-1"
                        >
                          <ImageIcon className="h-3 w-3" />
                          查看原始报告图片
                        </a>
                      </div>
                    )}
                  </div>
              ))}
            </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">暂无检验报告</p>
                <p className="text-gray-400 text-xs mt-1">可通过聊天上传报告图片自动解析</p>
              </div>
            )}
          </Card>
        )}

        {/* Imaging Reports Section */}
        {!reportsLoading && (
          <Card
            className="bg-white border-gray-200"
            title={
              <div className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#D94527]" />
                影像报告 ({imagingReports.length})
              </div>
            }
          >
            {imagingReports.length > 0 ? (
              <div className="space-y-4">
                {imagingReports.map((report) => (
                  <div key={report.report_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{report.imaging_type || "影像检查"}</h4>
                          <span className="text-xs text-gray-500">
                            {report.imaging_date ? formatDate(report.imaging_date) : ""}
                          </span>
                        </div>
                        {report.imaging_institution && (
                          <p className="text-xs text-gray-500 mt-1">检查机构: {report.imaging_institution}</p>
                        )}
                        {report.report_number && (
                          <p className="text-xs text-gray-500">报告编号: {report.report_number}</p>
                        )}
                        {report.examination_site && (
                          <p className="text-xs text-gray-600 mt-1">检查部位: {report.examination_site}</p>
                        )}
                      </div>
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteImagingReport(report.report_id)}
                      >
                        删除
                      </Button>
                    </div>

                    {report.ai_summary && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
                        <p className="text-xs font-semibold text-blue-900 mb-1">AI 分析摘要</p>
                        <p className="text-sm text-blue-800">{report.ai_summary}</p>
                      </div>
                    )}

                    {report.imaging_findings && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">影像所见</p>
                        <p className="text-sm text-gray-800 leading-relaxed">{report.imaging_findings}</p>
                      </div>
                    )}

                    {report.diagnostic_impression && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">诊断意见</p>
                        <p className="text-sm text-gray-800 font-medium">{report.diagnostic_impression}</p>
                      </div>
                    )}

                    {report.recommendations && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">建议</p>
                        <p className="text-sm text-gray-800">{report.recommendations}</p>
                      </div>
                    )}

                    {report.report_image_url && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <a
                          href={report.report_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#D94527] hover:underline flex items-center gap-1"
                        >
                          <ImageIcon className="h-3 w-3" />
                          查看原始报告图片
                        </a>
                      </div>
                    )}
                  </div>
              ))}
            </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">暂无影像报告</p>
                <p className="text-gray-400 text-xs mt-1">可通过聊天上传报告图片自动解析</p>
              </div>
            )}
          </Card>
        )}

        {/* Doctor Notes and Pathology Findings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-gray-200" title="👨‍⚕️ 医生观察记录">
            {selectedTimeline.detail?.doctor_notes ? (
              <p className="text-sm text-gray-700 leading-relaxed">
                {selectedTimeline.detail.doctor_notes}
              </p>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">暂无观察记录</p>
                <p className="text-gray-400 text-xs mt-1">点击"编辑详情"可添加</p>
              </div>
            )}
          </Card>

          <Card className="bg-white border-gray-200" title="📸 病理发现">
            {selectedTimeline.detail?.pathology_findings ? (
              <p className="text-sm text-gray-700 leading-relaxed">
                {selectedTimeline.detail.pathology_findings}
              </p>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">暂无病理发现</p>
                <p className="text-gray-400 text-xs mt-1">点击"编辑详情"可添加</p>
              </div>
            )}
          </Card>
        </div>

        {/* Patient Summary and Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-blue-50 border-blue-200" title="📋 患者报告解读（通俗版）">
            {selectedTimeline.detail?.patient_summary ? (
              <p className="text-sm text-gray-700 leading-relaxed">
                {selectedTimeline.detail.patient_summary}
              </p>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">暂无患者报告解读</p>
                <p className="text-gray-400 text-xs mt-1">点击"编辑详情"可添加</p>
              </div>
            )}
          </Card>

          <Card className="bg-green-50 border-green-200" title="💡 给患者的建议">
            {selectedTimeline.detail?.patient_suggestions && selectedTimeline.detail.patient_suggestions.length > 0 ? (
              <ul className="space-y-2">
                {selectedTimeline.detail.patient_suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">暂无患者建议</p>
                <p className="text-gray-400 text-xs mt-1">点击"编辑详情"可添加</p>
              </div>
            )}
          </Card>
        </div>

        {/* Associated Conversations */}
        {patient && (
          <AssociatedConversations
            patientId={patient.patient_id}
            patientName={patient.name}
            timelineId={selectedTimeline.timeline_id}
            maxHeight="400px"
            onConversationClick={onConversationClick}
          />
        )}
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================
  if (loading) {
    return renderLoadingState();
  }

  if (timelines.length === 0) {
    return renderEmptyState();
  }

  return (
    <div className="space-y-6">
      {renderTimelineProgressBar()}
      {renderTimelineDetail()}

      {/* Modals */}
      <CreateTimelineModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        patientId={parseInt(patientId)}
        onSuccess={loadPatientAndTimeline}
      />

      {currentTimelineId && (
        <EditTimelineDetailModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setCurrentTimelineId(null);
          }}
          timelineId={currentTimelineId}
          onSuccess={() => loadTimelineDetail(currentTimelineId)}
        />
      )}
    </div>
  );
}
