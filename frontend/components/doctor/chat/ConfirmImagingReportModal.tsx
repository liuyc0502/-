"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, DatePicker, App } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { ImageIcon } from "lucide-react";
import patientService from "@/services/patientService";
import { PatientTimelineMatchModal } from "./PatientTimelineMatchModal";

const PRIMARY_COLOR = "#D94527";

interface ParsedImagingReport {
  patient_name?: string;
  imaging_type?: string;
  imaging_date?: string;
  imaging_institution?: string;
  report_number?: string;
  examination_site?: string;
  imaging_findings?: string;
  diagnostic_impression?: string;
  recommendations?: string;
  report_image_url?: string;
  ai_summary?: string;
}

interface MatchedPatient {
  patient_id: number;
  name: string;
  medical_record_no?: string;
  age?: number;
  gender?: string;
  match_score?: number;
  recent_visit_date?: string;
}


interface ConfirmImagingReportModalProps {
  open: boolean;
  onClose: () => void;
  parsedData: ParsedImagingReport | null;
  timelineId?: number | null;
  patientId?: number | null;
  matchedPatients?: MatchedPatient[];
  onSuccess: () => void;
}

export function ConfirmImagingReportModal({
  open,
  onClose,
  parsedData,
  timelineId: initialTimelineId,
  patientId: initialPatientId,
  matchedPatients = [],
  onSuccess,
}: ConfirmImagingReportModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  // Patient and timeline selection state
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(initialPatientId || null);
  const [selectedTimelineId, setSelectedTimelineId] = useState<number | null>(initialTimelineId || null);

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

  // Show patient/timeline match modal if no patient/timeline provided
  useEffect(() => {
    if (open && (!selectedPatientId || !selectedTimelineId)) {
      setShowMatchModal(true);
    }
  }, [open, selectedPatientId, selectedTimelineId]);

  useEffect(() => {
    if (parsedData && open) {
      form.setFieldsValue({
        imaging_type: parsedData.imaging_type,
        // Don't set imaging_date here - let user select it manually to avoid dayjs issues
        // imaging_date: parsedData.imaging_date,
        imaging_institution: parsedData.imaging_institution,
        report_number: parsedData.report_number,
        examination_site: parsedData.examination_site,
        imaging_findings: parsedData.imaging_findings,
        diagnostic_impression: parsedData.diagnostic_impression,
        recommendations: parsedData.recommendations,
        report_image_url: parsedData.report_image_url,
        ai_summary: parsedData.ai_summary,
      });
    }
  }, [parsedData, open, form]);

  const handlePatientTimelineConfirm = async (
    patientId: number,
    patientName: string,
    timelineId: number | null,
    timelineName: string | null,
    isNewTimeline: boolean,
    newTimelineDate?: string
  ) => {
    try {
      setLoading(true);
      let finalPatientId = patientId;
      let finalTimelineId = timelineId;

      // Create new patient if needed (patientId === -1)
      if (patientId === -1) {
        const newPatient = await patientService.createPatient({
          name: patientName,
          gender: "",
          age: 0,
          medical_record_no: "",
          email: "",
        });
        finalPatientId = newPatient.patient_id;
        message.success(`已创建新患者: ${patientName}`);
      }

      // Create new timeline if needed
      if (isNewTimeline && newTimelineDate) {
        const newTimeline = await patientService.createTimelineStage({
          patient_id: finalPatientId,
          stage_type: "consultation",
          stage_title: timelineName || `${newTimelineDate} 诊疗记录`,
          stage_date: newTimelineDate,
          status: "current",
        });
        finalTimelineId = newTimeline.timeline_id;
        message.success(`已创建新时间线: ${timelineName || `${newTimelineDate} 诊疗记录`}`);
      }

      setSelectedPatientId(finalPatientId);
      setSelectedTimelineId(finalTimelineId);
      setShowMatchModal(false);
    } catch (error) {
      console.error("Failed to create patient/timeline:", error);
      message.error("创建失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {

      if (!selectedPatientId || !selectedTimelineId) {
        message.error("请先选择患者和时间线");
        setShowMatchModal(true);
        return;
      }

      await form.validateFields();
      const values = form.getFieldsValue();

      setLoading(true);

      const reportData = {
        timeline_id: selectedTimelineId,
        patient_id: selectedPatientId,
        imaging_type: values.imaging_type || undefined,
        imaging_date: formatDate(values.imaging_date),
        imaging_institution: values.imaging_institution || undefined,
        report_number: values.report_number || undefined,
        examination_site: values.examination_site || undefined,
        imaging_findings: values.imaging_findings || undefined,
        diagnostic_impression: values.diagnostic_impression || undefined,
        recommendations: values.recommendations || undefined,
        report_image_url: values.report_image_url || undefined,
        ai_summary: values.ai_summary || undefined,
      };

      await patientService.createImagingReport(reportData);
      message.success("影像报告保存成功");
      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Failed to create imaging report:", error);
      message.error("保存失败，请检查输入");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <>
    {/* Patient and Timeline Selection Modal */}
    <PatientTimelineMatchModal
        open={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        onConfirm={handlePatientTimelineConfirm}
        reportPatientName={parsedData?.patient_name}
        reportDate={parsedData?.imaging_date}
        matchedPatients={matchedPatients}
        title="选择患者和时间线 - 影像报告"
      />
   
    
    <Modal
      title={
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-[#D94527]" />
          <span>确认影像报告 - AI已自动解析</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={1300}
      style={{ top: 20 }}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          icon={<SaveOutlined />}
          onClick={handleSubmit}
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
        >
          确认保存
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
          <p className="text-sm text-blue-900">
            <strong>提示：</strong>AI已自动解析报告内容，请核对信息准确性。可直接修改下方字段后保存。
          </p>
        </div>

        <Form form={form} layout="vertical">
          {/* Basic Info - Horizontal layout */}
          <div className="grid grid-cols-4 gap-3">
            <Form.Item label="影像类型" name="imaging_type">
              <Input placeholder="例如：胸部CT" />
            </Form.Item>
            <Form.Item label="检查日期" name="imaging_date">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item label="检查机构" name="imaging_institution">
              <Input placeholder="检查机构" />
            </Form.Item>
            <Form.Item label="报告编号" name="report_number">
              <Input placeholder="报告编号" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Form.Item label="检查部位" name="examination_site" className="col-span-1">
              <Input placeholder="例如：胸部" />
            </Form.Item>
            <Form.Item label="报告图片URL" name="report_image_url" className="col-span-3">
              <Input placeholder="报告原图链接" />
            </Form.Item>
          </div>

          {/* Detailed Info - Two columns */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="影像所见" name="imaging_findings">
              <Input.TextArea
                rows={5}
                placeholder="详细描述影像检查中观察到的情况"
                maxLength={1000}
                showCount
              />
            </Form.Item>
            <Form.Item label="诊断意见" name="diagnostic_impression">
              <Input.TextArea
                rows={5}
                placeholder="根据影像所见给出的诊断意见"
                maxLength={500}
                showCount
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="建议" name="recommendations">
              <Input.TextArea
                rows={3}
                placeholder="医生的建议和后续处理意见"
                maxLength={500}
                showCount
              />
            </Form.Item>
            <Form.Item label="AI分析摘要" name="ai_summary">
              <Input.TextArea
                rows={3}
                placeholder="AI自动生成的报告摘要"
                maxLength={500}
                showCount
              />
            </Form.Item>
          </div>
        </Form>
      </div>
    </Modal>
    </>
  );
}
