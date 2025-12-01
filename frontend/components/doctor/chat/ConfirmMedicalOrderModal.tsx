"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, DatePicker, Table, Tag, Select, App } from "antd";
import { Pill, CheckSquare, AlertTriangle } from "lucide-react";
import carePlanService from "@/services/carePlanService";

const { TextArea } = Input;

interface Medication {
  medication_name: string;
  dosage?: string;
  frequency?: string;
  time_slots?: string[];
  notes?: string;
}

interface Task {
  task_title: string;
  task_description?: string;
  task_category?: string;
  frequency?: string;
  duration?: string;
}

interface Precaution {
  precaution_content: string;
  priority?: "high" | "medium" | "low";
}

interface ParsedMedicalOrder {
  patient_name?: string;
  order_date?: string;
  medications?: Medication[];
  tasks?: Task[];
  precautions?: Precaution[];
}

interface ConfirmMedicalOrderModalProps {
  open: boolean;
  onClose: () => void;
  parsedData: ParsedMedicalOrder | null;
  onSuccess?: (planId: number) => void;
  patientId?: number | null;
  patientName?: string | null;
}

/**
 * Medical order confirmation modal
 * Allows user to review and confirm AI-parsed medical order data
 * Creates care plan with medications, tasks, and precautions
 */
export function ConfirmMedicalOrderModal({
  open,
  onClose,
  parsedData,
  onSuccess,
  patientId,
  patientName,
}: ConfirmMedicalOrderModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (open && parsedData) {
      const today = new Date().toISOString().split('T')[0];
      form.setFieldsValue({
        patient_name: parsedData.patient_name || patientName || "",
        // Don't set order_date here - let user select it manually to avoid dayjs issues
        // order_date: parsedData.order_date,
        plan_name: `医嘱 - ${parsedData.patient_name || patientName || ""} - ${parsedData.order_date || today}`,
        medications: parsedData.medications || [],
        tasks: parsedData.tasks || [],
        precautions: parsedData.precautions || [],
      });
    }
  }, [open, parsedData, patientName, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const response = await carePlanService.createCarePlanFromMedicalOrder({
        patient_id: patientId,
        patient_name: values.patient_name,
        order_date: values.order_date?.format("YYYY-MM-DD"),
        plan_name: values.plan_name,
        plan_description: `医嘱单 - ${values.order_date?.format("YYYY-MM-DD") || ""}`,
        start_date: values.order_date?.format("YYYY-MM-DD"),
        medications: parsedData?.medications || [],
        tasks: parsedData?.tasks || [],
        precautions: parsedData?.precautions || [],
      });

      message.success(`康复计划创建成功！包含${response.medication_count}项用药、${response.task_count}项任务、${response.precaution_count}项注意事项`);
      handleClose();
      if (onSuccess && response.plan_id) {
        onSuccess(response.plan_id);
      }
    } catch (error) {
      console.error("Failed to create care plan:", error);
      message.error("创建康复计划失败");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  // Medication table columns
  const medicationColumns = [
    {
      title: "药品名称",
      dataIndex: "medication_name",
      key: "medication_name",
      width: 200,
    },
    {
      title: "剂量",
      dataIndex: "dosage",
      key: "dosage",
      width: 120,
    },
    {
      title: "频次",
      dataIndex: "frequency",
      key: "frequency",
      width: 120,
    },
    {
      title: "服药时间",
      dataIndex: "time_slots",
      key: "time_slots",
      width: 150,
      render: (timeSlots: string[]) =>
        timeSlots && timeSlots.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {timeSlots.map((time, idx) => (
              <Tag key={idx} color="blue">
                {time}
              </Tag>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: "备注",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
      render: (notes: string) => notes || <span className="text-gray-400">-</span>,
    },
  ];

  // Task table columns
  const taskColumns = [
    {
      title: "任务名称",
      dataIndex: "task_title",
      key: "task_title",
      width: 200,
    },
    {
      title: "类别",
      dataIndex: "task_category",
      key: "task_category",
      width: 100,
      render: (category: string) => {
        const colorMap: Record<string, string> = {
          运动: "green",
          护理: "blue",
          监测: "orange",
          饮食: "purple",
        };
        return category ? (
          <Tag color={colorMap[category] || "default"}>{category}</Tag>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      title: "频次",
      dataIndex: "frequency",
      key: "frequency",
      width: 120,
    },
    {
      title: "时长",
      dataIndex: "duration",
      key: "duration",
      width: 100,
    },
    {
      title: "说明",
      dataIndex: "task_description",
      key: "task_description",
      ellipsis: true,
      render: (desc: string) => desc || <span className="text-gray-400">-</span>,
    },
  ];

  // Precaution table columns
  const precautionColumns = [
    {
      title: "优先级",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (priority: string) => {
        const config: Record<string, { color: string; text: string }> = {
          high: { color: "red", text: "高" },
          medium: { color: "orange", text: "中" },
          low: { color: "default", text: "低" },
        };
        const { color, text } = config[priority] || config.medium;
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "注意事项内容",
      dataIndex: "precaution_content",
      key: "precaution_content",
      render: (content: string) => (
        <div className="whitespace-pre-wrap">{content}</div>
      ),
    },
  ];

  if (!parsedData) return null;

  const medications = parsedData.medications || [];
  const tasks = parsedData.tasks || [];
  const precautions = parsedData.precautions || [];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-[#D94527]" />
          <span>确认医嘱信息</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={1400}
      okText="确认创建康复计划"
      cancelText="取消"
      centered
    >
      <Form form={form} layout="vertical" className="mt-4">
        {/* Basic Info - 3 columns */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Form.Item label="患者姓名" name="patient_name">
            <Input placeholder="患者姓名" disabled={!!patientId} />
          </Form.Item>
          <Form.Item label="医嘱日期" name="order_date">
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item
            label="康复计划名称"
            name="plan_name"
            rules={[{ required: true, message: "请输入康复计划名称" }]}
          >
            <Input placeholder="康复计划名称" />
          </Form.Item>
        </div>

        {/* Medications Section */}
        {medications.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Pill className="h-4 w-4 text-blue-600" />
              <h3 className="text-base font-semibold">用药方案 ({medications.length}项)</h3>
            </div>
            <Table
              dataSource={medications}
              columns={medicationColumns}
              pagination={false}
              size="small"
              bordered
              rowKey={(record, index) => `med-${index}`}
              scroll={{ x: "max-content" }}
            />
          </div>
        )}

        {/* Tasks Section */}
        {tasks.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="h-4 w-4 text-green-600" />
              <h3 className="text-base font-semibold">康复任务 ({tasks.length}项)</h3>
            </div>
            <Table
              dataSource={tasks}
              columns={taskColumns}
              pagination={false}
              size="small"
              bordered
              rowKey={(record, index) => `task-${index}`}
              scroll={{ x: "max-content" }}
            />
          </div>
        )}

        {/* Precautions Section */}
        {precautions.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <h3 className="text-base font-semibold">注意事项 ({precautions.length}项)</h3>
            </div>
            <Table
              dataSource={precautions}
              columns={precautionColumns}
              pagination={false}
              size="small"
              bordered
              rowKey={(record, index) => `precaution-${index}`}
            />
          </div>
        )}

        {/* Empty state */}
        {medications.length === 0 && tasks.length === 0 && precautions.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded">
            <p className="text-gray-400">未识别到用药、任务或注意事项</p>
          </div>
        )}
      </Form>
    </Modal>
  );
}
