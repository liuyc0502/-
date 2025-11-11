"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Stethoscope, GraduationCap, Heart, Plus, X, Filter } from "lucide-react";
import { Modal, Select, message, Spin } from "antd";
import { fetchAgentList } from "@/services/agentConfigService";
import {
  getPortalAgents,
  setPortalAgents,
  type PortalType,
} from "@/services/portalAgentAssignmentService";
import log from "@/lib/logger";

interface Agent {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string | null;
  is_available: boolean;
}

const portalConfig = {
  doctor: {
    label: "医生端",
    icon: Stethoscope,
    color: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    activeBorderColor: "border-gray-900",
  },
  student: {
    label: "学生端",
    icon: GraduationCap,
    color: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    activeBorderColor: "border-gray-900",
  },
  patient: {
    label: "患者端",
    icon: Heart,
    color: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    activeBorderColor: "border-gray-900",
  },
};

export default function AgentAssignment() {
  const { t } = useTranslation("common");
  const [selectedPortal, setSelectedPortal] = useState<PortalType>("doctor");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [draggedAgent, setDraggedAgent] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<'assigned' | 'pool' | null>(null);

  // 真实数据状态
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<Record<PortalType, string[]>>({
    doctor: [],
    student: [],
    patient: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentAssigned = assignedAgents[selectedPortal];

  // 加载智能体数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 加载所有智能体
        const agentsResult = await fetchAgentList();
        if (agentsResult.success) {
          setAllAgents(agentsResult.data);
        }

        // 加载各端口已分配的智能体
        const [doctorIds, studentIds, patientIds] = await Promise.all([
          getPortalAgents("doctor"),
          getPortalAgents("student"),
          getPortalAgents("patient"),
        ]);

        setAssignedAgents({
          doctor: doctorIds.map(String),
          student: studentIds.map(String),
          patient: patientIds.map(String),
        });
      } catch (error) {
        log.error("Failed to load agent assignment data:", error);
        message.error("加载智能体数据失败");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 过滤逻辑
  const availableAgents = allAgents.filter((agent) => {
    const notAssigned = !currentAssigned.includes(agent.id);
    const matchesType = !selectedType || agent.category === selectedType;
    return notAssigned && matchesType && agent.is_available;
  });

  const assignedAgentsList = allAgents.filter((agent) =>
    currentAssigned.includes(agent.id)
  );

  // 获取所有类型用于筛选
  const allTypes = Array.from(
    new Set(allAgents.map(a => a.category).filter(Boolean) as string[])
  );

  const handleAddAgent = async (agentId: string) => {
    const newAssigned = [...currentAssigned, agentId];
    setAssignedAgents({
      ...assignedAgents,
      [selectedPortal]: newAssigned,
    });

    // 保存到后端
    try {
      setSaving(true);
      await setPortalAgents(selectedPortal, newAssigned.map(Number));
      message.success("分配成功");
    } catch (error) {
      log.error("Failed to assign agent:", error);
      message.error("分配失败");
      // 回滚
      setAssignedAgents({
        ...assignedAgents,
        [selectedPortal]: currentAssigned,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAgent = async (agentId: string) => {
    const newAssigned = currentAssigned.filter((id) => id !== agentId);
    setAssignedAgents({
      ...assignedAgents,
      [selectedPortal]: newAssigned,
    });

    // 保存到后端
    try {
      setSaving(true);
      await setPortalAgents(selectedPortal, newAssigned.map(Number));
      message.success("移除成功");
    } catch (error) {
      log.error("Failed to remove agent:", error);
      message.error("移除失败");
      // 回滚
      setAssignedAgents({
        ...assignedAgents,
        [selectedPortal]: currentAssigned,
      });
    } finally {
      setSaving(false);
    }
  };

  // 拖拽处理
  const handleDragStart = (agentId: string) => {
    setDraggedAgent(agentId);
  };

  const handleDragEnd = () => {
    setDraggedAgent(null);
    setIsDraggingOver(null);
  };

  const handleDragOverAssigned = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedAgent && !currentAssigned.includes(draggedAgent)) {
      setIsDraggingOver('assigned');
    }
  };

  const handleDragLeaveAssigned = () => {
    setIsDraggingOver(null);
  };

  const handleDropAssigned = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedAgent && !currentAssigned.includes(draggedAgent)) {
      handleAddAgent(draggedAgent);
    }
    setDraggedAgent(null);
    setIsDraggingOver(null);
  };

  const handleDragOverPool = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedAgent && currentAssigned.includes(draggedAgent)) {
      setIsDraggingOver('pool');
    }
  };

  const handleDragLeavePool = () => {
    setIsDraggingOver(null);
  };

  const handleDropPool = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedAgent && currentAssigned.includes(draggedAgent)) {
      handleRemoveAgent(draggedAgent);
    }
    setDraggedAgent(null);
    setIsDraggingOver(null);
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center">
        <Spin size="large" spinning tip="加载中...">
          <div style={{ minHeight: 200 }} />
        </Spin>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white flex flex-col relative">
      {saving && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">
          <Spin size="large" spinning tip="保存中...">
            <div style={{ minHeight: 100 }} />
          </Spin>
        </div>
      )}
      {/* 上半部分：角色选择 + 已分配智能体 */}
      <div className="flex overflow-hidden" style={{ height: '50%' }}>
        {/* 左侧 - 角色选择面板 */}
        <div className="w-64 border-r border-gray-200 p-6 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">选择端口</h2>
          <div className="space-y-3">
            {(Object.keys(portalConfig) as PortalType[]).map((portal) => {
              const config = portalConfig[portal];
              const Icon = config.icon;
              const isActive = selectedPortal === portal;
              const count = assignedAgents[portal].length;

              return (
                <button
                  key={portal}
                  onClick={() => setSelectedPortal(portal)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    isActive
                      ? `${config.activeBorderColor} bg-gray-50`
                      : `${config.borderColor} bg-white hover:bg-gray-50`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <span className="font-medium text-gray-900">
                        {config.label}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {count} 个
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 右侧 - 智能体分配详情 */}
        <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标题 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {portalConfig[selectedPortal].label} - 已分配智能体
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            为该端口分配和管理可用的智能体
          </p>
        </div>

          {/* 主体 - 已分配智能体列表（改成三列） */}
          <div 
            className={`flex-1 overflow-auto p-6 transition-all ${
              isDraggingOver === 'assigned' ? 'bg-blue-50 border-2 border-dashed border-blue-400' : ''
            }`}
            onDragOver={handleDragOverAssigned}
            onDragLeave={handleDragLeaveAssigned}
            onDrop={handleDropAssigned}>
            {assignedAgentsList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {assignedAgentsList.map((agent) => (
                  <div
                    key={agent.id}
                    draggable
                    onDragStart={() => handleDragStart(agent.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-all cursor-move ${
                      draggedAgent === agent.id ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {agent.display_name || agent.name}
                          </h4>
                          {agent.category && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded flex-shrink-0">
                              {agent.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {agent.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveAgent(agent.id)}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <svg
                      className="h-12 w-12 mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">暂无已分配智能体</p>
                  <p className="text-sm text-gray-400 mt-1">
                    从下方资源池中拖拽或点击智能体进行分配
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 下半部分：可用智能体资源池（横向贯穿，占50%高度） */}
      <div className="border-t border-gray-200 bg-gray-50 flex flex-col" style={{ height: '50%' }}>
        {/* 资源池标题栏 */}
        <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
          <h4 className="text-sm font-semibold text-gray-900">
            智能体资源池
          </h4>
          <button
            onClick={() => setFilterModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            <Filter className="h-4 w-4" />
            筛选
            {selectedType && (
              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                {selectedType}
              </span>
            )}
          </button>
        </div>

        {/* 资源池内容 - 支持滚动 */}
        <div 
          className={`flex-1 overflow-y-auto p-6 transition-all ${
            isDraggingOver === 'pool' ? 'bg-red-50 border-2 border-dashed border-red-400' : ''
          }`}
          onDragOver={handleDragOverPool}
          onDragLeave={handleDragLeavePool}
          onDrop={handleDropPool}>
          {availableAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {availableAgents.map((agent) => (
                <div
                  key={agent.id}
                  draggable
                  onDragStart={() => handleDragStart(agent.id)}
                  onDragEnd={handleDragEnd}
                  className={`p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-move ${
                    draggedAgent === agent.id ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-sm text-gray-900 truncate">
                          {agent.display_name || agent.name}
                        </h5>
                      </div>
                      {agent.category && (
                        <span className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded mb-1">
                          {agent.category}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {agent.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddAgent(agent.id)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-gray-400">
                {selectedType ? "该类型下没有可用智能体" : "所有智能体已分配"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 筛选弹窗 */}
      <Modal
        title="筛选智能体"
        open={filterModalOpen}
        onOk={() => setFilterModalOpen(false)}
        onCancel={() => setFilterModalOpen(false)}
        footer={[
          <button
            key="reset"
            onClick={() => {
              setSelectedType(null);
              setFilterModalOpen(false);
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            重置
          </button>,
          <button
            key="ok"
            onClick={() => setFilterModalOpen(false)}
            className="px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded transition-colors ml-2"
          >
            确定
          </button>,
        ]}
      >
        <div className="py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            智能体类型
          </label>
          <Select
            value={selectedType}
            onChange={setSelectedType}
            placeholder="选择类型"
            allowClear
            className="w-full"
            options={allTypes.map(type => ({ label: type, value: type }))}
          />
        </div>
      </Modal>
    </div>
  );
}
