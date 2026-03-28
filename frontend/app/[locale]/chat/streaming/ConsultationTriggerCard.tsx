"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, AlertCircle, Check, X, Loader2 } from "lucide-react";
import type { Agent } from "@/types/chat";
import { API_ENDPOINTS } from "@/services/api";
import { fetchWithAuth } from "@/lib/auth";
import { cardSurface, consultationCardTheme } from "./cardTheme";

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
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${cardSurface.softBg} ${cardSurface.textSecondary} ${cardSurface.baseBorder}`}>
        <Users size={14} />
        <span>{dismissed ? "已忽略会诊建议" : "已发起会诊"}</span>
      </div>
    );
  }

  return (
    <div className={`my-2 overflow-hidden rounded-lg border bg-white ${consultationCardTheme.border}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 border-b px-4 py-3 ${cardSurface.headerBorder} ${consultationCardTheme.headerBg}`}>
        <Users size={18} className={consultationCardTheme.accent} />
        <span className={`font-medium ${consultationCardTheme.headerText}`}>AI 建议发起多专科会诊</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Reason */}
        <p className={`text-sm ${cardSurface.textPrimary}`}>{reason}</p>

        {/* Agent selection */}
        {loading ? (
          <div className={`flex items-center gap-2 text-sm ${cardSurface.textSecondary}`}>
            <Loader2 size={14} className="animate-spin" />
            <span>加载专科列表...</span>
          </div>
        ) : (
          <>
            <div className={`mb-1 text-xs ${cardSurface.textSecondary}`}>
              推荐专科：{specialties.join("、")}（请选择至少 2 位专家）
            </div>
            <div className="space-y-1.5">
              {agents.map((agent) => (
                <label
                  key={agent.agent_id}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm ${cardSurface.hoverSoftBg}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAgentIds.includes(agent.agent_id)}
                    onChange={() => handleToggleAgent(agent.agent_id)}
                    className="rounded border-gray-300 text-[#DA7756] focus:ring-[#DA7756]"
                  />
                  <span className={`font-medium ${cardSurface.textPrimary}`}>{agent.display_name}</span>
                  {agent.description && (
                    <span className={cardSurface.textMuted}>— {agent.description}</span>
                  )}
                </label>
              ))}
            </div>

            {/* Unmatched specialties warning */}
            {unmatchedSpecialties.length > 0 && (
              <div className={`flex items-start gap-1.5 rounded px-2 py-1.5 text-xs ${consultationCardTheme.warningBg} ${consultationCardTheme.warningText}`}>
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
            className="flex items-center gap-1.5 rounded-md bg-[#DA7756] px-3 py-1.5 text-sm text-white transition-colors hover:bg-[#C46B4D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={14} />
            开始会诊
          </button>
          <button
            onClick={handleDismiss}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${cardSurface.textSecondary} ${cardSurface.hoverSoftBg}`}
          >
            <X size={14} />
            忽略
          </button>
        </div>
      </div>
    </div>
  );
}
