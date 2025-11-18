"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Select, DatePicker, App } from "antd";
import patientService from "@/services/patientService";
import type { PatientTodo } from "@/types/patient";

// Constants
const TODO_TYPE_OPTIONS = [
  { value: "复查", label: "复查" },
  { value: "用药", label: "用药" },
  { value: "检查", label: "检查" },
  { value: "随访", label: "随访" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "紧急" },
  { value: "medium", label: "重要" },
  { value: "low", label: "普通" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "待处理" },
  { value: "completed", label: "已完成" },
  { value: "overdue", label: "已逾期" },
];

interface CreateTodoModalProps {
  open: boolean;
  onClose: () => void;
  patientId: number;
  editingTodo?: PatientTodo | null;
  onSuccess: () => void;
}

interface TodoFormData {
  todo_title: string;
  todo_description?: string;
  todo_type: string;
  due_date: any; // DatePicker returns dayjs object internally
  priority: string;
  status: string;
}

export function CreateTodoModal({
  open,
  onClose,
  patientId,
  editingTodo,
  onSuccess,
}: CreateTodoModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Initialize form values when modal opens
  useEffect(() => {
    if (open) {
      if (editingTodo) {
        // Don't set date value if it's a string - DatePicker needs dayjs object
        // User will need to re-select the date when editing
        form.setFieldsValue({
          todo_title: editingTodo.todo_title,
          todo_description: editingTodo.todo_description,
          todo_type: editingTodo.todo_type,
          // Skip due_date - let user re-select to avoid dayjs dependency
          priority: editingTodo.priority,
          status: editingTodo.status,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editingTodo, form]);

  const formatDate = (date: any): string => {
    // DatePicker may return dayjs object (if available) or Date object
    if (!date) return "";
    
    // Check if it has format method (dayjs object)
    if (typeof date.format === 'function') {
      return date.format("YYYY-MM-DD");
    }
    
    // Otherwise, treat as Date object and format manually
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If it's already a string, return as is
    if (typeof date === 'string') {
      return date;
    }
    
    return "";
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingTodo) {
        message.warning("编辑功能需要后端支持updateTodo接口");
        // await patientService.updatePatientTodo(editingTodo.todo_id, {
        //   ...values,
        //   due_date: formatDate(values.due_date),
        // });
      } else {
        await patientService.createPatientTodo({
          patient_id: patientId,
          todo_title: values.todo_title,
          todo_description: values.todo_description || "",
          todo_type: values.todo_type,
          due_date: formatDate(values.due_date),
          priority: values.priority,
          status: values.status,
        });
        message.success("创建成功");
      }

      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(editingTodo ? "更新失败" : "创建失败");
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
      title={editingTodo ? "编辑待办事项" : "创建待办事项"}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={700}
      okText={editingTodo ? "更新" : "创建"}
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          todo_type: "复查",
          priority: "medium",
          status: "pending",
        }}
      >
        <Form.Item
          label="待办标题"
          name="todo_title"
          rules={[{ required: true, message: "请输入待办标题" }]}
        >
          <Input placeholder="例如：完善RF检查" />
        </Form.Item>

        <Form.Item label="详细描述" name="todo_description">
          <Input.TextArea rows={4} placeholder="请输入详细描述" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="类型"
            name="todo_type"
            rules={[{ required: true, message: "请选择类型" }]}
          >
            <Select>
              {TODO_TYPE_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="截止日期"
            name="due_date"
            rules={[{ required: true, message: "请选择截止日期" }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item label="优先级" name="priority">
            <Select>
              {PRIORITY_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="状态" name="status">
            <Select>
              {STATUS_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}