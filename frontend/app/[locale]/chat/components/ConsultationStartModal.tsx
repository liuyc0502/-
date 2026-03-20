"use client";

import { useState, useEffect } from "react";
import { Modal, Checkbox, Input } from "antd";
import { Users, Brain } from "lucide-react";
import type { Agent } from "@/types/chat";
import { API_ENDPOINTS } from "@/services/api";
import { fetchWithAuth } from "@/lib/auth";

interface ConsultationStartModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: (question: string, agentIds: number[]) => void;
}

export default function ConsultationStartModal({
  visible,
  onClose,
  onStart,
}: ConsultationStartModalProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch agent list when modal opens
  useEffect(() => {
    if (visible) {
      fetchAgents();
    }
  }, [visible]);

  const fetchAgents = async () => {
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.agent.list);
      if (response.ok) {
        const data = await response.json();
        const agentList = data.agents || data || [];
        setAgents(agentList.filter((a: Agent) => a.is_available !== false));
      }
    } catch (e) {
      console.error("Failed to fetch agents:", e);
    }
  };

  const handleToggleAgent = (agentId: number) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleStart = () => {
    if (selectedAgentIds.length < 2) return;
    if (!question.trim()) return;
    onStart(question.trim(), selectedAgentIds);
    // Reset state
    setSelectedAgentIds([]);
    setQuestion("");
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[#DA7756]" />
          <span>发起多学科会诊</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleStart}
      okText="开始会诊"
      cancelText="取消"
      okButtonProps={{
        disabled: selectedAgentIds.length < 2 || !question.trim(),
      }}
      width={520}
      centered
    >
      <div className="space-y-4 py-2">
        {/* Question input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            会诊问题
          </label>
          <Input.TextArea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="请输入需要多学科会诊的问题..."
            rows={3}
            maxLength={2000}
          />
        </div>

        {/* Agent selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择参与会诊的专科智能体
            <span className="text-xs text-gray-400 ml-2">
              (至少选择 2 个)
            </span>
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {agents.map((agent) => (
              <div
                key={agent.agent_id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  selectedAgentIds.includes(agent.agent_id)
                    ? "border-[#DA7756]/40 bg-[#DA7756]/5"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
                onClick={() => handleToggleAgent(agent.agent_id)}
              >
                <Checkbox
                  checked={selectedAgentIds.includes(agent.agent_id)}
                  onChange={() => handleToggleAgent(agent.agent_id)}
                />
                <Brain size={16} className="text-[#DA7756] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">
                    {agent.display_name || agent.name}
                  </div>
                  {agent.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {agent.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {agents.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-4">
                暂无可用的智能体
              </div>
            )}
          </div>
        </div>

        {selectedAgentIds.length > 0 && selectedAgentIds.length < 2 && (
          <p className="text-xs text-amber-600">
            请至少选择 2 个智能体参与会诊
          </p>
        )}
      </div>
    </Modal>
  );
}
