"use client";

import { useState, useEffect } from "react";
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
import type { Patient, TimelineStage, TimelineWithDetail } from "@/types/patient";
import { CreateTimelineModal } from "./CreateTimelineModal";
import { EditTimelineDetailModal } from "./EditTimelineDetailModal";

// Constants
const PRIMARY_COLOR = "#D94527";

interface PatientTimelineProps {
  patientId: string;
}

// Helper Functions
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

export function PatientTimeline({ patientId }: PatientTimelineProps) {
  const { message,modal } = App.useApp();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timelines, setTimelines] = useState<TimelineStage[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineWithDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentTimelineId, setCurrentTimelineId] = useState<number | null>(null);

  useEffect(() => {
    loadPatientAndTimeline();
  }, [patientId]);

  const loadPatientAndTimeline = async () => {
    try {
      setLoading(true);
      // Load patient info and timeline list in parallel
      const [patientData, timelineData] = await Promise.all([
        patientService.getPatient(parseInt(patientId)),
        patientService.getPatientTimeline(parseInt(patientId)),
      ]);

      setPatient(patientData);
      setTimelines(timelineData);

      // Auto-select the first timeline with data
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
      setSelectedTimeline(detail);
    } catch (error) {
      message.error("加载时间线详情失败");
      console.error("Failed to load timeline detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStageClick = (timelineId: number) => {
    loadTimelineDetail(timelineId);
  };

  const handleDeleteTimeline = async (timeline: TimelineStage) => {
    console.log('Delete timeline clicked:', timeline.timeline_id);
 
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
          console.log('Deleting timeline:', timeline.timeline_id);
          try {
            await patientService.deleteTimeline(timeline.timeline_id);
            console.log('Delete timeline API success');
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

  if (loading) {
    return (
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
  }

  if (timelines.length === 0) {
    return (
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

        {/* Modals */}
        <CreateTimelineModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          patientId={parseInt(patientId)}
          onSuccess={loadPatientAndTimeline}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline Progress Bar - Always visible */}
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

          <div className="relative flex items-center justify-between">
            {timelines.map((timeline, index) => {
              const isSelected = selectedTimeline?.timeline_id === timeline.timeline_id;
              const status = getStageStatus(timeline);
              const isClickable = status !== "pending";

              return (
                <div key={timeline.timeline_id} className="flex flex-col items-center relative z-10">
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
                  {index < timelines.length - 1 && (
                    <div
                      className={`absolute top-6 left-1/2 w-full h-0.5 ${
                        status === "completed" ? "bg-green-500" : "bg-gray-200"
                      }`}
                      style={{ transform: "translateX(50%)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Detail Content Area - Changes based on selected stage */}
      {detailLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-r-transparent mb-2"
              style={{ borderColor: PRIMARY_COLOR }}
            ></div>
            <p className="text-gray-500 text-sm">加载详情...</p>
          </div>
        </div>
      ) : selectedTimeline ? (
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
          <div className="grid grid-cols-12 gap-6">
            {/* Left: Image Gallery - 始终显示 */}
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
 
            {/* Right: Key Info - 始终显示 */}
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
 
                  {selectedTimeline.attachments && selectedTimeline.attachments.length > 0 && (
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
                          >
                            <FileText className="h-3 w-3" />
                            {file.file_name}
                            <span className="text-gray-400">({file.file_type}, {(file.file_size / 1024).toFixed(1)}KB)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
          {/* Middle Section: Metrics Cards (Horizontal) */}
          {selectedTimeline.metrics && selectedTimeline.metrics.length > 0 && (
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

           {/* Bottom Section: Doctor Notes (50%) + Pathology Findings (50%) - 始终显示 */}

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

{/* Left: Doctor Notes */}

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



{/* Right: Pathology Findings */}

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
        </div>
      ) : (
        <Card className="bg-gray-50 border-gray-200">
          <div className="p-12 text-center">
            <p className="text-gray-500">请选择一个时间点查看详情</p>
          </div>
        </Card>
      )}

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
