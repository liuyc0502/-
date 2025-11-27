"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Select, Button, Spin, Alert } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { annotationService } from "@/services/annotationService";
import { medicalCaseService } from "@/services/medicalCaseService";

const { TextArea } = Input;
const { Option } = Select;

interface OcrCaseFormModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
  onSuccess?: (caseId: number) => void;
}

export function OcrCaseFormModal({
  visible,
  imageUrl,
  onClose,
  onSuccess,
}: OcrCaseFormModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [parsedData, setParsedData] = useState<any>(null);

  useEffect(() => {
    if (visible && imageUrl) {
      performOcr();
    }
  }, [visible, imageUrl]);

  const performOcr = async () => {
    try {
      setOcrLoading(true);
      const result = await annotationService.parseCaseDocument(imageUrl);

      if (result.success) {
        setOcrText(result.ocr_text);
        setParsedData(result.parsed_data);

        // Pre-fill form with parsed data
        form.setFieldsValue({
          case_title: result.parsed_data.case_title,
          diagnosis: result.parsed_data.diagnosis,
          disease_type: result.parsed_data.disease_type,
          age: result.parsed_data.age,
          gender: result.parsed_data.gender,
          chief_complaint: result.parsed_data.chief_complaint,
          physical_examination: result.parsed_data.physical_examination,
          lab_results: result.parsed_data.lab_results,
          imaging_findings: result.parsed_data.imaging_findings,
          pathology_findings: result.parsed_data.pathology_findings,
          diagnosis_result: result.parsed_data.diagnosis_result,
          treatment_plan: result.parsed_data.treatment_plan,
          clinical_outcome: result.parsed_data.clinical_outcome,
          case_discussion: result.parsed_data.case_discussion,
        });
      }
    } catch (error) {
      console.error("OCR failed:", error);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Format symptoms as array
      const formattedValues = {
        ...values,
        symptoms: values.symptoms
          ? values.symptoms.split(",").map((s: string) => s.trim())
          : [],
        tags: values.tags
          ? values.tags.split(",").map((s: string) => s.trim())
          : [],
      };

      const result = await medicalCaseService.create(formattedValues);

      if (result.success) {
        Modal.success({
          title: "病例录入成功",
          content: `病例 "${values.case_title}" 已成功录入病例库。`,
        });
        onSuccess?.(result.case_id);
        handleClose();
      }
    } catch (error) {
      console.error("Create case failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setOcrText("");
    setParsedData(null);
    onClose();
  };

  return (
    <Modal
      title="病例库录入（OCR智能识别）"
      open={visible}
      onCancel={handleClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          确认录入
        </Button>,
      ]}
    >
      {ocrLoading ? (
        <div className="text-center py-12">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">正在识别病例文档...</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Alert
            message="OCR识别提示"
            description="系统已自动识别病例文档内容并填充表单，请仔细核对信息准确性后提交。"
            type="info"
            showIcon
          />

          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
          >
            <Form.Item
              label="病例标题"
              name="case_title"
              rules={[{ required: true, message: "请输入病例标题" }]}
            >
              <Input
                prefix={<FileTextOutlined />}
                placeholder="病例标题"
              />
            </Form.Item>

            <div className="grid grid-cols-3 gap-4">
              <Form.Item
                label="疾病类型"
                name="disease_type"
                rules={[{ required: true, message: "请输入疾病类型" }]}
              >
                <Input placeholder="如：类风湿关节炎" />
              </Form.Item>

              <Form.Item label="患者年龄" name="age">
                <Input type="number" placeholder="年龄" />
              </Form.Item>

              <Form.Item label="性别" name="gender">
                <Select placeholder="选择性别">
                  <Option value="男">男</Option>
                  <Option value="女">女</Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item label="主诉" name="chief_complaint">
              <TextArea rows={2} placeholder="患者主诉" />
            </Form.Item>

            <Form.Item
              label="症状"
              name="symptoms"
              extra="多个症状请用逗号分隔"
            >
              <Input placeholder="例如：关节疼痛, 晨僵, 肿胀" />
            </Form.Item>

            <Form.Item label="体格检查" name="physical_examination">
              <TextArea rows={3} placeholder="体格检查结果" />
            </Form.Item>

            <Form.Item label="实验室检查" name="lab_results">
              <TextArea rows={3} placeholder="实验室检查结果" />
            </Form.Item>

            <Form.Item label="影像学检查" name="imaging_findings">
              <TextArea rows={3} placeholder="影像学检查结果" />
            </Form.Item>

            <Form.Item label="病理学发现" name="pathology_findings">
              <TextArea rows={3} placeholder="病理学检查结果" />
            </Form.Item>

            <Form.Item
              label="最终诊断"
              name="diagnosis_result"
              rules={[{ required: true, message: "请输入最终诊断" }]}
            >
              <TextArea rows={2} placeholder="最终诊断结果" />
            </Form.Item>

            <Form.Item label="治疗方案" name="treatment_plan">
              <TextArea rows={3} placeholder="治疗方案" />
            </Form.Item>

            <Form.Item label="临床结局" name="clinical_outcome">
              <TextArea rows={2} placeholder="临床结局/预后" />
            </Form.Item>

            <Form.Item label="病例讨论" name="case_discussion">
              <TextArea rows={3} placeholder="病例讨论要点" />
            </Form.Item>

            <Form.Item
              label="标签"
              name="tags"
              extra="多个标签请用逗号分隔"
            >
              <Input placeholder="例如：经典病例, 罕见病例" />
            </Form.Item>
          </Form>

          {/* OCR raw text (collapsible) */}
          {ocrText && (
            <details className="border rounded p-3 bg-gray-50">
              <summary className="cursor-pointer text-sm text-gray-600 font-medium">
                查看OCR原始识别文本
              </summary>
              <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">
                {ocrText}
              </pre>
            </details>
          )}
        </div>
      )}
    </Modal>
  );
}
