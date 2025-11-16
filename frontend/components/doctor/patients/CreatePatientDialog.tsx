"use client";

import { useState } from "react";
import { Modal, Form, Input, InputNumber, Select, DatePicker, App } from "antd";
import patientService from "@/services/patientService";
import type { CreatePatientRequest } from "@/types/patient";

const { TextArea } = Input;

interface CreatePatientDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePatientDialog({ open, onClose, onSuccess }: CreatePatientDialogProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Format the data
      const patientData: CreatePatientRequest = {
        name: values.name,
        gender: values.gender,
        age: values.age,
        medical_record_no: values.medical_record_no,
        phone: values.phone,
        address: values.address,
        date_of_birth: values.date_of_birth
          ? new Date(values.date_of_birth).toISOString().split('T')[0]
          : undefined,
        allergies: values.allergies ? values.allergies.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        family_history: values.family_history,
        past_medical_history: values.past_medical_history
          ? values.past_medical_history.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [],
      };

      await patientService.createPatient(patientData);
      message.success("患者档案创建成功");
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation error
        return;
      }
      message.error(error?.message || "创建患者档案失败");
      console.error("Failed to create patient:", error);
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
      title="新建患者档案"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={700}
      okText="创建"
      cancelText="取消"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-4"
      >
        <div className="grid grid-cols-2 gap-4">
          {/* 基本信息 */}
          <Form.Item
            label="姓名"
            name="name"
            rules={[{ required: true, message: "请输入患者姓名" }]}
          >
            <Input placeholder="请输入姓名" />
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
            label="出生日期"
            name="date_of_birth"
          >
            <DatePicker
              placeholder="请选择出生日期"
              className="w-full"
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Form.Item
            label="病历号"
            name="medical_record_no"
            rules={[{ required: true, message: "请输入病历号" }]}
          >
            <Input placeholder="请输入病历号" />
          </Form.Item>

          <Form.Item
            label="联系电话"
            name="phone"
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
        </div>

        <Form.Item
          label="联系地址"
          name="address"
        >
          <Input placeholder="请输入联系地址" />
        </Form.Item>

        <Form.Item
          label="过敏史"
          name="allergies"
          extra="多个过敏源请用逗号分隔，如：青霉素,磺胺类"
        >
          <Input placeholder="请输入过敏史" />
        </Form.Item>

        <Form.Item
          label="家族史"
          name="family_history"
        >
          <TextArea
            placeholder="请输入家族病史"
            rows={3}
          />
        </Form.Item>

        <Form.Item
          label="既往病史"
          name="past_medical_history"
          extra="多个病史请用逗号分隔"
        >
          <TextArea
            placeholder="请输入既往病史"
            rows={3}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
