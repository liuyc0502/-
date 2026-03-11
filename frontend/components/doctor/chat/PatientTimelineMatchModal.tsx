"use client";

import { useState, useEffect } from "react";
import { Modal, Radio, Button, Input, DatePicker, App, Space, Card, Tag, Divider, Alert } from "antd";
import { UserOutlined, ClockCircleOutlined, PlusOutlined } from "@ant-design/icons";
import patientService from "@/services/patientService";
import type { Patient, TimelineStage } from "@/types/patient";
import { CreatePatientDialog } from "@/components/doctor/patients/CreatePatientDialog";

const PRIMARY_COLOR = "#DA7756";

interface MatchedPatient {
  patient_id: number;
  name: string;
  medical_record_no?: string;
  age?: number;
  gender?: string;
  match_score?: number;
  recent_visit_date?: string;
}

interface PatientTimelineMatchModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (patientId: number, patientName: string, timelineId: number | null, timelineName: string | null, isNewTimeline: boolean, newTimelineDate?: string) => void;
  reportPatientName?: string;
  reportDate?: string;
  matchedPatients?: MatchedPatient[];
  title?: string;
}

// Format date object to YYYY-MM-DD string
const formatDate = (date: any): string | undefined => {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  // Check if it's a dayjs object with format method
  if (typeof date.format === 'function') {
    return date.format('YYYY-MM-DD');
  }
  // Handle Date object as fallback
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // Try to access internal Date object
  const dateObj = date.$d || date;
  if (dateObj instanceof Date) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return undefined;
};


