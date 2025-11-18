"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, DatePicker, Button as AntButton, Space, Select, TimePicker, App, Tabs } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import carePlanService from "@/services/carePlanService";
import type { CarePlan, CreateCarePlanRequest, MedicationData, TaskData, PrecautionData } from "@/types/carePlan";

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface CreateCarePlanModalProps {
  open: boolean;
  patientId: number;
  editingPlan?: CarePlan | null;
  onClose: (shouldRefresh?: boolean) => void;
}

export function CreateCarePlanModal({
  open,
  patientId,
  editingPlan,
  onClose,
}: CreateCarePlanModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (open && editingPlan) {
      // Load existing plan data for editing
      loadPlanDetails();
    } else if (open) {
      // Reset form for new plan
      form.resetFields();
    }
  }, [open, editingPlan]);

  const loadPlanDetails = async () => {
    if (!editingPlan) return;

    try {
      const planDetails = await carePlanService.getCarePlan(editingPlan.plan_id);

      form.setFieldsValue({
        plan_name: planDetails.plan_name,
        plan_description: planDetails.plan_description,
        date_range: [
          planDetails.start_date ? dayjs(planDetails.start_date) : null,
          planDetails.end_date ? dayjs(planDetails.end_date) : null,
        ],
        medications: planDetails.medications.map((med) => ({
          medication_name: med.medication_name,
          dosage: med.dosage,
          frequency: med.frequency,
          time_slots: med.time_slots.map((time) => dayjs(time, "HH:mm")),
          notes: med.notes,
        })),
        tasks: planDetails.tasks.map((task) => ({
          task_title: task.task_title,
          task_description: task.task_description,
          task_category: task.task_category,
          frequency: task.frequency,
          duration: task.duration,
        })),
        precautions: planDetails.precautions.map((precaution) => ({
          precaution_content: precaution.precaution_content,
          priority: precaution.priority,
        })),
      });
    } catch (error) {
      message.error("加载计划详情失败");
      console.error("Failed to load plan details:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const dateRange = values.date_range || [];
      const medications: MedicationData[] = (values.medications || []).map((med: any) => ({
        medication_name: med.medication_name,
        dosage: med.dosage,
        frequency: med.frequency,
        time_slots: (med.time_slots || []).map((time: any) => time.format("HH:mm")),
        notes: med.notes,
      }));

      const tasks: TaskData[] = (values.tasks || []).map((task: any) => ({
        task_title: task.task_title,
        task_description: task.task_description,
        task_category: task.task_category,
        frequency: task.frequency,
        duration: task.duration,
      }));

      const precautions: PrecautionData[] = (values.precautions || []).map((precaution: any) => ({
        precaution_content: precaution.precaution_content,
        priority: precaution.priority || "medium",
      }));

      if (editingPlan) {
        // Update existing plan (basic info only, items managed separately)
        await carePlanService.updateCarePlan(editingPlan.plan_id, {
          plan_name: values.plan_name,
          plan_description: values.plan_description,
          start_date: dateRange[0] ? dateRange[0].format("YYYY-MM-DD") : undefined,
          end_date: dateRange[1] ? dateRange[1].format("YYYY-MM-DD") : undefined,
        });
        message.success("康复计划更新成功");
      } else {
        // Create new plan
        const planData: CreateCarePlanRequest = {
          patient_id: patientId,
          plan_name: values.plan_name,
          plan_description: values.plan_description,
          start_date: dateRange[0] ? dateRange[0].format("YYYY-MM-DD") : new Date().toISOString().split("T")[0],
          end_date: dateRange[1] ? dateRange[1].format("YYYY-MM-DD") : undefined,
          medications,
          tasks,
          precautions,
        };

        await carePlanService.createCarePlan(planData);
        message.success("康复计划创建成功");
      }

      onClose(true);
    } catch (error: any) {
      if (error.errorFields) {
        message.error("请填写所有必填字段");
      } else {
        message.error(editingPlan ? "更新失败" : "创建失败");
        console.error("Failed to save care plan:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: "basic",
      label: "基本信息",
      children: (
        <div className="space-y-4">
          <Form.Item
            name="plan_name"
            label="计划名称"
            rules={[{ required: true, message: "请输入计划名称" }]}
          >
            <Input placeholder="例如：术后康复计划" size="large" />
          </Form.Item>

          <Form.Item name="plan_description" label="计划描述">
            <TextArea
              placeholder="简要描述康复计划的目标和内容"
              rows={3}
              size="large"
            />
          </Form.Item>

          <Form.Item name="date_range" label="计划周期">
            <RangePicker className="w-full" size="large" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "medications",
      label: "用药安排",
      children: (
        <div className="space-y-4">
          <Form.List name="medications">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg relative">
                    <MinusCircleOutlined
                      className="absolute top-2 right-2 text-red-500 cursor-pointer hover:text-red-700"
                      onClick={() => remove(name)}
                    />
                    <Space direction="vertical" className="w-full" size="small">
                      <Form.Item
                        {...restField}
                        name={[name, "medication_name"]}
                        label="药物名称"
                        rules={[{ required: true, message: "请输入药物名称" }]}
                        className="mb-2"
                      >
                        <Input placeholder="例如：奥美拉唑肠溶胶囊" />
                      </Form.Item>

                      <div className="grid grid-cols-2 gap-2">
                        <Form.Item
                          {...restField}
                          name={[name, "dosage"]}
                          label="剂量"
                          rules={[{ required: true, message: "请输入剂量" }]}
                          className="mb-2"
                        >
                          <Input placeholder="例如：20mg" />
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, "frequency"]}
                          label="频率"
                          rules={[{ required: true, message: "请输入频率" }]}
                          className="mb-2"
                        >
                          <Input placeholder="例如：每日两次" />
                        </Form.Item>
                      </div>

                      <Form.Item
                        {...restField}
                        name={[name, "time_slots"]}
                        label="服用时间"
                        className="mb-2"
                      >
                        <Select
                          mode="multiple"
                          placeholder="选择服用时间"
                          options={[
                            { label: "08:00 (早)", value: "08:00" },
                            { label: "12:00 (午)", value: "12:00" },
                            { label: "18:00 (晚)", value: "18:00" },
                            { label: "22:00 (睡前)", value: "22:00" },
                          ]}
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, "notes"]}
                        label="服用说明"
                        className="mb-0"
                      >
                        <TextArea placeholder="例如：饭前30分钟服用" rows={2} />
                      </Form.Item>
                    </Space>
                  </div>
                ))}
                <Form.Item className="mb-0">
                  <AntButton
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    添加药物
                  </AntButton>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>
      ),
    },
    {
      key: "tasks",
      label: "康复任务",
      children: (
        <div className="space-y-4">
          <Form.List name="tasks">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg relative">
                    <MinusCircleOutlined
                      className="absolute top-2 right-2 text-red-500 cursor-pointer hover:text-red-700"
                      onClick={() => remove(name)}
                    />
                    <Space direction="vertical" className="w-full" size="small">
                      <div className="grid grid-cols-2 gap-2">
                        <Form.Item
                          {...restField}
                          name={[name, "task_title"]}
                          label="任务标题"
                          rules={[{ required: true, message: "请输入任务标题" }]}
                          className="mb-2"
                        >
                          <Input placeholder="例如：步行30分钟" />
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, "task_category"]}
                          label="任务分类"
                          rules={[{ required: true, message: "请选择任务分类" }]}
                          className="mb-2"
                        >
                          <Select
                            placeholder="选择分类"
                            options={[
                              { label: "运动", value: "运动" },
                              { label: "护理", value: "护理" },
                              { label: "监测", value: "监测" },
                              { label: "饮食", value: "饮食" },
                            ]}
                          />
                        </Form.Item>
                      </div>

                      <Form.Item
                        {...restField}
                        name={[name, "task_description"]}
                        label="任务描述"
                        className="mb-2"
                      >
                        <TextArea placeholder="详细说明任务要求和注意事项" rows={2} />
                      </Form.Item>

                      <div className="grid grid-cols-2 gap-2">
                        <Form.Item
                          {...restField}
                          name={[name, "frequency"]}
                          label="频率"
                          className="mb-0"
                        >
                          <Input placeholder="例如：每日一次" />
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, "duration"]}
                          label="时长"
                          className="mb-0"
                        >
                          <Input placeholder="例如：30分钟" />
                        </Form.Item>
                      </div>
                    </Space>
                  </div>
                ))}
                <Form.Item className="mb-0">
                  <AntButton
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    添加任务
                  </AntButton>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>
      ),
    },
    {
      key: "precautions",
      label: "注意事项",
      children: (
        <div className="space-y-4">
          <Form.List name="precautions">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg relative">
                    <MinusCircleOutlined
                      className="absolute top-2 right-2 text-red-500 cursor-pointer hover:text-red-700"
                      onClick={() => remove(name)}
                    />
                    <Space direction="vertical" className="w-full" size="small">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <Form.Item
                            {...restField}
                            name={[name, "precaution_content"]}
                            label="注意事项"
                            rules={[{ required: true, message: "请输入注意事项" }]}
                            className="mb-0"
                          >
                            <TextArea
                              placeholder="例如：避免剧烈运动，以散步为主"
                              rows={2}
                            />
                          </Form.Item>
                        </div>
                        <Form.Item
                          {...restField}
                          name={[name, "priority"]}
                          label="优先级"
                          initialValue="medium"
                          className="mb-0"
                        >
                          <Select
                            options={[
                              { label: "高", value: "high" },
                              { label: "中", value: "medium" },
                              { label: "低", value: "low" },
                            ]}
                          />
                        </Form.Item>
                      </div>
                    </Space>
                  </div>
                ))}
                <Form.Item className="mb-0">
                  <AntButton
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    添加注意事项
                  </AntButton>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={editingPlan ? "编辑康复计划" : "创建康复计划"}
      open={open}
      onOk={handleSubmit}
      onCancel={() => onClose(false)}
      width={800}
      confirmLoading={loading}
      okText={editingPlan ? "保存" : "创建"}
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="care-plan-tabs"
        />
      </Form>
    </Modal>
  );
}
