"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Pencil, Stethoscope, Wrench } from "lucide-react";
import { NAME_CHECK_STATUS } from "@/const/agentConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { App, Modal, Input, Switch, Checkbox, ConfigProvider } from "antd";
import {
  checkAgentName,
  fetchAgentList,
  getCreatingSubAgentId,
  searchAgentInfo,
  updateAgent,
  deleteAgent,
  fetchTools,
  updateToolConfig,
} from "@/services/agentConfigService";

interface AgentListItem {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_available: boolean;
  enabled: boolean;
  agent_role_category: string;
}

interface ToolItem {
  id: string;
  name: string;
  description: string;
  source: string;
  is_available: boolean;
}

interface EditFormState {
  agentId: number;
  name: string;
  displayName: string;
  description: string;
  dutyPrompt: string;
  enabled: boolean;
  boundToolIds: Set<string>;
  initialToolIds: Set<string>;
  isNew: boolean;
}

const SPECIALIST_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function sanitizeSpecialistVariableName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/_assistant$/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildDefaultSpecialistVariableName(
  agentId: number,
  displayName: string,
  currentName: string
): string {
  const sanitizedCurrentName = sanitizeSpecialistVariableName(currentName);
  if (sanitizedCurrentName && !sanitizedCurrentName.startsWith("specialist_")) {
    return `${sanitizedCurrentName}_assistant`.slice(0, 50);
  }

  const sanitizedDisplayName = sanitizeSpecialistVariableName(displayName);
  if (sanitizedDisplayName) {
    return `${sanitizedDisplayName}_assistant`.slice(0, 50);
  }

  return `specialist_${agentId}_assistant`;
}