export function PatientTimelineMatchModal({
  open,
  onClose,
  onConfirm,
  reportPatientName,
  reportDate,
  matchedPatients = [],
  title = "选择患者和时间线",
}: PatientTimelineMatchModalProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  // Patient selection
  const [patientSelectionMode, setPatientSelectionMode] = useState<"matched" | "create">("matched");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [createPatientDialogOpen, setCreatePatientDialogOpen] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);

  // Timeline selection
  const [timelineSelectionMode, setTimelineSelectionMode] = useState<"existing" | "create">("existing");
  const [timelines, setTimelines] = useState<TimelineStage[]>([]);
  const [selectedTimelineId, setSelectedTimelineId] = useState<number | null>(null);
  // Don't pre-set newTimelineDate to avoid dayjs issues - let user select manually
  const [newTimelineDate, setNewTimelineDate] = useState<any>(undefined);

 

  // Load timelines when patient is selected
  useEffect(() => {
    const loadTimelines = async () => {
      if (selectedPatientId) {
        try {
          setLoading(true);
          const data = await patientService.getPatientTimeline(selectedPatientId);
          setTimelines(data || []);

          // Auto-select timeline if there's only one
          if (data && data.length === 1) {
            setSelectedTimelineId(data[0].timeline_id);
            setTimelineSelectionMode("existing");
          } else if (data && data.length === 0) {
            // No timelines, default to create mode
            setTimelineSelectionMode("create");
          }
        } catch (error) {
          console.error("Failed to load timelines:", error);
          message.error("加载时间线失败");
        } finally {
          setLoading(false);
        }
      } else {
        setTimelines([]);
        setSelectedTimelineId(null);
      }
    };

    loadTimelines();
  }, [selectedPatientId, message]);

  // Initialize with first matched patient if available
  useEffect(() => {
    if (matchedPatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(matchedPatients[0].patient_id);
      setPatientSelectionMode("matched");
    } else if (matchedPatients.length === 0) {
      setPatientSelectionMode("create");
    }
  }, [matchedPatients, selectedPatientId]);

  const handleConfirm = () => {
    // Validate patient selection
    let finalPatientId: number | null = null;
    let finalPatientName = "";

    if (patientSelectionMode === "matched") {
      if (!selectedPatientId) {
        message.error("请选择患者");
        return;
      }
      finalPatientId = selectedPatientId;
      const patient = matchedPatients.find(p => p.patient_id === selectedPatientId);
      finalPatientName = patient?.name || "";
    } else {
      // For "create" mode, check if patient has been created
      if (!createdPatient) {
        message.error("请先创建患者");
        return;
      }
      finalPatientId = createdPatient.patient_id;
      finalPatientName = createdPatient.name;
    }

    // Validate timeline selection
    let finalTimelineId: number | null = null;
    let finalTimelineName: string | null = null;
    let isNewTimeline = false;
    let finalNewTimelineDate: string | undefined = undefined;

    if (timelineSelectionMode === "existing") {
      if (!selectedTimelineId) {
        message.error("请选择时间线或创建新时间线");
        return;
      }
      finalTimelineId = selectedTimelineId;
      const timeline = timelines.find(t => t.timeline_id === selectedTimelineId);
      finalTimelineName = timeline?.stage_title || null;
    } else {
      // Create new timeline
      if (!newTimelineDate) {
        message.error("请选择时间线日期");
        return;
      }
      isNewTimeline = true;
      finalNewTimelineDate = formatDate(newTimelineDate);
      finalTimelineName = `${finalNewTimelineDate} 诊疗记录`;
    }

    onConfirm(
      finalPatientId,
      finalPatientName,
      finalTimelineId,
      finalTimelineName,
      isNewTimeline,
      finalNewTimelineDate
    );
  };

  const handleCancel = () => {
    // Reset state
    setPatientSelectionMode("matched");
    setSelectedPatientId(null);
    setCreatedPatient(null);
    setTimelineSelectionMode("existing");
    setSelectedTimelineId(null);
    setNewTimelineDate(undefined);
    onClose();
  };

  const handleCreatePatientSuccess = async (patientId?: number) => {
    // After patient is created, fetch the patient by ID
    if (patientId) {
      try {
        setLoading(true);
        const patient = await patientService.getPatient(patientId);
        setCreatedPatient(patient);
        setSelectedPatientId(patient.patient_id);
        setCreatePatientDialogOpen(false);
        message.success("患者创建成功");
      } catch (error) {
        console.error("Failed to fetch created patient:", error);
        message.error("患者创建成功，但无法获取患者信息");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          loading={loading}
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
        >
          确认
        </Button>,
      ]}
    >
      <div className="space-y-6">
        {/* Patient Selection */}
        <div>
          <h3 className="text-base font-medium mb-3 flex items-center gap-2">
            <UserOutlined style={{ color: PRIMARY_COLOR }} />
            选择患者
          </h3>

          <Radio.Group
            value={patientSelectionMode}
            onChange={(e) => {
              setPatientSelectionMode(e.target.value);
              if (e.target.value === "matched" && matchedPatients.length > 0) {
                setSelectedPatientId(matchedPatients[0].patient_id);
              }
            }}
            className="w-full mb-3"
          >
            <Space direction="vertical" className="w-full">
              <Radio value="matched" disabled={matchedPatients.length === 0}>
                从匹配结果中选择 {matchedPatients.length > 0 && `(${matchedPatients.length}个)`}
              </Radio>
              <Radio value="create">创建新患者</Radio>
            </Space>
          </Radio.Group>

          {patientSelectionMode === "matched" && matchedPatients.length > 0 && (
            <div className="border border-gray-200 rounded-md p-3 max-h-60 overflow-y-auto">
              <Radio.Group
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full"
              >
                <Space direction="vertical" className="w-full" size="middle">
                  {matchedPatients.map((patient) => (
                    <Radio key={patient.patient_id} value={patient.patient_id} className="w-full">
                      <Card size="small" className="w-full">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{patient.name}</div>
                            <div className="text-xs text-gray-500">
                              病历号: {patient.medical_record_no || "无"} |
                              {patient.age && ` ${patient.age}岁 |`}
                              {patient.gender && ` ${patient.gender} |`}
                              {patient.recent_visit_date && ` 最近就诊: ${patient.recent_visit_date}`}
                            </div>
                          </div>
                          {patient.match_score !== undefined && (
                            <Tag color={patient.match_score > 0.8 ? "green" : "orange"}>
                              匹配度: {(patient.match_score * 100).toFixed(0)}%
                            </Tag>
                          )}
                        </div>
                      </Card>
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </div>
          )}

          {patientSelectionMode === "create" && (
            <div className="border border-gray-200 rounded-md p-4 space-y-3">
              {createdPatient ? (
                <div>
                  <Alert
                    message={`已选择患者: ${createdPatient.name}`}
                    description={`病历号: ${createdPatient.medical_record_no || "无"}`}
                    type="success"
                    showIcon
                    className="mb-3"
                  />
                  <Button
                    onClick={() => {
                      setCreatedPatient(null);
                      setSelectedPatientId(null);
                    }}
                    size="small"
                  >
                    重新选择
                  </Button>
                </div>
              ) : (
                <div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreatePatientDialogOpen(true)}
                    style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
                  >
                    打开新建患者弹窗
                  </Button>
                  <Alert
                    message="请点击按钮打开完整的新建患者表单"
                    type="info"
                    showIcon
                    className="mt-3"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <Divider />

        {/* Timeline Selection */}
        <div>
          <h3 className="text-base font-medium mb-3 flex items-center gap-2">
            <ClockCircleOutlined style={{ color: PRIMARY_COLOR }} />
            选择时间线
          </h3>

          <Radio.Group
            value={timelineSelectionMode}
            onChange={(e) => setTimelineSelectionMode(e.target.value)}
            className="w-full mb-3"
            disabled={!selectedPatientId && patientSelectionMode === "matched"}
          >
            <Space direction="vertical" className="w-full">
              <Radio value="existing" disabled={timelines.length === 0}>
                添加到现有时间线 {timelines.length > 0 && `(${timelines.length}个)`}
              </Radio>
              <Radio value="create">
                <PlusOutlined /> 创建新时间线
              </Radio>
            </Space>
          </Radio.Group>

          {timelineSelectionMode === "existing" && timelines.length > 0 && (
            <div className="border border-gray-200 rounded-md p-3 max-h-60 overflow-y-auto">
              <Radio.Group
                value={selectedTimelineId}
                onChange={(e) => setSelectedTimelineId(e.target.value)}
                className="w-full"
              >
                <Space direction="vertical" className="w-full" size="small">
                  {timelines.map((timeline) => (
                    <Radio key={timeline.timeline_id} value={timeline.timeline_id}>
                      <div className="text-sm">
                        {timeline.stage_title} - {new Date(timeline.stage_date).toLocaleDateString()}
                      </div>
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </div>
          )}

          {timelineSelectionMode === "create" && (
            <div className="border border-gray-200 rounded-md p-4">
              <div>
                <label className="block text-sm font-medium mb-1">时间线日期 *</label>
                <DatePicker
                  value={newTimelineDate}
                  onChange={(date) => setNewTimelineDate(date)}
                  format="YYYY-MM-DD"
                  className="w-full"
                  placeholder="选择日期"
                />
              </div>
              <Alert
                message="将自动创建新的诊疗时间线阶段"
                type="info"
                showIcon
                className="mt-3"
              />
            </div>
          )}

          {!selectedPatientId && patientSelectionMode === "matched" && (
            <Alert
              message="请先选择患者"
              type="warning"
              showIcon
            />
          )}
        </div>
      </div>

      <CreatePatientDialog
        open={createPatientDialogOpen}
        onClose={() => setCreatePatientDialogOpen(false)}
        onSuccess={handleCreatePatientSuccess}
      />
    </Modal>
  );
}
