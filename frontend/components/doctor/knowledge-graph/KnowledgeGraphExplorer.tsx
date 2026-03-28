"use client";

import type { MouseEvent } from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Network,
  Search,
  User,
  History,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";
import { App, Select } from "antd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_ENDPOINTS } from "@/services/api";
import { fetchWithAuth } from "@/lib/auth";
import patientService from "@/services/patientService";
import type { KnowledgeGraphData } from "@/types/knowledgeGraph";

// Lazy-load heavy components
import dynamic from "next/dynamic";
const GraphViewer = dynamic(() => import("./GraphViewer"), { ssr: false });
const PredictionPanel = dynamic(() => import("./PredictionPanel"), { ssr: false });

interface HistoryItem {
  cache_id: string;
  query: string;
  node_count: number;
  edge_count: number;
  create_time: string | null;
}

interface PatientOption {
  patient_id: number;
  name: string;
}

// Node type color config used in detail panel badges
const nodeTypeColors: Record<string, string> = {
  Disease: "bg-[#F7E4DE] text-[#A74C40]",
  PathologicalFeature: "bg-[#F6E9C8] text-[#91691F]",
  Biomarker: "bg-[#DDE8F4] text-[#476A95]",
  Treatment: "bg-[#DCE8D8] text-[#54724F]",
  TestMethod: "bg-[#D6E7E2] text-[#417468]",
  Organ: "bg-[#D8E8EA] text-[#4A757E]",
  ClinicalStage: "bg-[#F4DFD1] text-[#A86635]",
};

const nodeTypeLabels: Record<string, string> = {
  Disease: "疾病",
  PathologicalFeature: "病理特征",
  Biomarker: "生物标志物",
  Treatment: "治疗方案",
  TestMethod: "检测方法",
  Organ: "器官",
  ClinicalStage: "临床分期",
};

const nodePropertyLabels: Record<string, string> = {
  description: "描述",
  confidence: "置信度",
  stage: "阶段",
  severity: "严重程度",
  source: "来源",
  evidence: "证据",
  category: "类别",
  marker: "标志物",
  value: "数值",
  unit: "单位",
  timeframe: "时间范围",
  clinical_significance: "临床意义",
};

