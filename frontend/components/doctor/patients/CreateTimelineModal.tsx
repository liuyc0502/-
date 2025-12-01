"use client";

import { useState } from "react";
import { Modal, Form, Input, Select, DatePicker, InputNumber, App } from "antd";
import patientService from "@/services/patientService";

// Constants
const STAGE_TYPES = [
  { value: "初诊", label: "初诊" },
  { value: "检查", label: "检查" },
  { value: "确诊", label: "确诊" },
  { value: "治疗", label: "治疗" },
  { value: "随访", label: "随访" },
];

const STATUS_OPTIONS = [
  { value: "completed", label: "已完成" },
  { value: "current", label: "进行中" },
  { value: "pending", label: "待进行" },
];

interface CreateTimelineModalProps {
  open: boolean;
  onClose: () => void;
  patientId: number;
  onSuccess: () => void;
}


export function CreateTimelineModal({
  open,
  onClose,
  patientId,
  onSuccess,
}: CreateTimelineModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Format stage_date - DatePicker returns a dayjs object
      let stageDate: string;
      if (values.stage_date) {
        // Check if it's a dayjs object with format method
        if (typeof values.stage_date.format === 'function') {
          stageDate = values.stage_date.format('YYYY-MM-DD');
        } else if (values.stage_date instanceof Date) {
          stageDate = values.stage_date.toISOString().split('T')[0];
        } else if (typeof values.stage_date === 'string') {
          stageDate = values.stage_date;
        } else {
          throw new Error('Invalid date format');
        }
      } else {
        throw new Error('Date is required');
      }

      await patientService.createTimelineStage({
        patient_id: patientId,
        stage_type: values.stage_type,
        stage_date: stageDate,
        stage_title: values.stage_title,
        diagnosis: values.diagnosis || "",
        status: values.status,
        display_order: values.display_order || 0,
      });

      message.success("创建成功");
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error("创建失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="创建时间线节点"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={700}
      okText="创建"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          stage_type: "初诊",
          status: "current",
          display_order: 0,
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="阶段类型"
            name="stage_type"
            rules={[{ required: true, message: "请选择阶段类型" }]}
          >
            <Select>
              {STAGE_TYPES.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="日期"
            name="stage_date"
            rules={[{ required: true, message: "请选择日期" }]}
            getValueFromEvent={(value) => value}
            normalize={(value) => {
              // Ensure we only set valid dayjs objects or null
              if (!value) return null;
              // If it's already a dayjs object, return it
              if (value && typeof value.format === 'function') {
                return value;
              }
              // Otherwise return null to avoid invalid values
              return null;
            }}
          >
            <DatePicker 
              className="w-full" 
              format="YYYY-MM-DD"
              allowClear
            />
          </Form.Item>
        </div>

        <Form.Item
          label="阶段标题"
          name="stage_title"
          rules={[{ required: true, message: "请输入阶段标题" }]}
        >
          <Input placeholder="例如：首次门诊检查" />
        </Form.Item>

        <Form.Item label="诊断" name="diagnosis">
          <Input.TextArea rows={3} placeholder="请输入诊断信息" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item label="状态" name="status">
            <Select>
              {STATUS_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="显示顺序" name="display_order">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}