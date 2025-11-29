"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, App, Select } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { FileText } from "lucide-react";

const PRIMARY_COLOR = "#D94527";

interface ParsedCaseDocument {
  case_title?: string;
  diagnosis?: string;
  disease_type?: string;
  age?: string;
  gender?: string;
  chief_complaint?: string;
  symptoms?: string;
  physical_examination?: string;
  lab_results?: string;
  imaging_findings?: string;
  pathology_findings?: string;
  diagnosis_result?: string;
  treatment_plan?: string;
  clinical_outcome?: string;
  case_discussion?: string;
}

interface ConfirmCaseDocumentModalProps {
  open: boolean;
  onClose: () => void;
  parsedData: ParsedCaseDocument | null;
  onSuccess: (caseId: number) => void;
}

export function ConfirmCaseDocumentModal({
  open,
  onClose,
  parsedData,
  onSuccess,
}: ConfirmCaseDocumentModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  // Parse JSON string fields
  const parseJsonField = (field: string | undefined): any[] => {
    if (!field) return [];
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (parsedData && open) {
      // Parse symptoms if it's a JSON array string
      const symptoms = parseJsonField(parsedData.symptoms);

      form.setFieldsValue({
        case_title: parsedData.case_title,
        diagnosis: parsedData.diagnosis,
        disease_type: parsedData.disease_type,
        age: parsedData.age ? parseInt(parsedData.age) : undefined,
        gender: parsedData.gender,
        chief_complaint: parsedData.chief_complaint,
        symptoms: symptoms.length > 0 ? symptoms.join(', ') : parsedData.symptoms,
        physical_examination: parsedData.physical_examination,
        lab_results: parsedData.lab_results,
        imaging_findings: parsedData.imaging_findings,
        pathology_findings: parsedData.pathology_findings,
        diagnosis_result: parsedData.diagnosis_result,
        treatment_plan: parsedData.treatment_plan,
        clinical_outcome: parsedData.clinical_outcome,
        case_discussion: parsedData.case_discussion,
      });
    }
  }, [parsedData, open, form]);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      setLoading(true);

      // Convert comma-separated symptoms to JSON array
      const symptomsArray = values.symptoms
        ? values.symptoms.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];

      const caseData = {
        case_title: values.case_title,
        diagnosis: values.diagnosis || undefined,
        disease_type: values.disease_type || undefined,
        age: values.age || undefined,
        gender: values.gender || undefined,
        chief_complaint: values.chief_complaint || undefined,
        symptoms: symptomsArray.length > 0 ? symptomsArray : undefined,
        physical_examination: values.physical_examination || undefined,
        lab_results: values.lab_results || undefined,
        imaging_findings: values.imaging_findings || undefined,
        pathology_findings: values.pathology_findings || undefined,
        diagnosis_result: values.diagnosis_result || undefined,
        treatment_plan: values.treatment_plan || undefined,
        clinical_outcome: values.clinical_outcome || undefined,
        case_discussion: values.case_discussion || undefined,
      };

      // TODO: Replace with actual API call when caseService is implemented
      // const response = await caseService.createCase(caseData);
      console.log("Creating case with data:", caseData);

      // Temporary mock response
      const mockCaseId = Math.floor(Math.random() * 10000);

      message.success("病例创建成功");
      handleClose();
      onSuccess(mockCaseId);
    } catch (error) {
      console.error("Failed to create case:", error);
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
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#D94527]" />
          <span>确认病例文档 - AI已自动解析</span>
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
            <strong>提示：</strong>AI已自动解析病例文档内容，请核对信息准确性。可直接修改下方字段后保存。
          </p>
        </div>

        <Form form={form} layout="vertical">
          {/* Basic Info - 4 columns */}
          <div className="grid grid-cols-4 gap-3">
            <Form.Item
              label="病例标题"
              name="case_title"
              rules={[{ required: true, message: '请输入病例标题' }]}
              className="col-span-2"
            >
              <Input placeholder="病例标题或摘要" />
            </Form.Item>
            <Form.Item label="年龄" name="age">
              <Input type="number" placeholder="患者年龄" />
            </Form.Item>
            <Form.Item label="性别" name="gender">
              <Select placeholder="选择性别">
                <Select.Option value="男">男</Select.Option>
                <Select.Option value="女">女</Select.Option>
              </Select>
            </Form.Item>
          </div>

          {/* Diagnosis Info - 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="主要诊断" name="diagnosis">
              <Input placeholder="主要诊断" />
            </Form.Item>
            <Form.Item label="疾病类型" name="disease_type">
              <Input placeholder="疾病类型/分类（如：类风湿、红斑狼疮）" />
            </Form.Item>
          </div>

          {/* Clinical Presentation - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="主诉" name="chief_complaint">
              <Input.TextArea
                rows={3}
                placeholder="患者主诉"
                maxLength={500}
                showCount
              />
            </Form.Item>
            <Form.Item label="临床症状" name="symptoms">
              <Input.TextArea
                rows={3}
                placeholder="临床症状（多个症状用逗号分隔）"
                maxLength={500}
                showCount
              />
            </Form.Item>
          </div>

          {/* Examination Findings - 3 columns */}
          <div className="grid grid-cols-3 gap-4">
            <Form.Item label="体格检查" name="physical_examination">
              <Input.TextArea
                rows={4}
                placeholder="体格检查结果"
                maxLength={1000}
                showCount
              />
            </Form.Item>
            <Form.Item label="实验室检查" name="lab_results">
              <Input.TextArea
                rows={4}
                placeholder="实验室检验结果"
                maxLength={1000}
                showCount
              />
            </Form.Item>
            <Form.Item label="影像学检查" name="imaging_findings">
              <Input.TextArea
                rows={4}
                placeholder="影像学检查发现"
                maxLength={1000}
                showCount
              />
            </Form.Item>
          </div>

          {/* Pathology and Diagnosis - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="病理学发现" name="pathology_findings">
              <Input.TextArea
                rows={4}
                placeholder="病理学检查结果"
                maxLength={1000}
                showCount
              />
            </Form.Item>
            <Form.Item label="诊断结果" name="diagnosis_result">
              <Input.TextArea
                rows={4}
                placeholder="最终诊断结果"
                maxLength={1000}
                showCount
              />
            </Form.Item>
          </div>

          {/* Treatment and Outcome - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="治疗方案" name="treatment_plan">
              <Input.TextArea
                rows={4}
                placeholder="治疗计划和用药方案"
                maxLength={1000}
                showCount
              />
            </Form.Item>
            <Form.Item label="临床转归" name="clinical_outcome">
              <Input.TextArea
                rows={4}
                placeholder="临床结果和随访情况"
                maxLength={1000}
                showCount
              />
            </Form.Item>
          </div>

          {/* Case Discussion - Full width */}
          <Form.Item label="病例讨论要点" name="case_discussion">
            <Input.TextArea
              rows={3}
              placeholder="病例讨论要点和教学价值"
              maxLength={1000}
              showCount
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
