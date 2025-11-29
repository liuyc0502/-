"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, DatePicker, App, Table } from "antd";
import { SaveOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { TestTube } from "lucide-react";
import patientService from "@/services/patientService";
import type { LabReportItem } from "@/types/patient";

const PRIMARY_COLOR = "#D94527";

interface ParsedLabReport {
  patient_name?: string;
  report_type?: string;
  report_date?: string;
  report_institution?: string;
  report_number?: string;
  report_image_url?: string;
  ai_summary?: string;
  test_items: LabReportItem[];
}

interface ConfirmLabReportModalProps {
  open: boolean;
  onClose: () => void;
  parsedData: ParsedLabReport | null;
  timelineId: number;
  patientId: number;
  onSuccess: () => void;
}

export function ConfirmLabReportModal({
  open,
  onClose,
  parsedData,
  timelineId,
  patientId,
  onSuccess,
}: ConfirmLabReportModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [testItems, setTestItems] = useState<LabReportItem[]>([]);
  const [editingKey, setEditingKey] = useState<number | null>(null);

  // Convert date string to Date object for DatePicker
  const parseDate = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  };

  // Format date object to YYYY-MM-DD string
  const formatDate = (date: any): string | undefined => {
    if (!date) return undefined;
    if (typeof date === 'string') return date;
    // Handle Date object from Ant Design DatePicker
    const dateObj = date.$d || date;
    if (dateObj instanceof Date) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return undefined;
  };

  useEffect(() => {
    if (parsedData && open) {
      form.setFieldsValue({
        report_type: parsedData.report_type,
        report_date: parsedData.report_date ? parseDate(parsedData.report_date) : undefined,
        report_institution: parsedData.report_institution,
        report_number: parsedData.report_number,
        report_image_url: parsedData.report_image_url,
        ai_summary: parsedData.ai_summary,
      });
      setTestItems(parsedData.test_items || []);
    }
  }, [parsedData, open, form]);

  const handleItemChange = (index: number, field: keyof LabReportItem, value: string) => {
    const newItems = [...testItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setTestItems(newItems);
  };

  const handleDeleteItem = (index: number) => {
    if (testItems.length === 1) {
      message.warning("至少保留一个检验项");
      return;
    }
    setTestItems(testItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      const validItems = testItems.filter(
        (item) => item.test_item_name && item.test_result
      );

      if (validItems.length === 0) {
        message.error("请至少保留一个有效的检验项");
        return;
      }

      setLoading(true);

      const reportData = {
        timeline_id: timelineId,
        patient_id: patientId,
        report_type: values.report_type || undefined,
        report_date: formatDate(values.report_date),
        report_institution: values.report_institution || undefined,
        report_number: values.report_number || undefined,
        report_image_url: values.report_image_url || undefined,
        ai_summary: values.ai_summary || undefined,
        test_items: validItems,
      };

      await patientService.createLabReport(reportData);
      message.success("检验报告保存成功");
      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Failed to create lab report:", error);
      message.error("保存失败，请检查输入");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setTestItems([]);
    setEditingKey(null);
    onClose();
  };

  const columns = [
    {
      title: "项目名称",
      dataIndex: "test_item_name",
      key: "test_item_name",
      width: "22%",
      render: (text: string, _: LabReportItem, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleItemChange(index, "test_item_name", e.target.value)}
          bordered={editingKey === index}
          readOnly={editingKey !== index}
          className={editingKey === index ? "" : "border-none bg-transparent"}
        />
      ),
    },
    {
      title: "结果",
      dataIndex: "test_result",
      key: "test_result",
      width: "13%",
      render: (text: string, _: LabReportItem, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleItemChange(index, "test_result", e.target.value)}
          bordered={editingKey === index}
          readOnly={editingKey !== index}
          className={editingKey === index ? "" : "border-none bg-transparent"}
        />
      ),
    },
    {
      title: "单位",
      dataIndex: "test_unit",
      key: "test_unit",
      width: "12%",
      render: (text: string, _: LabReportItem, index: number) => (
        <Input
          value={text || ""}
          onChange={(e) => handleItemChange(index, "test_unit", e.target.value)}
          bordered={editingKey === index}
          readOnly={editingKey !== index}
          className={editingKey === index ? "" : "border-none bg-transparent"}
        />
      ),
    },
    {
      title: "参考范围",
      dataIndex: "reference_range",
      key: "reference_range",
      width: "18%",
      render: (text: string, _: LabReportItem, index: number) => (
        <Input
          value={text || ""}
          onChange={(e) => handleItemChange(index, "reference_range", e.target.value)}
          bordered={editingKey === index}
          readOnly={editingKey !== index}
          className={editingKey === index ? "" : "border-none bg-transparent"}
        />
      ),
    },
    {
      title: "状态",
      dataIndex: "abnormal_flag",
      key: "abnormal_flag",
      width: "13%",
      render: (text: string, _: LabReportItem, index: number) => {
        const flagColor =
          text === "↑" ? "text-red-600" : text === "↓" ? "text-blue-600" : "text-green-600";
        return (
          <Input
            value={text || "正常"}
            onChange={(e) => handleItemChange(index, "abnormal_flag", e.target.value)}
            bordered={editingKey === index}
            readOnly={editingKey !== index}
            className={`${editingKey === index ? "" : "border-none bg-transparent"} ${flagColor} font-semibold`}
          />
        );
      },
    },
    {
      title: "操作",
      key: "action",
      width: "12%",
      render: (_: unknown, __: LabReportItem, index: number) => (
        <div className="flex gap-1">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditingKey(editingKey === index ? null : index)}
            type={editingKey === index ? "primary" : "default"}
          />
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteItem(index)}
          />
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <TestTube className="h-5 w-5 text-[#D94527]" />
          <span>确认检验报告 - AI已自动解析</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={1300}
      style={{ top: 20 }}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          icon={<SaveOutlined />}
          onClick={handleSubmit}
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
        >
          确认保存
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
          <p className="text-sm text-blue-900">
            <strong>提示：</strong>AI已自动解析报告内容，请核对信息准确性。点击表格行的编辑按钮可修改数据。
          </p>
        </div>

        <Form form={form} layout="vertical">
          <div className="grid grid-cols-4 gap-3">
            <Form.Item label="报告类型" name="report_type">
              <Input placeholder="例如：血常规" />
            </Form.Item>
            <Form.Item label="报告日期" name="report_date">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item label="检验机构" name="report_institution">
              <Input placeholder="检验机构" />
            </Form.Item>
            <Form.Item label="报告编号" name="report_number">
              <Input placeholder="报告编号" />
            </Form.Item>
          </div>

          <Form.Item label="AI分析摘要" name="ai_summary">
            <Input.TextArea rows={2} placeholder="AI生成的报告摘要" maxLength={500} />
          </Form.Item>
        </Form>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">检验项目详情</h4>
          <Table
            columns={columns}
            dataSource={testItems}
            pagination={false}
            size="small"
            rowKey={(_, index) => `item-${index}`}
            scroll={{ y: 280 }}
            bordered
          />
        </div>
      </div>
    </Modal>
  );
}
