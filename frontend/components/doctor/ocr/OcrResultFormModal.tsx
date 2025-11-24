"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Tabs,
  Alert,
  Tooltip,
  Space,
  Divider,
  message,
} from "antd";
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  Save,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import {
  DocumentType,
  TemplateType,
  TemplateField,
  ExtractedFields,
  ExtractionResult,
  TEMPLATE_FIELDS,
  DOCUMENT_TYPE_NAMES,
  getTemplatesByDocumentType,
  validateExtractedFields,
} from "@/types/ocrTemplates";
import { Annotation } from "@/components/image-annotation/ImageAnnotator";

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface OcrResultFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: SaveData) => Promise<void>;
  imageUrl: string;
  ocrText: string;
  extractedFields?: ExtractedFields;
  detectedType?: DocumentType;
  detectedSubtype?: TemplateType;
  confidence?: number;
  uncertainFields?: string[];
  annotations?: Annotation[];
  thumbnailUrl?: string;
}

export interface SaveData {
  documentType: DocumentType;
  templateType: TemplateType;
  fields: ExtractedFields;
  imageUrl: string;
  thumbnailUrl?: string;
  annotations?: Annotation[];
  ocrText: string;
  saveAnnotations: boolean;
  saveOcrText: boolean;
}

export function OcrResultFormModal({
  open,
  onClose,
  onSave,
  imageUrl,
  ocrText,
  extractedFields = {},
  detectedType = "case",
  detectedSubtype = "pathology_report",
  confidence = 0,
  uncertainFields = [],
  annotations = [],
  thumbnailUrl,
}: OcrResultFormModalProps) {
  const [form] = Form.useForm();
  const [documentType, setDocumentType] = useState<DocumentType>(detectedType);
  const [templateType, setTemplateType] = useState<TemplateType>(detectedSubtype);
  const [saving, setSaving] = useState(false);
  const [saveAnnotations, setSaveAnnotations] = useState(true);
  const [saveOcrText, setSaveOcrText] = useState(true);
  const [activeTab, setActiveTab] = useState("form");

  // Get current template
  const template = TEMPLATE_FIELDS[templateType];
  const availableTemplates = getTemplatesByDocumentType(documentType);

  // Initialize form with extracted fields
  useEffect(() => {
    if (open && extractedFields) {
      // Convert date fields to dayjs
      const formValues: Record<string, any> = {};
      template.fields.forEach((field) => {
        const value = extractedFields[field.key];
        if (field.type === "date" && value) {
          formValues[field.key] = dayjs(value as string);
        } else {
          formValues[field.key] = value;
        }
      });
      form.setFieldsValue(formValues);
    }
  }, [open, extractedFields, templateType, form, template.fields]);

  // Reset template when document type changes
  useEffect(() => {
    const templates = getTemplatesByDocumentType(documentType);
    if (templates.length > 0 && !templates.find((t) => t.key === templateType)) {
      setTemplateType(templates[0].key);
    }
  }, [documentType, templateType]);

  const handleDocumentTypeChange = (type: DocumentType) => {
    setDocumentType(type);
  };

  const handleTemplateChange = (type: TemplateType) => {
    setTemplateType(type);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // Convert dayjs to string for date fields
      const processedFields: ExtractedFields = {};
      template.fields.forEach((field) => {
        const value = values[field.key];
        if (field.type === "date" && value) {
          processedFields[field.key] = dayjs(value).format("YYYY-MM-DD");
        } else {
          processedFields[field.key] = value ?? null;
        }
      });

      setSaving(true);

      await onSave({
        documentType,
        templateType,
        fields: processedFields,
        imageUrl,
        thumbnailUrl,
        annotations: saveAnnotations ? annotations : undefined,
        ocrText: saveOcrText ? ocrText : "",
        saveAnnotations,
        saveOcrText,
      });

      message.success(
        documentType === "case" ? "已保存到病例库" : "已保存到患者档案"
      );
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      message.error("保存失败，请检查必填字段");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: TemplateField) => {
    const isUncertain = uncertainFields.includes(field.key);
    const fieldLabel = (
      <span>
        {field.label}
        {isUncertain && (
          <Tooltip title="AI 置信度较低，请核实">
            <AlertCircle className="inline ml-1 h-4 w-4 text-yellow-500" />
          </Tooltip>
        )}
      </span>
    );

    const rules = field.required
      ? [{ required: true, message: `请输入${field.label}` }]
      : [];

    switch (field.type) {
      case "textarea":
        return (
          <Form.Item
            key={field.key}
            name={field.key}
            label={fieldLabel}
            rules={rules}
          >
            <TextArea rows={3} placeholder={`请输入${field.label}`} />
          </Form.Item>
        );
      case "select":
        return (
          <Form.Item
            key={field.key}
            name={field.key}
            label={fieldLabel}
            rules={rules}
          >
            <Select placeholder={`请选择${field.label}`} allowClear>
              {field.options?.map((opt) => (
                <Option key={opt} value={opt}>
                  {opt}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );
      case "number":
        return (
          <Form.Item
            key={field.key}
            name={field.key}
            label={fieldLabel}
            rules={rules}
          >
            <InputNumber
              className="w-full"
              placeholder={`请输入${field.label}`}
            />
          </Form.Item>
        );
      case "date":
        return (
          <Form.Item
            key={field.key}
            name={field.key}
            label={fieldLabel}
            rules={rules}
          >
            <DatePicker className="w-full" placeholder={`请选择${field.label}`} />
          </Form.Item>
        );
      default:
        return (
          <Form.Item
            key={field.key}
            name={field.key}
            label={fieldLabel}
            rules={rules}
          >
            <Input placeholder={`请输入${field.label}`} />
          </Form.Item>
        );
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <span>OCR 智能入库 - {template.name}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      <div className="flex gap-4" style={{ minHeight: 500 }}>
        {/* Left: Image Preview */}
        <div className="w-1/3 flex flex-col">
          <div className="bg-gray-100 rounded-lg overflow-hidden flex-1 flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="OCR Source"
                className="max-w-full max-h-[400px] object-contain"
              />
            ) : (
              <div className="text-gray-400 flex flex-col items-center">
                <ImageIcon className="h-12 w-12 mb-2" />
                <span>无图片</span>
              </div>
            )}
          </div>
          {annotations.length > 0 && (
            <div className="mt-2 text-sm text-gray-500">
              包含 {annotations.length} 个标注区域
            </div>
          )}
        </div>

        {/* Right: Form */}
        <div className="w-2/3 flex flex-col">
          {/* Confidence Alert */}
          {confidence > 0 && (
            <Alert
              type={confidence >= 0.7 ? "success" : confidence >= 0.4 ? "warning" : "error"}
              icon={confidence >= 0.7 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              message={
                <span>
                  AI 提取置信度: {Math.round(confidence * 100)}%
                  {uncertainFields.length > 0 && (
                    <span className="text-yellow-600 ml-2">
                      ({uncertainFields.length} 个字段需要核实)
                    </span>
                  )}
                </span>
              }
              className="mb-4"
              showIcon
            />
          )}

          {/* Document Type & Template Selection */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                文档类型
              </label>
              <Select
                value={documentType}
                onChange={handleDocumentTypeChange}
                className="w-full"
              >
                <Option value="case">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    病例
                  </span>
                </Option>
                <Option value="patient_record">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    患者病历
                  </span>
                </Option>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模板
              </label>
              <Select
                value={templateType}
                onChange={handleTemplateChange}
                className="w-full"
              >
                {availableTemplates.map((t) => (
                  <Option key={t.key} value={t.key}>
                    {t.name}
                  </Option>
                ))}
              </Select>
            </div>
          </div>

          {/* Tabs: Form / OCR Text */}
          <Tabs activeKey={activeTab} onChange={setActiveTab} className="flex-1">
            <TabPane tab="字段表单" key="form">
              <div className="overflow-y-auto" style={{ maxHeight: 350 }}>
                <Form form={form} layout="vertical" size="small">
                  {template.fields.map(renderField)}
                </Form>
              </div>
            </TabPane>
            <TabPane tab="OCR 原文" key="ocr">
              <div
                className="bg-gray-50 p-3 rounded text-sm overflow-y-auto"
                style={{ maxHeight: 350 }}
              >
                <pre className="whitespace-pre-wrap font-mono text-gray-700">
                  {ocrText || "无 OCR 文本"}
                </pre>
              </div>
            </TabPane>
          </Tabs>

          <Divider className="my-3" />

          {/* Save Options */}
          <div className="flex items-center justify-between">
            <Space>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveAnnotations}
                  onChange={(e) => setSaveAnnotations(e.target.checked)}
                  className="rounded"
                />
                保存标注数据
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveOcrText}
                  onChange={(e) => setSaveOcrText(e.target.checked)}
                  className="rounded"
                />
                保存 OCR 原文
              </label>
            </Space>
            <Space>
              <Button onClick={onClose} icon={<X className="h-4 w-4" />}>
                取消
              </Button>
              <Button
                type="primary"
                onClick={handleSave}
                loading={saving}
                icon={<Save className="h-4 w-4" />}
              >
                {documentType === "case" ? "保存到病例库" : "保存到患者档案"}
              </Button>
            </Space>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default OcrResultFormModal;
