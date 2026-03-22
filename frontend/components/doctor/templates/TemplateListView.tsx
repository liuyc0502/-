"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { App, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Popconfirm, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/services/chatTemplateService";
import type { ChatTemplate, FieldDefinition } from "@/services/chatTemplateService";

const FIELD_TYPES = [
  { label: "单行文本", value: "text" },
  { label: "多行文本", value: "textarea" },
  { label: "日期", value: "date" },
  { label: "下拉选择", value: "select" },
];

export function TemplateListView() {
  const { message } = App.useApp();
  const [templates, setTemplates] = useState<ChatTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChatTemplate | null>(null);
  const [form] = Form.useForm();

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await listTemplates();
      setTemplates(data);
    } catch {
      message.error("加载模板失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreate = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({ sort_order: 0, fields: [] });
    setModalOpen(true);
  };

  const openEdit = (tpl: ChatTemplate) => {
    setEditingTemplate(tpl);
    form.setFieldsValue({
      template_name: tpl.template_name,
      slash_command: tpl.slash_command,
      prompt_template: tpl.prompt_template,
      sort_order: tpl.sort_order,
      fields: tpl.fields,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTemplate(id);
      message.success("模板已删除");
      loadTemplates();
    } catch {
      message.error("删除失败");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // Strip leading slash if user typed it
      values.slash_command = values.slash_command?.replace(/^\//, "");
      // Parse options strings for select fields
      const fields: FieldDefinition[] = (values.fields || []).map((f: any) => ({
        key: f.key,
        label: f.label,
        required: f.required ?? true,
        type: f.type,
        options: f.type === "select" && f.options_str
          ? f.options_str.split(",").map((s: string) => s.trim()).filter(Boolean)
          : undefined,
      }));

      if (editingTemplate) {
        await updateTemplate(editingTemplate.template_id, { ...values, fields });
        message.success("模板已保存");
      } else {
        await createTemplate({ ...values, fields });
        message.success("模板已创建");
      }
      setModalOpen(false);
      loadTemplates();
    } catch (err: any) {
      if (err?.errorFields) return; // form validation errors, don't close
      message.error("保存失败");
    }
  };

  const columns: ColumnsType<ChatTemplate> = [
    {
      title: "模板名称",
      dataIndex: "template_name",
      key: "template_name",
      render: (name: string) => <span className="text-base font-semibold text-gray-900">{name}</span>,
    },
    {
      title: "指令名称",
      dataIndex: "slash_command",
      key: "slash_command",
      render: (cmd: string) => (
        <Tag color="blue" className="font-mono text-sm">/{cmd}</Tag>
      ),
    },
    {
      title: "字段数量",
      key: "fields_count",
      render: (_: any, record: ChatTemplate) => (
        <span className="text-base text-gray-600">{(record.fields || []).length} 个字段</span>
      ),
    },
    {
      title: "排序",
      dataIndex: "sort_order",
      key: "sort_order",
      width: 80,
      render: (sortOrder: number) => <span className="text-base text-gray-700">{sortOrder}</span>,
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      render: (_: any, record: ChatTemplate) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<Pencil size={16} />}
            onClick={() => openEdit(record)}
            size="middle"
          />
          <Popconfirm
            title="确认删除此模板？"
            onConfirm={() => handleDelete(record.template_id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              icon={<Trash2 size={16} />}
              danger
              size="middle"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">快捷指令模板</h1>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={openCreate}
            className="h-14 w-36 text-base font-medium"
            style={{ backgroundColor: "#DA7756", borderColor: "#DA7756" }}
          >
            新建模板
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          <Table
            dataSource={templates}
            columns={columns}
            rowKey="template_id"
            loading={loading}
            pagination={false}
            locale={{ emptyText: "暂无模板，点击「新建模板」开始创建" }}
            size="large"
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingTemplate ? "编辑模板" : "创建模板"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ style: { backgroundColor: '#DA7756', borderColor: '#DA7756' } }}
        width={640}
        forceRender
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
        >
          <Form.Item
            name="template_name"
            label="模板名称"
            rules={[{ required: true, message: "请输入模板名称" }]}
          >
            <Input placeholder="例如：录入检验报告" />
          </Form.Item>

          <Form.Item
            name="slash_command"
            label="指令名称"
            rules={[{ required: true, message: "请输入指令名称" }]}
            extra="输入后将生成 /指令名称 快捷命令，无需输入 /"
          >
            <Input placeholder="例如：录入报告" addonBefore="/" />
          </Form.Item>

          <Form.Item
            name="prompt_template"
            label="提示词模板"
            rules={[{ required: true, message: "请输入提示词模板" }]}
            extra='使用 {{变量名}} 作为占位符，例如：请帮我录入{{patient_name}}的{{report_type}}报告'
          >
            <Input.TextArea rows={3} placeholder="请帮我录入{{patient_name}}的{{report_type}}报告，主要发现：{{findings}}" />
          </Form.Item>

          <Form.Item name="sort_order" label="排序">
            <InputNumber min={0} style={{ width: 120 }} />
          </Form.Item>

          <div className="border-t pt-4 mb-2">
            <div className="text-sm font-medium text-gray-700 mb-3">表单字段</div>
          </div>

          <Form.List name="fields">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="flex gap-2 items-start bg-gray-50 rounded-lg p-3">
                    <GripVertical size={16} className="mt-2 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Form.Item
                        {...restField}
                        name={[name, "key"]}
                        rules={[{ required: true, message: "请输入字段标识" }]}
                        className="mb-0"
                      >
                        <Input placeholder="字段标识 (英文)" size="small" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, "label"]}
                        rules={[{ required: true, message: "请输入字段名称" }]}
                        className="mb-0"
                      >
                        <Input placeholder="字段名称" size="small" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, "type"]}
                        rules={[{ required: true, message: "请选择类型" }]}
                        className="mb-0"
                        initialValue="text"
                      >
                        <Select options={FIELD_TYPES} size="small" placeholder="字段类型" />
                      </Form.Item>
                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) =>
                          prev.fields?.[name]?.type !== cur.fields?.[name]?.type
                        }
                      >
                        {({ getFieldValue }) =>
                          getFieldValue(["fields", name, "type"]) === "select" ? (
                            <Form.Item
                              {...restField}
                              name={[name, "options_str"]}
                              className="mb-0"
                            >
                              <Input placeholder="选项，逗号分隔" size="small" />
                            </Form.Item>
                          ) : (
                            <Form.Item
                              {...restField}
                              name={[name, "required"]}
                              valuePropName="checked"
                              initialValue={true}
                              className="mb-0"
                            >
                              <Switch size="small" checkedChildren="必填" unCheckedChildren="选填" />
                            </Form.Item>
                          )
                        }
                      </Form.Item>
                    </div>
                    <Button
                      type="text"
                      icon={<Trash2 size={14} />}
                      danger
                      size="small"
                      onClick={() => remove(name)}
                      className="mt-1 flex-shrink-0"
                    />
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ type: "text", required: true })}
                  block
                  icon={<Plus size={14} />}
                >
                  添加字段
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
