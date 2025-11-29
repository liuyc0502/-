"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, DatePicker, App, Select } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { UserPlus } from "lucide-react";
import patientService from "@/services/patientService";

const PRIMARY_COLOR = "#D94527";

interface ParsedPatientArchive {
  name?: string;
  age?: string;
  gender?: string;
  date_of_birth?: string;
  medical_record_no?: string;
  email?: string;
  phone?: string;
  address?: string;
  diagnosis?: string;
  allergies?: string;
  family_history?: string;
  past_medical_history?: string;
}

interface ConfirmPatientArchiveModalProps {
  open: boolean;
  onClose: () => void;
  parsedData: ParsedPatientArchive | null;
  onSuccess: (patientId: number) => void;
}

export function ConfirmPatientArchiveModal({
  open,
  onClose,
  parsedData,
  onSuccess,
}: ConfirmPatientArchiveModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  // Convert date string to Date object for DatePicker
  const parseDate = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  };

  // Format date object to YYYY-MM-DD string
  const formatDate = (date: any): string | undefined => {
    if (!date) return undefined;
    if (typeof date === 'string') return date;
    // Handle Date object from Ant Design DatePicker
    const dateObj = date.$d || date;
    if (dateObj instanceof Date) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return undefined;
  };

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
      // Parse allergies and past_medical_history if they are JSON strings
      const allergies = parseJsonField(parsedData.allergies);
      const pastMedicalHistory = parseJsonField(parsedData.past_medical_history);

      form.setFieldsValue({
        name: parsedData.name,
        age: parsedData.age ? parseInt(parsedData.age) : undefined,
        gender: parsedData.gender,
        date_of_birth: parsedData.date_of_birth ? parseDate(parsedData.date_of_birth) : undefined,
        medical_record_no: parsedData.medical_record_no,
        email: parsedData.email || '',
        phone: parsedData.phone,
        address: parsedData.address,
        diagnosis: parsedData.diagnosis,
        allergies: allergies.length > 0 ? allergies.join(', ') : undefined,
        family_history: parsedData.family_history,
        past_medical_history: pastMedicalHistory.length > 0 ? pastMedicalHistory.join(', ') : undefined,
      });
    }
  }, [parsedData, open, form]);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      setLoading(true);

      // Convert comma-separated strings to JSON arrays
      const allergiesArray = values.allergies
        ? values.allergies.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
      const pastMedicalHistoryArray = values.past_medical_history
        ? values.past_medical_history.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];

      const patientData = {
        name: values.name,
        gender: values.gender,
        age: values.age || undefined,
        date_of_birth: formatDate(values.date_of_birth),
        medical_record_no: values.medical_record_no || undefined,
        email: values.email || '',
        phone: values.phone || undefined,
        address: values.address || undefined,
        diagnosis: values.diagnosis || undefined,
        allergies: allergiesArray.length > 0 ? allergiesArray : undefined,
        family_history: values.family_history || undefined,
        past_medical_history: pastMedicalHistoryArray.length > 0 ? pastMedicalHistoryArray : undefined,
      };

      const response = await patientService.createPatient(patientData);
      message.success("患者档案创建成功");
      handleClose();
      onSuccess(response.patient_id);
    } catch (error) {
      console.error("Failed to create patient:", error);
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
          <UserPlus className="h-5 w-5 text-[#D94527]" />
          <span>确认患者档案 - AI已自动解析</span>
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
            <strong>提示：</strong>AI已自动解析患者档案内容，请核对信息准确性。可直接修改下方字段后保存。
          </p>
        </div>

        <Form form={form} layout="vertical">
          {/* Basic Info - 4 columns */}
          <div className="grid grid-cols-4 gap-3">
            <Form.Item
              label="姓名"
              name="name"
              rules={[{ required: true, message: '请输入患者姓名' }]}
            >
              <Input placeholder="患者姓名" />
            </Form.Item>
            <Form.Item
              label="年龄"
              name="age"
            >
              <Input type="number" placeholder="年龄" />
            </Form.Item>
            <Form.Item
              label="性别"
              name="gender"
              rules={[{ required: true, message: '请选择性别' }]}
            >
              <Select placeholder="选择性别">
                <Select.Option value="男">男</Select.Option>
                <Select.Option value="女">女</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="出生日期" name="date_of_birth">
              <DatePicker className="w-full" />
            </Form.Item>
          </div>

          {/* Contact & Medical Record - 4 columns */}
          <div className="grid grid-cols-4 gap-3">
            <Form.Item 
              label="病历号" 
              name="medical_record_no"
            >
              <Input placeholder="病历号（如：P00000001）" />
            </Form.Item>
            <Form.Item 
              label="邮箱" 
              name="email"
              rules={[{ required: true, message: '请输入邮箱地址' }]}
            >
              <Input type="email" placeholder="邮箱地址" />
            </Form.Item>
            <Form.Item label="联系电话" name="phone">
              <Input placeholder="联系电话" />
            </Form.Item>
            <Form.Item label="住址" name="address">
              <Input placeholder="家庭住址" />
            </Form.Item>
          </div>

          {/* Medical Info - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="主要诊断" name="diagnosis">
              <Input.TextArea
                rows={3}
                placeholder="当前主要诊断"
                maxLength={500}
                showCount
              />
            </Form.Item>
            <Form.Item label="过敏史" name="allergies">
              <Input.TextArea
                rows={3}
                placeholder="已知过敏源（多个用逗号分隔）"
                maxLength={500}
                showCount
              />
            </Form.Item>
          </div>

          {/* History - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="家族史" name="family_history">
              <Input.TextArea
                rows={4}
                placeholder="家族疾病史"
                maxLength={1000}
                showCount
              />
            </Form.Item>
            <Form.Item label="既往病史" name="past_medical_history">
              <Input.TextArea
                rows={4}
                placeholder="既往疾病和治疗史（多个用逗号分隔）"
                maxLength={1000}
                showCount
              />
            </Form.Item>
          </div>
        </Form>
      </div>
    </Modal>
  );
}