export function SpecialistAgentConfigView() {
  const { message, modal } = App.useApp();
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [allTools, setAllTools] = useState<ToolItem[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAgentList({
        agentRoleCategory: "tool",
        includeDisabled: true,
      });
      if (result.success) {
        setAgents(result.data);
      } else {
        message.error("加载智能体列表失败");
      }
    } catch {
      message.error("加载智能体列表失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const loadToolList = async () => {
    setToolsLoading(true);
    try {
      const result = await fetchTools();
      if (result.success) {
        setAllTools(result.data);
      }
    } catch {
      console.error("Failed to load tools");
    } finally {
      setToolsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const result = await getCreatingSubAgentId();
      if (!result.success || !result.data) {
        message.error("创建智能体失败");
        return;
      }
      const newId = Number(result.data.agentId);
      const defaultName = result.data.name || `specialist_${newId}_assistant`;

      // Initialize as tool-type agent
      const updateResult = await updateAgent(
        newId,
        defaultName,         // name
        undefined,           // description
        undefined,           // modelName
        undefined,           // maxSteps
        undefined,           // provideRunSummary
        true,                // enabled
        undefined,           // businessDescription
        undefined,           // dutyPrompt
        undefined,           // constraintPrompt
        undefined,           // fewShotsPrompt
        undefined,           // displayName
        undefined,           // modelId
        undefined,           // businessLogicModelName
        undefined,           // businessLogicModelId
        undefined,           // category
        "tool",              // agentRoleCategory
      );

      if (!updateResult.success) {
        message.error("初始化智能体失败");
        return;
      }

      setEditForm({
        agentId: newId,
        name: defaultName,
        displayName: "",
        description: "",
        dutyPrompt: "",
        enabled: true,
        boundToolIds: new Set(),
        initialToolIds: new Set(),
        isNew: true,
      });
      await loadToolList();
      setEditModalVisible(true);
    } catch {
      message.error("创建智能体失败");
    }
  };

  const handleEdit = async (agent: AgentListItem) => {
    try {
      const [detailResult] = await Promise.all([
        searchAgentInfo(Number(agent.id)),
        loadToolList(),
      ]);
      if (!detailResult.success || !detailResult.data) {
        message.error("获取智能体详情失败");
        return;
      }
      const detail = detailResult.data;
      const boundIds = new Set<string>(
        (detail.tools || []).map((t: ToolItem) => t.id)
      );

      setEditForm({
        agentId: detail.id,
        name: detail.name || "",
        displayName: detail.display_name || "",
        description: detail.description || "",
        dutyPrompt: detail.duty_prompt || "",
        enabled: detail.enabled ?? false,
        boundToolIds: new Set(boundIds),
        initialToolIds: new Set(boundIds),
        isNew: false,
      });
      setEditModalVisible(true);
    } catch {
      message.error("获取智能体详情失败");
    }
  };

  const handleSave = async () => {
    if (!editForm) return;
    const trimmedDisplayName = editForm.displayName.trim();
    if (!trimmedDisplayName) {
      message.warning("请填写显示名称");
      return;
    }

    const hasCustomInternalName = Boolean(editForm.name.trim()) && !editForm.name.trim().startsWith("specialist_");
    let internalName = hasCustomInternalName
      ? editForm.name.trim()
      : buildDefaultSpecialistVariableName(
          editForm.agentId,
          trimmedDisplayName,
          editForm.name,
        );

    if (internalName.length > 50) {
      message.warning("变量名长度不能超过 50 个字符");
      return;
    }

    if (!SPECIALIST_NAME_PATTERN.test(internalName)) {
      message.warning("变量名仅支持字母、数字和下划线，且不能以数字开头");
      return;
    }

    let nameCheck = await checkAgentName(internalName, editForm.agentId);
    if (!hasCustomInternalName && nameCheck.status === NAME_CHECK_STATUS.EXISTS_IN_TENANT) {
      internalName = `specialist_${editForm.agentId}_assistant`;
      nameCheck = await checkAgentName(internalName, editForm.agentId);
    }

    if (nameCheck.status === NAME_CHECK_STATUS.EXISTS_IN_TENANT) {
      message.warning(`变量名「${internalName}」已存在，请修改`);
      return;
    }

    setSaving(true);
    try {
      // Update agent info
      const updateResult = await updateAgent(
        editForm.agentId,
        internalName,
        editForm.description || undefined,
        undefined,
        undefined,
        undefined,
        editForm.enabled,
        undefined,
        editForm.dutyPrompt || undefined,
        undefined,
        undefined,
        trimmedDisplayName,
        undefined,
        undefined,
        undefined,
        undefined,
        "tool",
      );

      if (!updateResult.success) {
        message.error("保存失败");
        setSaving(false);
        return;
      }

      // Diff tool bindings and update
      const added = [...editForm.boundToolIds].filter(
        (id) => !editForm.initialToolIds.has(id)
      );
      const removed = [...editForm.initialToolIds].filter(
        (id) => !editForm.boundToolIds.has(id)
      );

      for (const toolId of added) {
        await updateToolConfig(Number(toolId), editForm.agentId, {}, true);
      }
      for (const toolId of removed) {
        await updateToolConfig(Number(toolId), editForm.agentId, {}, false);
      }

      message.success("保存成功");
      setEditModalVisible(false);
      setEditForm(null);
      loadAgents();
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (agent: AgentListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    modal.confirm({
      title: "确认删除",
      content: `确定要删除智能体「${agent.display_name || agent.name}」吗？`,
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const result = await deleteAgent(Number(agent.id));
          if (result.success) {
            message.success("已删除");
            loadAgents();
          } else {
            message.error("删除失败");
          }
        } catch {
          message.error("删除失败");
        }
      },
    });
  };

  const handleToggleEnabled = async (agent: AgentListItem, enabled: boolean) => {
    try {
      const result = await updateAgent(
        Number(agent.id),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        enabled,
      );
      if (result.success) {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agent.id ? { ...a, enabled } : a
          )
        );
        message.success(enabled ? "已启用" : "已禁用");
      } else {
        message.error("操作失败");
      }
    } catch {
      message.error("操作失败");
    }
  };

  const handleModalCancel = async () => {
    if (editForm?.isNew) {
      // Clean up the blank agent if user cancels creation
      try {
        await deleteAgent(editForm.agentId);
      } catch {
        // ignore
      }
    }
    setEditModalVisible(false);
    setEditForm(null);
    loadAgents();
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#DA7756",
          colorPrimaryHover: "#C46B4D",
          colorPrimaryActive: "#B85F44",
        },
      }}
    >
    <div className="h-full flex flex-col bg-app-surface overflow-hidden">
      {/* Header */}
      <div className="bg-app-surface border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">专科智能体配置</h1>
          <Button
            onClick={handleCreate}
            className="bg-[#DA7756] hover:bg-[#C46B4D] text-white h-14 w-36 text-base font-medium"
          >
            <Plus size={16} className="mr-1" />
            新建专科
          </Button>
        </div>
      </div>

      {/* Filter */}
      {agents.length > 0 && (
        <div className="px-8 pt-4 flex gap-2 flex-shrink-0">
          {(["all", "enabled", "disabled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filter === f
                  ? "bg-[#DA7756] text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? `全部 (${agents.length})` : f === "enabled" ? `已启用 (${agents.filter((a) => a.enabled).length})` : `未启用 (${agents.filter((a) => !a.enabled).length})`}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          {loading ? (
            <div className="py-12 text-center text-gray-500">加载中...</div>
          ) : agents.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Stethoscope className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>暂无专科智能体</p>
              <p className="text-xs text-gray-400 mt-1">
                点击「新建专科」创建会诊专科智能体
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents
                .filter((a) =>
                  filter === "all" ? true : filter === "enabled" ? a.enabled : !a.enabled
                )
                .map((agent) => (
                <Card
                  key={agent.id}
                  className="bg-white border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 group relative"
                  onClick={() => handleEdit(agent)}
                >
                  <CardContent className="p-5 space-y-3">
                    {/* Top: status + actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                            agent.enabled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-50 text-gray-500 border-gray-200"
                          }`}
                        >
                          {agent.enabled ? "已启用" : "未启用"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          size="small"
                          checked={agent.enabled}
                          onChange={(checked) => {
                            handleToggleEnabled(agent, checked);
                          }}
                          onClick={(_, e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(agent);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(agent, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="font-bold text-base text-gray-900">
                      {agent.display_name || agent.name}
                    </h3>

                    {/* Description */}
                    {agent.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {agent.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-[#DA7756]" />
            <span>{editForm?.isNew ? "新建专科智能体" : "编辑专科智能体"}</span>
          </div>
        }
        open={editModalVisible}
        onCancel={handleModalCancel}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        okButtonProps={{ disabled: !editForm?.displayName?.trim(), style: { backgroundColor: '#DA7756', borderColor: '#DA7756' } }}
        width={600}
        centered
      >
        {editForm && (
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent变量名
              </label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="如：radiology_specialist_assistant"
                maxLength={50}
              />
              <p className="mt-1 text-xs text-gray-400">
                留空时会按显示名称自动生成；仅支持字母、数字和下划线。
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                显示名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={editForm.displayName}
                onChange={(e) =>
                  setEditForm({ ...editForm, displayName: e.target.value })
                }
                placeholder="如：影像科专家、病理科专家"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                专科方向
              </label>
              <Input.TextArea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="描述该智能体的专科方向和擅长领域"
                rows={2}
                maxLength={500}
              />
            </div>

            {/* Duty Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                职责提示词
              </label>
              <Input.TextArea
                value={editForm.dutyPrompt}
                onChange={(e) =>
                  setEditForm({ ...editForm, dutyPrompt: e.target.value })
                }
                placeholder="定义该专科智能体在会诊中的角色和职责..."
                rows={4}
                maxLength={5000}
              />
            </div>

            {/* Enabled */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                启用状态
              </label>
              <Switch
                checked={editForm.enabled}
                onChange={(checked) =>
                  setEditForm({ ...editForm, enabled: checked })
                }
              />
              <span className="text-xs text-gray-400">
                {editForm.enabled ? "启用后可参与会诊" : "禁用后不会出现在会诊列表中"}
              </span>
            </div>

            {/* Tool Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-1.5">
                  <Wrench size={14} />
                  工具选择
                </div>
              </label>
              {toolsLoading ? (
                <div className="text-sm text-gray-400 py-2">加载工具列表...</div>
              ) : allTools.length === 0 ? (
                <div className="text-sm text-gray-400 py-2">暂无可用工具</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {allTools.map((tool) => (
                    <label
                      key={tool.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                        editForm.boundToolIds.has(tool.id)
                          ? "bg-orange-50 border border-orange-200"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <Checkbox
                        checked={editForm.boundToolIds.has(tool.id)}
                        onChange={(e) => {
                          const newSet = new Set(editForm.boundToolIds);
                          if (e.target.checked) {
                            newSet.add(tool.id);
                          } else {
                            newSet.delete(tool.id);
                          }
                          setEditForm({ ...editForm, boundToolIds: newSet });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800">
                          {tool.name}
                        </div>
                        {tool.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {tool.description}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
    </ConfigProvider>
  );
}
