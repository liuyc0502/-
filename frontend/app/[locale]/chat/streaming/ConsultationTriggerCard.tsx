"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, AlertCircle, Check, X, Loader2 } from "lucide-react";
import type { Agent } from "@/types/chat";
import { API_ENDPOINTS } from "@/services/api";
import { fetchWithAuth } from "@/lib/auth";

interface ConsultationTriggerCardProps {
  specialties: string[];
  reason: string;
  resolved: boolean;
  onConfirm: (question: string, agentIds: number[]) => void;
  onDismiss: () => void;
}

export default function ConsultationTriggerCard({
  specialties,
  reason,
  resolved,
  onConfirm,
  onDismiss,
}: ConsultationTriggerCardProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
  const [unmatchedSpecialties, setUnmatchedSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  // Fetch agents and match specialties
  useEffect(() => {
    if (resolved) return;
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.agent.list);
      if (response.ok) {
        const data = await response.json();
        const agentList: Agent[] = (data.agents || data || []).filter(
          (a: Agent) => a.is_available !== false
        );
        setAgents(agentList);

        // Match recommended specialties to agents
        const matched: number[] = [];
        const unmatched: string[] = [];

        for (const spec of specialties) {
          const specLower = spec.toLowerCase();
          const found = agentList.find(
            (a) =>
              a.display_name.toLowerCase().includes(specLower) ||
              specLower.includes(a.display_name.toLowerCase()) ||
              a.description.toLowerCase().includes(specLower) ||
              specLower.includes(a.description.toLowerCase())
          );
          if (found) {
            if (!matched.includes(found.agent_id)) {
              matched.push(found.agent_id);
            }
          } else {
            unmatched.push(spec);
          }
        }

        setSelectedAgentIds(matched);
        setUnmatchedSpecialties(unmatched);
      }
    } catch (e) {
      console.error("Failed to fetch agents:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAgent = (agentId: number) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleConfirm = useCallback(() => {
    if (selectedAgentIds.length < 2) return;
    onConfirm(reason, selectedAgentIds);
  }, [selectedAgentIds, reason, onConfirm]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss();
  }, [onDismiss]);

  // Resolved or dismissed state
  if (resolved || dismissed) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500 border border-gray-200">
        <Users size={14} />
        <span>{dismissed ? "已忽略会诊建议" : "已发起会诊"}</span>
      </div>
    );
  }

  return (
    <div className="border border-[#DA7756]/30 rounded-lg bg-[#DA7756]/5 overflow-hidden my-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#DA7756]/10 border-b border-[#DA7756]/20">
        <Users size={18} className="text-[#DA7756]" />
        <span className="font-medium text-[#DA7756]">AI 建议发起多专科会诊</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Reason */}
        <p className="text-sm text-gray-700">{reason}</p>

        {/* Agent selection */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={14} className="animate-spin" />
            <span>加载专科列表...</span>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-500 mb-1">
              推荐专科：{specialties.join("、")}（请选择至少 2 位专家）
            </div>
            <div className="space-y-1.5">
              {agents.map((agent) => (
                <label
                  key={agent.agent_id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedAgentIds.includes(agent.agent_id)}
                    onChange={() => handleToggleAgent(agent.agent_id)}
                    className="rounded border-gray-300 text-[#DA7756] focus:ring-[#DA7756]"
                  />
                  <span className="font-medium">{agent.display_name}</span>
                  {agent.description && (
                    <span className="text-gray-400">— {agent.description}</span>
                  )}
                </label>
              ))}
            </div>

            {/* Unmatched specialties warning */}
            {unmatchedSpecialties.length > 0 && (
              <div className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <span>未匹配到专科：{unmatchedSpecialties.join("、")}</span>
              </div>
            )}
          </>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={selectedAgentIds.length < 2 || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DA7756] text-white text-sm rounded-md hover:bg-[#c5664a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check size={14} />
            开始会诊
          </button>
          <button
            onClick={handleDismiss}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 text-sm rounded-md hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
            忽略
          </button>
        </div>
      </div>
    </div>
  );
}
