"use client";

import React from "react";
import { Form, Input, Select, DatePicker, Button, message } from "antd";
import { ContextualPromptOption } from "./ContextualPrompts";
import dayjs from "dayjs";

const { TextArea } = Input;

interface FormPromptProps {
  fields: ContextualPromptOption[];
  onSubmit?: (formData: Record<string, any>) => void;
}

export function FormPrompt({ fields, onSubmit }: FormPromptProps) {
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Convert dayjs dates to strings
      const formattedValues = { ...values };
      fields.forEach((field) => {
        if (field.type === "date" && values[field.field]) {
          formattedValues[field.field] = dayjs(values[field.field]).format(
            "YYYY-MM-DD"
          );
        }
      });

      if (onSubmit) {
        onSubmit(formattedValues);
        message.success("表单提交成功");
        form.resetFields();
      }
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  const renderField = (field: ContextualPromptOption) => {
    const commonProps = {
      placeholder: field.placeholder || `请输入${field.label}`,
    };

    // Set initial value
    const initialValue =
      field.value ||
      field.default ||
      (field.type === "date" && field.default === "today" ? dayjs() : undefined);

    switch (field.type) {
      case "text":
      case "tel":
        return <Input {...commonProps} />;

      case "number":
        return <Input type="number" {...commonProps} />;

      case "textarea":
        return <TextArea rows={3} {...commonProps} />;

      case "select":
        return (
          <Select {...commonProps} placeholder={`请选择${field.label}`}>
            {field.options?.map((opt: string) => (
              <Select.Option key={opt} value={opt}>
                {opt}
              </Select.Option>
            ))}
          </Select>
        );

      case "date":
        return <DatePicker style={{ width: "100%" }} />;

      default:
        return <Input {...commonProps} />;
    }
  };

  // Set initial values
  const initialValues: Record<string, any> = {};
  fields.forEach((field) => {
    if (field.value) {
      initialValues[field.field] = field.value;
    } else if (field.default) {
      if (field.type === "date" && field.default === "today") {
        initialValues[field.field] = dayjs();
      } else {
        initialValues[field.field] = field.default;
      }
    }
  });

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      className="mt-2"
    >
      {fields.map((field) => (
        <Form.Item
          key={field.field}
          name={field.field}
          label={field.label}
          rules={[
            {
              required: field.required,
              message: `${field.label}不能为空`,
            },
          ]}
        >
          {renderField(field)}
        </Form.Item>
      ))}

      <Form.Item className="mb-0">
        <div className="flex justify-end gap-2">
          <Button onClick={() => form.resetFields()}>重置</Button>
          <Button type="primary" onClick={handleSubmit}>
            提交
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
}
