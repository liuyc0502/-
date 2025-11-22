"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal, Form, Input, Button, Card, App, Tabs, Upload } from "antd";
import { PlusOutlined, DeleteOutlined, UploadOutlined, FileOutlined, LoadingOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import patientService from "@/services/patientService";
import { storageService } from "@/services/storageService";

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

interface AttachmentFormData {
  file_name: string;
  file_type: string;
  file_url: string;
  file_size: number;
}

// Image Uploader Component
function ImageUploader({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(value || '');

  useEffect(() => {
    setPreviewUrl(value || '');
  }, [value]);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const result = await storageService.uploadFiles([file], 'medical-images');
      if (result.files && result.files.length > 0) {
        const url = result.files[0].url;
        setPreviewUrl(url);
        onChange?.(url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
    return false; // Prevent default upload
  };

  const uploadProps: UploadProps = {
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: handleUpload,
  };

  return (
    <div className="flex items-start gap-4">
      <Upload {...uploadProps}>
        <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} disabled={uploading}>
          {uploading ? '上传中...' : '选择图片'}
        </Button>
      </Upload>
      {previewUrl && (
        <div className="flex-1">
          <img
            src={previewUrl}
            alt="预览"
            className="max-h-32 rounded border border-gray-200"
          />
          <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{previewUrl}</p>
        </div>
      )}
      {!previewUrl && (
        <Input
          placeholder="或输入图片URL"
          value={value}
          onChange={(e) => {
            setPreviewUrl(e.target.value);
            onChange?.(e.target.value);
          }}
          className="flex-1"
        />
      )}
    </div>
  );
}

// File Uploader Component
function FileUploader({
  value,
  onChange,
}: {
  value?: AttachmentFormData;
  onChange?: (data: AttachmentFormData) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const result = await storageService.uploadFiles([file], 'attachments');
      if (result.files && result.files.length > 0) {
        const uploadedFile = result.files[0];
        onChange?.({
          file_name: file.name,
          file_type: file.name.split('.').pop() || 'unknown',
          file_url: uploadedFile.url,
          file_size: file.size,
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
    return false; // Prevent default upload
  };

  const uploadProps: UploadProps = {
    showUploadList: false,
    beforeUpload: handleUpload,
  };

  return (
    <div className="space-y-2">
      <Upload {...uploadProps}>
        <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} disabled={uploading}>
          {uploading ? '上传中...' : '选择文件'}
        </Button>
      </Upload>
      {value?.file_url && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
          <FileOutlined className="text-blue-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.file_name}</p>
            <p className="text-xs text-gray-500">
              {value.file_type?.toUpperCase()} · {value.file_size ? `${(value.file_size / 1024).toFixed(1)} KB` : ''}
            </p>
          </div>
          <a
            href={value.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 text-sm hover:underline"
          >
            查看
          </a>
        </div>
      )}
    </div>
  );
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
        attachments: detail.attachments.map(a => ({
          file_name: a.file_name,
          file_type: a.file_type,
          file_url: a.file_url,
          file_size: a.file_size,
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
      await patientService.deleteTimelineAttachments(timelineId);

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

      // Create attachments
      if (values.attachments?.length > 0) {
        for (const attachment of values.attachments) {
          if (attachment?.file_url && attachment?.file_name) {
            await patientService.createAttachment({
              timeline_id: timelineId,
              file_name: attachment.file_name,
              file_type: attachment.file_type || 'unknown',
              file_url: attachment.file_url,
              file_size: attachment.file_size || 0,
            });
          }
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

  // Tab items configuration
  const tabItems = useMemo(() => [
    {
      key: "basic",
      label: "基本信息",
      children: (
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Doctor Notes */}
          <div className="col-span-7 space-y-4">
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
                    >
                      添加药物
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </div>

          {/* Right Column - Patient Summary */}
          <div className="col-span-5 space-y-4">
            <Form.Item
              label="患者报告解读（通俗版）"
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
                    >
                      添加建议
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </div>
        </div>
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
                {fields.map((field) => {
                  const imageUrl = form.getFieldValue(['images', field.name, 'image_url']);
                  return (
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
                          label="影像类型"
                          className="mb-2"
                        >
                          <Input placeholder="病理切片" />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "image_label"]}
                          label="影像标签"
                          className="mb-2"
                          rules={[{ required: true, message: '请输入影像标签' }]}
                        >
                          <Input placeholder="关节X光片" />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "image_url"]}
                          label="影像"
                          className="col-span-2 mb-0"
                          rules={[{ required: true, message: '请上传影像' }]}
                        >
                          <ImageUploader
                            value={imageUrl}
                            onChange={(url) => {
                              const images = form.getFieldValue('images') || [];
                              images[field.name] = { ...images[field.name], image_url: url };
                              form.setFieldsValue({ images });
                            }}
                          />
                        </Form.Item>
                      </div>
                    </Card>
                  );
                })}
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
    {
      key: "attachments",
      label: "附件",
      children: (
        <Form.Item label="附件文件">
          <Form.List name="attachments">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => {
                  const attachment = form.getFieldValue(['attachments', field.name]) || {};
                  return (
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
                      <FileUploader
                        value={attachment}
                        onChange={(fileData) => {
                          const attachments = form.getFieldValue('attachments') || [];
                          attachments[field.name] = fileData;
                          form.setFieldsValue({ attachments });
                        }}
                      />
                      {/* Hidden form items to store data */}
                      <Form.Item name={[field.name, "file_name"]} hidden><Input /></Form.Item>
                      <Form.Item name={[field.name, "file_type"]} hidden><Input /></Form.Item>
                      <Form.Item name={[field.name, "file_url"]} hidden><Input /></Form.Item>
                      <Form.Item name={[field.name, "file_size"]} hidden><Input /></Form.Item>
                    </Card>
                  );
                })}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  block
                >
                  添加附件
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>
      ),
    },
  ], []);

  return (
    <Modal
      title="编辑时间线详情"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={1200}
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
          <Tabs items={tabItems} />
        </Form>
      )}
    </Modal>
  );
}
