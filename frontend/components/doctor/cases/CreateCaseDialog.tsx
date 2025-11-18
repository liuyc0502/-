"use client";

import { useState } from "react";
import { Modal, Form, Input, InputNumber, Select, App } from "antd";
import { medicalCaseService } from "@/services/medicalCaseService";

const { TextArea } = Input;

interface CreateCaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCaseDialog({ open, onClose, onSuccess }: CreateCaseDialogProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Format the data
      const caseData = {
        case_no: values.case_no,
        case_title: values.case_title,
        diagnosis: values.diagnosis,
        disease_type: values.disease_type,
        age: values.age,
        gender: values.gender,
        chief_complaint: values.chief_complaint,
        category: values.category,
        is_classic: values.is_classic || false,
      };

      await medicalCaseService.create(caseData);
      message.success("病例创建成功");
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation error
        return;
      }
      message.error(error?.message || "创建病例失败");
      console.error("Failed to create case:", error);
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
      title="新建病例"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={800}
      okText="创建"
      cancelText="取消"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-4"
      >
        {/* 第一行：病例号和标题 */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="病例号"
            name="case_no"
            rules={[{ required: true, message: "请输入病例号" }]}
          >
            <Input placeholder="请输入病例号，如：CASE-2024-001" />
          </Form.Item>

          <Form.Item
            label="病例标题"
            name="case_title"
          >
            <Input placeholder="请输入病例标题（可选）" />
          </Form.Item>
        </div>

        {/* 第二行：诊断和疾病类型 */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="诊断"
            name="diagnosis"
            rules={[{ required: true, message: "请输入诊断" }]}
          >
            <Input placeholder="请输入诊断" />
          </Form.Item>

          <Form.Item
            label="疾病类型"
            name="disease_type"
            rules={[{ required: true, message: "请选择疾病类型" }]}
          >
            <Select placeholder="请选择疾病类型">
              <Select.Option value="类风湿">类风湿</Select.Option>
              <Select.Option value="红斑狼疮">红斑狼疮</Select.Option>
              <Select.Option value="强直性脊柱炎">强直性脊柱炎</Select.Option>
              <Select.Option value="痛风">痛风</Select.Option>
              <Select.Option value="骨关节炎">骨关节炎</Select.Option>
              <Select.Option value="干燥综合征">干燥综合征</Select.Option>
            </Select>
          </Form.Item>
        </div>

        {/* 第三行：年龄、性别、分类 */}
        <div className="grid grid-cols-3 gap-4">
          <Form.Item
            label="年龄"
            name="age"
            rules={[
              { required: true, message: "请输入年龄" },
              { type: "number", min: 0, max: 150, message: "请输入有效的年龄" }
            ]}
          >
            <InputNumber
              placeholder="请输入年龄"
              className="w-full"
              min={0}
              max={150}
            />
          </Form.Item>

          <Form.Item
            label="性别"
            name="gender"
            rules={[{ required: true, message: "请选择性别" }]}
          >
            <Select placeholder="请选择性别">
              <Select.Option value="男">男</Select.Option>
              <Select.Option value="女">女</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="病例分类"
            name="category"
          >
            <Input placeholder="病例分类（可选）" />
          </Form.Item>
        </div>

        {/* 第四行：主诉 */}
        <Form.Item
          label="主诉"
          name="chief_complaint"
        >
          <TextArea
            placeholder="请输入患者主诉"
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* 第五行：是否经典病例 */}
        <Form.Item
          label="标记为经典病例"
          name="is_classic"
          valuePropName="checked"
        >
          <Select placeholder="是否为经典病例" defaultValue={false}>
            <Select.Option value={true}>是</Select.Option>
            <Select.Option value={false}>否</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