function formatNodePropertyLabel(key: string) {
  if (nodePropertyLabels[key]) return nodePropertyLabels[key];
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function KnowledgeGraphExplorer() {
  const { message, modal } = App.useApp();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Graph data
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);

  // Patient selection
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingCacheId, setDeletingCacheId] = useState<string | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeAnchor, setSelectedNodeAnchor] = useState<{
    x: number;
    y: number;
    align: "left" | "right";
    viewportWidth: number;
    viewportHeight: number;
  } | null>(null);

  // Load patients and history on mount
  useEffect(() => {
    loadPatients();
    loadHistory();
  }, []);

  const loadPatients = async () => {
    try {
      const res = await patientService.listPatients({ limit: 100 });
      if (res.patients) {
        setPatients(
          res.patients.map((p: any) => ({
            patient_id: p.patient_id,
            name: p.name || `患者 ${p.patient_id}`,
          }))
        );
      }
    } catch {
      // Silent fail - patient list is optional
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ portal_type: "doctor" });
      const res = await fetchWithAuth(`${API_ENDPOINTS.knowledgeGraph.history}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.items || []);
      }
    } catch {
      // Silent fail
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setGraphData(null);
    setSelectedNodeId(null);
    setSelectedNodeAnchor(null);

    try {
      const res = await fetchWithAuth(API_ENDPOINTS.knowledgeGraph.generate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          patient_id: selectedPatientId,
          include_predictions: true,
          include_anomalies: true,
          portal_type: "doctor",
        }),
      });

      const data = await res.json();
      if (data.success && data.knowledge_graph) {
        setGraphData({
          card_type: "knowledge_graph",
          query: query.trim(),
          confidence: data.knowledge_graph.confidence || 0,
          nodes: data.knowledge_graph.nodes || [],
          edges: data.knowledge_graph.edges || [],
          patient_position: data.knowledge_graph.patient_position,
          predictions: data.knowledge_graph.predictions,
          anomalies: data.knowledge_graph.anomalies,
        });
        setActiveHistoryId(data.cache_id || data.knowledge_graph.cache_id || null);
        loadHistory(); // Refresh history
      } else {
        setError(data.error || "图谱生成失败");
      }
    } catch (e: any) {
      setError(e.message || "请求失败");
    } finally {
      setLoading(false);
    }
  }, [query, selectedPatientId]);

  const handleLoadHistory = useCallback(async (cacheId: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ portal_type: "doctor" });
      const res = await fetchWithAuth(
        `${API_ENDPOINTS.knowledgeGraph.historyDetail(cacheId)}?${params.toString()}`
      );
      const data = await res.json();
      if (data.success && data.knowledge_graph) {
        const kg = data.knowledge_graph;
        const parsed = typeof kg.subgraph_json === "string" ? JSON.parse(kg.subgraph_json) : kg.subgraph_json;
        setGraphData({
          card_type: "knowledge_graph",
          query: kg.query || "",
          confidence: parsed.confidence || 0,
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
          patient_position: parsed.patient_position,
          predictions: parsed.predictions,
          anomalies: parsed.anomalies,
        });
        setQuery(kg.query || "");
        setActiveHistoryId(cacheId);
        setSelectedNodeId(null);
        setSelectedNodeAnchor(null);
      } else {
        setError("加载历史记录失败");
      }
    } catch {
      setError("请求失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNodeClick = useCallback((nodeId: string, anchor?: {
    x: number;
    y: number;
    align: "left" | "right";
    viewportWidth: number;
    viewportHeight: number;
  }) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeAnchor(anchor ?? null);
  }, []);

  const handleDeleteHistory = useCallback(
    (item: HistoryItem, e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      modal.confirm({
        title: "删除历史记录",
        content: `确认删除“${item.query}”吗？`,
        okText: "删除",
        cancelText: "取消",
        okButtonProps: { danger: true },
        onOk: async () => {
          setDeletingCacheId(item.cache_id);
          try {
            const params = new URLSearchParams({ portal_type: "doctor" });
            const res = await fetchWithAuth(
              `${API_ENDPOINTS.knowledgeGraph.historyDelete(item.cache_id)}?${params.toString()}`,
              { method: "DELETE" }
            );

            if (!res.ok) {
              throw new Error("删除失败");
            }

            const remainingHistory = history.filter(
              (historyItem) => historyItem.cache_id !== item.cache_id
            );
            setHistory(remainingHistory);

            if (activeHistoryId === item.cache_id) {
              if (remainingHistory.length > 0) {
                await handleLoadHistory(remainingHistory[0].cache_id);
              } else {
                setActiveHistoryId(null);
                setGraphData(null);
                setSelectedNodeId(null);
              }
            }

            message.success("历史记录已删除");
          } catch (error) {
            console.error("Failed to delete graph history:", error);
            message.error("删除历史记录失败");
          } finally {
            setDeletingCacheId(null);
          }
        },
      });
    },
    [activeHistoryId, handleLoadHistory, history, message, modal]
  );

  const selectedNode = graphData?.nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeDescription =
    typeof selectedNode?.properties?.description === "string"
      ? selectedNode.properties.description
      : null;
  const selectedNodeProperties = selectedNode?.properties
    ? Object.entries(selectedNode.properties).filter(([key]) => key !== "description")
    : [];
  const selectedNodeOverlayStyle = selectedNodeAnchor
    ? {
        top: Math.max(
          16,
          Math.min(selectedNodeAnchor.y - 112, selectedNodeAnchor.viewportHeight - 280)
        ),
        left:
          selectedNodeAnchor.align === "right"
            ? Math.min(selectedNodeAnchor.x + 24, selectedNodeAnchor.viewportWidth - 336)
            : Math.max(16, selectedNodeAnchor.x - 328),
      }
    : null;

  return (
    <div className="relative flex h-full bg-app-surface">
      {/* Left Panel */}
      <div className="relative h-full flex-shrink-0">
       <div className="relative h-full w-72 border-r border-[#E7DCCF] bg-[#F8F3EA]">
          <div className="flex h-full flex-col p-4">
            <div className="flex min-h-0 w-64 flex-1 flex-col overflow-hidden rounded-2xl border border-[#E7E7E7] bg-white shadow-sm">
              {/* Search */}
              <div className="border-b border-[#EFEFEF] p-4">
                <label className="mb-2 block text-xs font-semibold tracking-[0.03em] text-[#111827]">
                  搜索查询
                </label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入疾病、症状或病理特征..."
                  className="h-11 border-[#E5E7EB] bg-white text-sm focus-visible:ring-[#DA7756]/20"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                />
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !query.trim()}
                  className="mt-3 h-11 w-full rounded-lg bg-[#DA7756] text-white hover:bg-[#C46B4D]"
                >
                  {loading ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Search size={14} className="mr-1" />
                  )}
                  生成知识图谱
                </Button>
              </div>

              {/* Patient Selector */}
              <div className="border-b border-[#EFEFEF] p-4">
                <label className="mb-2 block text-xs font-semibold tracking-[0.03em] text-[#111827]">
                  <User size={12} className="mr-1 inline" />
                  患者轨迹叠加
                </label>
                <Select
                  value={selectedPatientId ?? undefined}
                  onChange={(value) => setSelectedPatientId(value ?? null)}
                  placeholder="不选择患者"
                  allowClear
                  suffixIcon={<ChevronDown size={16} className="text-[#9CA3AF]" />}
                  popupMatchSelectWidth
                  popupClassName="kg-patient-select-dropdown"
                  options={patients.map((p) => ({
                    value: p.patient_id,
                    label: p.name,
                  }))}
                  className="w-full kg-patient-select"
                  size="large"
                />
              </div>

              {/* History */}
              <div className="flex min-h-0 flex-1 flex-col p-4">
                <div className="mb-3 flex items-center gap-1 text-xs font-semibold tracking-[0.03em] text-[#111827]">
                  <History size={12} />
                  历史记录
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {historyLoading ? (
                    <div className="py-4 text-center text-gray-400">
                      <Loader2 size={16} className="mx-auto animate-spin" />
                    </div>
                  ) : history.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">暂无历史记录</p>
                  ) : (
                    history.map((item) => {
                      const isActive = activeHistoryId === item.cache_id;
                      const isDeleting = deletingCacheId === item.cache_id;

                      return (
                        <div
                          key={item.cache_id}
                          className={`group relative overflow-hidden rounded-xl border transition-colors ${
                            isActive
                              ? "border-[#F0D3C0] bg-[#FFF6F0]"
                              : "border-transparent bg-white hover:border-[#E5E7EB] hover:bg-[#F9FAFB]"
                          }`}
                        >
                          <button
                            onClick={() => handleLoadHistory(item.cache_id)}
                            disabled={isDeleting}
                            className="w-full p-3 pr-11 text-left"
                          >
                            <p
                              className={`truncate text-sm font-medium ${
                                isActive
                                  ? "text-[#374151]"
                                  : "text-[#111827] group-hover:text-[#374151]"
                              }`}
                            >
                              {item.query}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {item.node_count} 节点 · {item.edge_count} 关系
                              {item.create_time && <> · {new Date(item.create_time).toLocaleDateString()}</>}
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteHistory(item, e)}
                            disabled={isDeleting}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] opacity-0 transition-all hover:bg-[#FCEAE8] hover:text-[#B65B54] group-hover:opacity-100 disabled:opacity-100"
                            aria-label={`删除历史记录 ${item.query}`}
                          >
                            {isDeleting ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Graph Area */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin text-[#DA7756]" />
                <p className="text-sm text-gray-500">正在生成知识图谱...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#E7E7E7] bg-white p-6 text-center shadow-sm">
                <AlertTriangle size={32} className="text-[#B87426]" />
                <p className="text-sm text-gray-700">{error}</p>
                <Button variant="outline" size="sm" onClick={() => setError(null)}>
                  关闭
                </Button>
              </div>
            </div>
          )}

          {graphData ? (
            <GraphViewer
              nodes={graphData.nodes}
              edges={graphData.edges}
              patientPosition={graphData.patient_position}
              predictions={graphData.predictions}
              anomalies={graphData.anomalies}
              onNodeClick={handleNodeClick}
              onPaneClick={() => {
                setSelectedNodeId(null);
                setSelectedNodeAnchor(null);
              }}
              className="h-full"
            />
          ) : (
            !loading &&
            !error && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Network size={48} className="mx-auto mb-3 text-[#D1D5DB]" />
                  <p className="text-sm">输入查询生成知识图谱</p>
                  <p className="text-xs mt-1">或从历史记录中选择</p>
                </div>
              </div>
            )
          )}

          {selectedNode && selectedNodeOverlayStyle && (
            <div
              className="absolute z-20 w-80 max-w-[calc(100%-2rem)] rounded-2xl border border-[#E7E7E7] bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
              style={selectedNodeOverlayStyle}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-[0.03em] text-[#9CA3AF]">节点详情</p>
                  <p className="mt-1 text-sm font-semibold text-[#111827] break-words">
                    {selectedNode.label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNodeId(null);
                    setSelectedNodeAnchor(null);
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#4B5563]"
                  aria-label="关闭节点详情"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    nodeTypeColors[selectedNode.type] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {nodeTypeLabels[selectedNode.type] || selectedNode.type}
                </span>
                {selectedNode.isPatientPosition && (
                  <span className="rounded-full bg-[#FFF3EA] px-2 py-0.5 text-xs font-medium text-[#C06E4E]">
                    当前患者位置
                  </span>
                )}
                {selectedNode.isAnomaly && (
                  <span className="rounded-full bg-[#FCEAE8] px-2 py-0.5 text-xs font-medium text-[#B65B54]">
                    检测到异常
                  </span>
                )}
              </div>

              {selectedNodeDescription && (
                <div className="mt-3 rounded-xl border border-[#F0E1D9] bg-[#FEF7F4] px-3 py-2.5">
                  <p className="text-[11px] font-semibold tracking-[0.03em] text-[#C07054]">描述</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#5B4A42] break-words">
                    {selectedNodeDescription}
                  </p>
                </div>
              )}

              {selectedNodeProperties.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {selectedNodeProperties.slice(0, 6).map(([key, val]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-[#EEF0F3] bg-[#FCFCFC] px-3 py-2"
                    >
                      <p className="text-[11px] font-semibold text-[#94A3B8]">
                        {formatNodePropertyLabel(key)}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[#4B5563] break-words">
                        {String(val)}
                      </p>
                    </div>
                  ))}
                  {selectedNodeProperties.length > 6 && (
                    <p className="text-[11px] text-[#9CA3AF]">
                      还有 {selectedNodeProperties.length - 6} 项属性未展示
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Panel */}
        {graphData && (
          <div className="relative border-t border-[#E7E7E7] bg-white px-4 py-3">
            <PredictionPanel
              predictions={graphData.predictions}
              anomalies={graphData.anomalies}
              onNodeHighlight={(nodeId) => handleNodeClick(nodeId)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeGraphExplorer;
