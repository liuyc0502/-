"use client";

import { useState } from "react";
import { Modal, Form, Input, Select, InputNumber, message } from "antd";
import { medicalCaseService } from "@/services/medicalCaseService";
 
const { TextArea } = Input;
 
interface CreateCaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
 
const diseaseTypes = [
  "类风湿",
  "红斑狼疮",
  "强直性脊柱炎",
  "痛风",
  "骨关节炎",
  "干燥综合征",
  "其他"
];
 
export function CreateCaseDialog({ open, onClose, onSuccess }: CreateCaseDialogProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
 
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
 
      // Generate case number if not provided
      if (!values.case_no) {
        values.case_no = `CASE${Date.now()}`;
      }
 
      await medicalCaseService.create(values);
      message.success("病例创建成功！您可以在详情页进一步编辑完善。");
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to create case:", error);
      message.error("创建病例失败，请重试");
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
      width={600}
      okText="创建"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-4"
      >
        <Form.Item
          name="case_no"
          label="病例编号"
          tooltip="留空则自动生成"
        >
          <Input placeholder="例如：#0234 (可选)" />
        </Form.Item>
 
        <Form.Item
          name="diagnosis"
          label="诊断"
          rules={[{ required: true, message: "请输入诊断" }]}
        >
          <Input placeholder="例如：类风湿关节炎" />
        </Form.Item>
 
        <Form.Item
          name="disease_type"
          label="疾病类型"
          rules={[{ required: true, message: "请选择疾病类型" }]}
        >
          <Select placeholder="请选择疾病类型">
            {diseaseTypes.map(type => (
              <Select.Option key={type} value={type}>
                {type}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
 
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="age"
            label="年龄"
            rules={[{ required: true, message: "请输入年龄" }]}
          >
            <InputNumber
              min={0}
              max={150}
              placeholder="58"
              className="w-full"
            />
          </Form.Item>
 
          <Form.Item
            name="gender"
            label="性别"
            rules={[{ required: true, message: "请选择性别" }]}
          >
            <Select placeholder="请选择性别">
              <Select.Option value="男">男</Select.Option>
              <Select.Option value="女">女</Select.Option>
            </Select>
          </Form.Item>
        </div>
 
        <Form.Item
          name="chief_complaint"
          label="主诉"
        >
          <TextArea
            rows={3}
            placeholder="例如：双膝关节肿痛3个月，伴晨僵"
          />
        </Form.Item>
 
        <Form.Item
          name="category"
          label="病例类别"
        >
          <Select placeholder="请选择病例类别">
            <Select.Option value="classic">经典病例</Select.Option>
            <Select.Option value="rare">罕见病例</Select.Option>
            <Select.Option value="typical">典型病例</Select.Option>
            <Select.Option value="complex">复杂病例</Select.Option>
          </Select>
        </Form.Item>
 
        <Form.Item
          name="is_classic"
          label="标记为经典病例"
        >
          <Select placeholder="是否标记为经典病例">
            <Select.Option value={true}>是</Select.Option>
            <Select.Option value={false}>否</Select.Option>
          </Select>
        </Form.Item>
      </Form>
 
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 提示：创建后您可以在病例详情页点击"编辑"按钮，进一步完善现病史、体格检查、实验室检查、治疗方案等详细信息。
        </p>
      </div>
    </Modal>
  );
}