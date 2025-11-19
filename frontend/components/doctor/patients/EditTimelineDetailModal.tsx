"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, Card, App } from "antd";
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
  const [dataLoading, setDataLoading] = useState(false);

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
        patient_summary: detail.detail?.patient_summary || "",
        patient_suggestions: detail.detail?.patient_suggestions || [],
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
      const patient_suggestions = values.patient_suggestions?.filter((s: string) => s?.trim()) || [];
      await patientService.saveTimelineDetail({
        timeline_id: timelineId,
        doctor_notes: values.doctor_notes || "",
        pathology_findings: values.pathology_findings || "",
        medications: medications,
        patient_summary: values.patient_summary || "",
        patient_suggestions: patient_suggestions,
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

  return (
    <Modal
      title="编辑时间线详情"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={1400}
      okText="保存"
      cancelText="取消"
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto'
        }
      }}
    >
      {dataLoading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#D94527] border-r-transparent"></div>
          <p className="text-gray-500 mt-2">加载中...</p>
        </div>
      ) : (
        <Form form={form} layout="vertical">
          {/* Top Section - Grid Layout */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - 60% - Doctor Notes */}
            <div className="col-span-7 space-y-4">
              <Card title="医生记录" size="small" className="h-full">
                <Form.Item label="医生观察记录" name="doctor_notes">
                  <Input.TextArea rows={3} placeholder="请输入医生观察记录" />
                </Form.Item>

                <Form.Item label="病理发现" name="pathology_findings">
                  <Input.TextArea rows={3} placeholder="请输入病理发现" />
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
                          size="small"
                        >
                          添加药物
                        </Button>
                      </>
                    )}
                  </Form.List>
                </Form.Item>
              </Card>
            </div>

            {/* Right Column - 40% - Patient Summary */}
            <div className="col-span-5 space-y-4">
              <Card title="患者版本（通俗易懂）" size="small" className="h-full">
                <Form.Item
                  label="患者报告解读"
                  name="patient_summary"
                  tooltip="用通俗易懂的语言向患者解释检查结果，避免使用专业术语"
                >
                  <Input.TextArea
                    rows={6}
                    placeholder="例如：本次检查结果显示，您的肿瘤标志物指标整体向好。CEA已降至正常范围，CA199虽略高于正常值但较上次明显下降，说明治疗效果良好。"
                  />
                </Form.Item>

                <Form.Item label="给患者的建议">
                  <Form.List name="patient_suggestions">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map((field) => (
                          <div key={field.key} className="flex gap-2 mb-2">
                            <Form.Item
                              name={field.name}
                              className="flex-1 mb-0"
                              noStyle
                            >
                              <Input placeholder="例如：继续观察CA199指标变化" />
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
                          size="small"
                        >
                          添加建议
                        </Button>
                      </>
                    )}
                  </Form.List>
                </Form.Item>
              </Card>
            </div>
          </div>

          {/* Bottom Section - Images and Metrics */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            {/* Medical Images */}
            <Card title="医学影像" size="small">
              <Form.Item label="影像资料" className="mb-0">
                <Form.List name="images">
                  {(fields, { add, remove }) => (
                    <>
                      <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
                        {fields.map((field) => (
                          <Card
                            key={field.key}
                            size="small"
                            className="bg-gray-50"
                            extra={
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => remove(field.name)}
                              />
                            }
                          >
                            <div className="grid grid-cols-2 gap-2">
                              <Form.Item
                                name={[field.name, "image_type"]}
                                fieldKey={[field.name, "image_type"]}
                                className="mb-2"
                              >
                                <Input placeholder="病理切片" size="small" />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "image_label"]}
                                fieldKey={[field.name, "image_label"]}
                                className="mb-2"
                              >
                                <Input placeholder="关节X光片" size="small" />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "image_url"]}
                                fieldKey={[field.name, "image_url"]}
                                className="col-span-2 mb-0"
                              >
                                <Input placeholder="https://example.com/image.jpg" size="small" />
                              </Form.Item>
                            </div>
                          </Card>
                        ))}
                      </div>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                        block
                        size="small"
                      >
                        添加影像
                      </Button>
                    </>
                  )}
                </Form.List>
              </Form.Item>
            </Card>

            {/* Metrics */}
            <Card title="检查指标" size="small">
              <Form.Item label="指标数据" className="mb-0">
                <Form.List name="metrics">
                  {(fields, { add, remove }) => (
                    <>
                      <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
                        {fields.map((field) => (
                          <Card
                            key={field.key}
                            size="small"
                            className="bg-gray-50"
                            extra={
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => remove(field.name)}
                              />
                            }
                          >
                            <div className="grid grid-cols-3 gap-2">
                              <Form.Item
                                name={[field.name, "metric_name"]}
                                fieldKey={[field.name, "metric_name"]}
                                className="mb-2"
                              >
                                <Input placeholder="RF" size="small" />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "metric_full_name"]}
                                fieldKey={[field.name, "metric_full_name"]}
                                className="mb-2"
                              >
                                <Input placeholder="类风湿因子" size="small" />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "metric_value"]}
                                fieldKey={[field.name, "metric_value"]}
                                className="mb-2"
                              >
                                <Input placeholder="125" size="small" />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "metric_unit"]}
                                fieldKey={[field.name, "metric_unit"]}
                                className="mb-2"
                              >
                                <Input placeholder="IU/mL" size="small" />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "metric_trend"]}
                                fieldKey={[field.name, "metric_trend"]}
                                className="mb-2"
                              >
                                <Input placeholder="up/down/normal" size="small" />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "metric_status"]}
                                fieldKey={[field.name, "metric_status"]}
                                className="mb-0"
                              >
                                <Input placeholder="normal/warning" size="small" />
                              </Form.Item>
                            </div>
                          </Card>
                        ))}
                      </div>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                        block
                        size="small"
                      >
                        添加指标
                      </Button>
                    </>
                  )}
                </Form.List>
              </Form.Item>
            </Card>
          </div>
        </Form>
      )}
    </Modal>
  );
}
