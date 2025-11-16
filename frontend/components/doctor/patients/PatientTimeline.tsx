"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TestTube, Pill, Filter, ArrowUpDown, ArrowDown, CheckCircle, AlertCircle, Image as ImageIcon, Download } from "lucide-react";
import { App } from "antd";
import patientService from "@/services/patientService";
import type { Patient, TimelineStage, TimelineWithDetail } from "@/types/patient";

interface PatientTimelineProps {
  patientId: string;
}

export function PatientTimeline({ patientId }: PatientTimelineProps) {
  const { message } = App.useApp();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timelines, setTimelines] = useState<TimelineStage[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineWithDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const getStageStatus = (timeline: TimelineStage) => {
    if (timeline.status === 'completed') return 'completed';
    if (timeline.status === 'in_progress') return 'current';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#D94527] border-r-transparent mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (timelines.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">暂无时间线数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline Progress Bar - Always visible */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {patient?.name || '患者'}的就诊历程
            </h2>
            <Button variant="outline" size="sm" className="text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              筛选时间
            </Button>
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
                    <div className={`text-sm font-semibold ${isSelected ? "text-[#D94527]" : "text-gray-900"}`}>
                      {timeline.stage_title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {timeline.stage_date ? new Date(timeline.stage_date).toLocaleDateString('zh-CN') : '待定'}
                    </div>
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
        </CardContent>
      </Card>

      {/* Detail Content Area - Changes based on selected stage */}
      {detailLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#D94527] border-r-transparent mb-2"></div>
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
                {selectedTimeline.stage_date ? new Date(selectedTimeline.stage_date).toLocaleDateString('zh-CN') : '待定'} |
                {selectedTimeline.diagnosis || '暂无诊断'}
              </p>
            </div>
          </div>

          {/* Top Section: Image Gallery (70%) + Key Info (30%) */}
          {(selectedTimeline.images && selectedTimeline.images.length > 0) || selectedTimeline.detail ? (
            <div className="grid grid-cols-12 gap-6">
              {/* Left: Image Gallery */}
              {selectedTimeline.images && selectedTimeline.images.length > 0 && (
                <div className="col-span-12 lg:col-span-8">
                  <Card className="bg-white border-gray-200 h-full">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-[#D94527]" />
                        影像资料
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {selectedTimeline.images.map((image) => (
                          <div
                            key={image.image_id}
                            className="flex-shrink-0 w-64 group cursor-pointer"
                          >
                            <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-[#D94527] transition-colors">
                              <img
                                src={image.image_url}
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
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Right: Key Info */}
              <div className={`col-span-12 ${selectedTimeline.images && selectedTimeline.images.length > 0 ? 'lg:col-span-4' : 'lg:col-span-12'}`}>
                <Card className="bg-white border-gray-200 h-full">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">关键信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold text-gray-700">诊断:</span>
                      </div>
                      <p className="text-gray-900 ml-6">{selectedTimeline.diagnosis || '暂无诊断'}</p>
                    </div>

                    {selectedTimeline.detail?.medications && selectedTimeline.detail.medications.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Pill className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-gray-700">用药方案:</span>
                        </div>
                        <ul className="space-y-1 text-gray-600 ml-6">
                          {selectedTimeline.detail.medications.map((med, idx) => (
                            <li key={idx} className="text-sm">• {med}</li>
                          ))}
                        </ul>
                      </div>
                    )}

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
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {/* Middle Section: Metrics Cards (Horizontal) */}
          {selectedTimeline.metrics && selectedTimeline.metrics.length > 0 && (
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TestTube className="h-4 w-4 text-[#D94527]" />
                  检查指标详情
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                        {metric.metric_trend === "down" && <ArrowDown className="h-4 w-4 text-green-600" />}
                        {metric.metric_trend === "up" && <ArrowUpDown className="h-4 w-4 text-orange-600" />}
                        {metric.metric_trend === "abnormal" && <AlertCircle className="h-4 w-4 text-red-600" />}
                        {metric.metric_trend === "normal" && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </div>
                      <div className="text-xl font-bold text-gray-900 mb-1">
                        {metric.metric_value} {metric.metric_unit || ''}
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
                        {metric.metric_status === "error"
                          ? "异常"
                          : metric.metric_status === "warning"
                          ? "偏高"
                          : metric.metric_status === "improving"
                          ? "改善中"
                          : "正常"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bottom Section: Doctor Notes (50%) + Pathology Findings (50%) */}
          {selectedTimeline.detail && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Doctor Notes */}
              {selectedTimeline.detail.doctor_notes && (
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">👨‍⚕️ 医生观察记录</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedTimeline.detail.doctor_notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Right: Pathology Findings */}
              {selectedTimeline.detail.pathology_findings && (
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">📸 病理发现</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedTimeline.detail.pathology_findings}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      ) : (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">请选择一个时间点查看详情</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
