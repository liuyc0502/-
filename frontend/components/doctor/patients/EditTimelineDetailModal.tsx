"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, Card, App, Tabs } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import patientService from "@/services/patientService";

// Types
interface EditTimelineDetailModalProps {
  open: boolean;
  onClose: () => void;
  timelineId: number;
  onSuccess: () => void;
}

interface ImageFormData {
  image_type?: string;
  image_label: string;
  image_url: string;
}

interface MetricFormData {
  metric_name: string;
  metric_full_name?: string;
  metric_value: string;
  metric_unit?: string;
  metric_trend?: string;
  metric_status?: string;
}

export function EditTimelineDetailModal({
  open,
  onClose,
  timelineId,
  onSuccess,
}: EditTimelineDetailModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading,setDataLoading] = useState(false);

  useEffect(() => {
    if (open && timelineId) {
      loadTimelineData();
    }
  }, [open, timelineId]);


  const loadTimelineData = async () => {
    try {
      setDataLoading(true);
      const detail = await patientService.getTimelineDetail(timelineId);
      
  
      form.setFieldsValue({
        doctor_notes: detail.detail?.doctor_notes || "",
        pathology_findings: detail.detail?.pathology_findings || "",
        medications: detail.detail?.medications || [],
        images: detail.images.map(img => ({
          image_type: img.image_type,
          image_label: img.image_label,
          image_url: img.image_url,
        })),
        metrics: detail.metrics.map(m => ({
          metric_name: m.metric_name,
          metric_full_name: m.metric_full_name,
          metric_value: m.metric_value,
          metric_unit: m.metric_unit,
          metric_trend: m.metric_trend,
          metric_status: m.metric_status,
        })),
      });
    } catch (error) {
      message.error("加载数据失败");
      console.error("Failed to load timeline data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Save timeline detail
      const medications = values.medications?.filter((m: string) => m?.trim()) || [];
      await patientService.saveTimelineDetail({
        timeline_id: timelineId,
        doctor_notes: values.doctor_notes || "",
        pathology_findings: values.pathology_findings || "",
        medications: medications,
      });

      await patientService.deleteTimelineImages(timelineId);
      await patientService.deleteTimelineMetrics(timelineId);

      // Create images
      if (values.images?.length > 0) {
        for (const [index, img] of values.images.entries()) {
          if (img?.image_url && img?.image_label) {
            await patientService.createMedicalImage({
              timeline_id: timelineId,
              image_type: img.image_type || "病理切片",
              image_label: img.image_label,
              image_url: img.image_url,
              display_order: index,
            });
          }
        }
      }

      // Create metrics
      if (values.metrics?.length > 0) {
        const validMetrics = values.metrics.filter(
          (m: MetricFormData) => m?.metric_name && m?.metric_value
        );
        if (validMetrics.length > 0) {
          await patientService.batchCreateMetrics({
            metrics: validMetrics.map((m: MetricFormData) => ({
              timeline_id: timelineId,
              metric_name: m.metric_name,
              metric_full_name: m.metric_full_name || m.metric_name,
              metric_value: m.metric_value,
              metric_unit: m.metric_unit || "",
              metric_trend: m.metric_trend || "normal",
              metric_status: m.metric_status || "normal",
            })),
          });
        }
      }

      message.success("保存成功");
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error("保存失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const items = [
    {
      key: "basic",
      label: "基本信息",
      children: (
        <>
          <Form.Item label="医生观察记录" name="doctor_notes">
            <Input.TextArea rows={4} placeholder="请输入医生观察记录" />
          </Form.Item>

          <Form.Item label="病理发现" name="pathology_findings">
            <Input.TextArea rows={4} placeholder="请输入病理发现" />
          </Form.Item>

          <Form.Item label="用药方案">
            <Form.List name="medications">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => (
                    <div key={field.key} className="flex gap-2 mb-2">
                      <Form.Item
                        name={field.name}
                        fieldKey={field.name}
                        className="flex-1 mb-0"
                        noStyle
                      >
                        <Input placeholder="例如：甲氨蝶呤 10mg 每周一次" />
                      </Form.Item>
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    block
                  >
                    添加药物
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
        </>
      ),
    },
    {
      key: "images",
      label: "医学影像",
      children: (
        <Form.Item label="影像资料">
          <Form.List name="images">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    className="mb-3"
                    extra={
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    }
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <Form.Item
                        name={[field.name, "image_type"]}
                        fieldKey={[field.name, "image_type"]}
                        label="影像类型"
                        className="mb-2"
                      >
                        <Input placeholder="病理切片" />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "image_label"]}
                        fieldKey={[field.name, "image_label"]}
                        label="影像标签"
                        className="mb-2"
                      >
                        <Input placeholder="关节X光片" />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "image_url"]}
                        fieldKey={[field.name, "image_url"]}
                        label="影像URL"
                        className="col-span-2 mb-0"
                      >
                        <Input placeholder="https://example.com/image.jpg" />
                      </Form.Item>
                    </div>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  block
                >
                  添加影像
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>
      ),
    },
    {
      key: "metrics",
      label: "检查指标",
      children: (
        <Form.Item label="指标数据">
          <Form.List name="metrics">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    className="mb-3"
                    extra={
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    }
                  >
                    <div className="grid grid-cols-3 gap-3">
                      <Form.Item
                        name={[field.name, "metric_name"]}
                        fieldKey={[field.name, "metric_name"]}
                        label="指标名称"
                        className="mb-2"
                      >
                        <Input placeholder="RF" />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "metric_full_name"]}
                        fieldKey={[field.name, "metric_full_name"]}
                        label="全称"
                        className="mb-2"
                      >
                        <Input placeholder="类风湿因子" />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "metric_value"]}
                        fieldKey={[field.name, "metric_value"]}
                        label="数值"
                        className="mb-2"
                      >
                        <Input placeholder="125" />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "metric_unit"]}
                        fieldKey={[field.name, "metric_unit"]}
                        label="单位"
                        className="mb-2"
                      >
                        <Input placeholder="IU/mL" />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "metric_trend"]}
                        fieldKey={[field.name, "metric_trend"]}
                        label="趋势"
                        className="mb-2"
                      >
                        <Input placeholder="up/down/normal/abnormal" />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "metric_status"]}
                        fieldKey={[field.name, "metric_status"]}
                        label="状态"
                        className="mb-0"
                      >
                        <Input placeholder="error/warning/normal/improving" />
                      </Form.Item>
                    </div>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  block
                >
                  添加指标
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>
      ),
    },
  ];

  return (
    <Modal
      title="编辑时间线详情"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={900}
      okText="保存"
      cancelText="取消"
    >
      {dataLoading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#D94527] border-r-transparent"></div>
          <p className="text-gray-500 mt-2">加载中...</p>
        </div>
      ) : (
      <Form form={form} layout="vertical">
        <Tabs items={items} />
      </Form>
      )}
    </Modal>
  );
}
