"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Select, DatePicker, Button, Spin, Alert, Space } from "antd";
import { UserOutlined, PhoneOutlined, MailOutlined } from "@ant-design/icons";
import { annotationService } from "@/services/annotationService";
import  patientService  from "@/services/patientService";

const { TextArea } = Input;
const { Option } = Select;

interface OcrPatientFormModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
  onSuccess?: (patientId: number) => void;
}

export function OcrPatientFormModal({
  visible,
  imageUrl,
  onClose,
  onSuccess,
}: OcrPatientFormModalProps) {
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
      const result = await annotationService.parsePatientDocument(imageUrl);

      if (result.success) {
        setOcrText(result.ocr_text);
        setParsedData(result.parsed_data);

        // Pre-fill form with parsed data
        form.setFieldsValue({
          name: result.parsed_data.name,
          age: result.parsed_data.age,
          gender: result.parsed_data.gender,
          date_of_birth: result.parsed_data.date_of_birth
            ? new Date(result.parsed_data.date_of_birth)
            : null,
          medical_record_no: result.parsed_data.medical_record_no,
          phone: result.parsed_data.phone,
          address: result.parsed_data.address,
          diagnosis: result.parsed_data.diagnosis,
          family_history: result.parsed_data.family_history,
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

      // Format date
      const formattedValues = {
        ...values,
        date_of_birth: values.date_of_birth
          ? new Date(values.date_of_birth).toISOString().split('T')[0]
          : null,
        allergies: values.allergies ? values.allergies.split(",").map((s: string) => s.trim()) : [],
        past_medical_history: values.past_medical_history
          ? values.past_medical_history.split(",").map((s: string) => s.trim())
          : [],
      };

      const result = await patientService.createPatient(formattedValues);

      if (result.success) {
        Modal.success({
          title: "患者档案创建成功",
          content: `患者 ${values.name} 的档案已成功录入系统。`,
        });
        onSuccess?.(result.patient_id);
        handleClose();
      }
    } catch (error) {
      console.error("Create patient failed:", error);
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
      title="患者档案录入（OCR智能识别）"
      open={visible}
      onCancel={handleClose}
      width={800}
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
          <p className="mt-4 text-gray-600">正在识别文档内容...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Alert
            message="OCR识别提示"
            description="系统已自动识别文档内容并填充表单，请仔细核对信息准确性后提交。"
            type="info"
            showIcon
          />

          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
          >
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: "请输入姓名" }]}
              >
                <Input prefix={<UserOutlined />} placeholder="患者姓名" />
              </Form.Item>

              <Form.Item
                label="性别"
                name="gender"
                rules={[{ required: true, message: "请选择性别" }]}
              >
                <Select placeholder="选择性别">
                  <Option value="男">男</Option>
                  <Option value="女">女</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="年龄"
                name="age"
                rules={[{ required: true, message: "请输入年龄" }]}
              >
                <Input type="number" placeholder="年龄" />
              </Form.Item>

              <Form.Item label="出生日期" name="date_of_birth">
                <DatePicker
                  style={{ width: "100%" }}
                  placeholder="选择出生日期"
                  format="YYYY-MM-DD"
                />
              </Form.Item>

              <Form.Item
                label="病历号"
                name="medical_record_no"
                rules={[{ required: true, message: "请输入病历号" }]}
              >
                <Input placeholder="病历号" />
              </Form.Item>

              <Form.Item
                label="联系电话"
                name="phone"
              >
                <Input prefix={<PhoneOutlined />} placeholder="联系电话" />
              </Form.Item>

              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: "请输入邮箱" },
                  { type: "email", message: "请输入有效邮箱" },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="邮箱地址（用于登录）" />
              </Form.Item>
            </div>

            <Form.Item label="住址" name="address">
              <Input placeholder="患者住址" />
            </Form.Item>

            <Form.Item label="诊断" name="diagnosis">
              <Input placeholder="初步诊断" />
            </Form.Item>

            <Form.Item label="家族病史" name="family_history">
              <TextArea rows={2} placeholder="家族病史" />
            </Form.Item>

            <Form.Item
              label="过敏史"
              name="allergies"
              extra="多个过敏项请用逗号分隔"
            >
              <Input placeholder="例如：青霉素, 海鲜" />
            </Form.Item>

            <Form.Item
              label="既往病史"
              name="past_medical_history"
              extra="多个病史请用逗号分隔"
            >
              <TextArea rows={2} placeholder="例如：高血压, 糖尿病" />
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
