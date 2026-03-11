"use client";

import { useRef } from "react";
import { Modal, Form, Input, Select, DatePicker } from "antd";
import type { ChatTemplate, FieldDefinition } from "@/services/chatTemplateService";

interface ChatTemplateModalProps {
  template: ChatTemplate | null;
  visible: boolean;
  onClose: () => void;
  onSubmit: (renderedPrompt: string) => void;
}

function renderField(field: FieldDefinition, name: number) {
  const rules = field.required ? [{ required: true, message: `${field.label}是必填项` }] : [];

  switch (field.type) {
    case "textarea":
      return (
        <Form.Item key={field.key} name={name} label={field.label} rules={rules}>
          <Input.TextArea rows={3} />
        </Form.Item>
      );
    case "date":
      return (
        <Form.Item key={field.key} name={name} label={field.label} rules={rules}>
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
        </Form.Item>
      );
    case "select":
      return (
        <Form.Item key={field.key} name={name} label={field.label} rules={rules}>
          <Select
            options={(field.options || []).map((o) => ({ label: o, value: o }))}
            placeholder={`请选择${field.label}`}
          />
        </Form.Item>
      );
    default:
      return (
        <Form.Item key={field.key} name={name} label={field.label} rules={rules}>
          <Input placeholder={field.label} />
        </Form.Item>
      );
  }
}

export function ChatTemplateModal({ template, visible, onClose, onSubmit }: ChatTemplateModalProps) {
  const [form] = Form.useForm();
  const fieldsRef = useRef<FieldDefinition[]>([]);

  if (template) {
    fieldsRef.current = template.fields || [];
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const fields = fieldsRef.current;

      let rendered = template!.prompt_template;
      fields.forEach((field, idx) => {
        let val = values[idx];
        // DatePicker returns dayjs object
        if (val && typeof val === "object" && typeof val.format === "function") {
          val = val.format("YYYY-MM-DD");
        }
        rendered = rendered.replaceAll(`{{${field.key}}}`, val ?? "");
      });

      onSubmit(rendered);
      form.resetFields();
    } catch {
      // validation errors — stay open
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  if (!template) return null;

  return (
    <Modal
      title={`填写「${template.template_name}」`}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="生成提示词"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        {(template.fields || []).map((field, idx) => renderField(field, idx))}
        {(template.fields || []).length === 0 && (
          <p className="text-gray-500 text-sm">该模板无需填写参数，点击确认直接使用。</p>
        )}
      </Form>
    </Modal>
  );
}
