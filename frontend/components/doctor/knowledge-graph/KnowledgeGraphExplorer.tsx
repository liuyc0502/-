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
  Disease: "bg-[#E8C3B8] text-[#83382D]",
  PathologicalFeature: "bg-[#E8D19B] text-[#7D5815]",
  Biomarker: "bg-[#C1D2E4] text-[#34567C]",
  Treatment: "bg-[#C3D8BE] text-[#42623C]",
  TestMethod: "bg-[#B8D2C8] text-[#2F6155]",
  Organ: "bg-[#BCD3D6] text-[#346168]",
  ClinicalStage: "bg-[#E7C8B0] text-[#874A20]",
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
      } else {
        setError("加载历史记录失败");
      }
    } catch {
      setError("请求失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
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

  return (
    <div className="relative flex h-full bg-app-surface">
      {/* Left Panel */}
      <div className="relative h-full flex-shrink-0">
        <div className="relative h-full w-72 border-r border-[#E7DCCF] bg-[#F8F3EA]">
          <div className="flex h-full flex-col p-4">
            <div className="flex min-h-0 w-64 flex-1 flex-col overflow-hidden rounded-2xl border border-[#E8DDCF] bg-[#FBF7F1] shadow-sm">
              {/* Search */}
              <div className="border-b border-[#EDE2D4] p-4">
                <label className="mb-2 block text-xs font-semibold tracking-[0.03em] text-[#2E251D]">
                  搜索查询
                </label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入疾病、症状或病理特征..."
                  className="h-11 border-[#E5D9C8] bg-white text-sm focus-visible:ring-[#DA7756]/20"
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
              <div className="border-b border-[#EDE2D4] p-4">
                <label className="mb-2 block text-xs font-semibold tracking-[0.03em] text-[#2E251D]">
                  <User size={12} className="mr-1 inline" />
                  患者轨迹叠加
                </label>
                <Select
                  value={selectedPatientId ?? undefined}
                  onChange={(value) => setSelectedPatientId(value ?? null)}
                  placeholder="不选择患者"
                  allowClear
                  suffixIcon={<ChevronDown size={16} className="text-[#7E6A54]" />}
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
                <div className="mb-3 flex items-center gap-1 text-xs font-semibold tracking-[0.03em] text-[#2E251D]">
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
                              ? "border-[#D8C8B6] bg-[#F7F1E7]"
                              : "border-transparent bg-white hover:border-[#E8DDCF] hover:bg-[#F7F1E7]"
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
                                  ? "text-[#8C4E39]"
                                  : "text-[#2E251D] group-hover:text-[#8C4E39]"
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
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-[#B08F75] opacity-0 transition-all hover:bg-[#F1E5D8] hover:text-[#9C5A45] group-hover:opacity-100 disabled:opacity-100"
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
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#FCFAF7]/90">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin text-[#DA7756]" />
                <p className="text-sm text-gray-500">正在生成知识图谱...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#E7DCCF] bg-white p-6 text-center shadow-sm">
                <AlertTriangle size={32} className="text-amber-500" />
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
              className="h-full"
            />
          ) : (
            !loading &&
            !error && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Network size={48} className="mx-auto mb-3 text-[#C7B39D]" />
                  <p className="text-sm">输入查询生成知识图谱</p>
                  <p className="text-xs mt-1">或从历史记录中选择</p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Bottom Panel */}
        {graphData && (
          <div className="border-t border-[#E7DCCF] bg-[#FCFAF7]">
            {/* Node Detail + Predictions */}
            <div className="flex">
              {/* Node Detail */}
              {selectedNode && (
                <div className="w-64 border-r border-[#DDCFBD] bg-[#F5EDE1] p-4">
                  <p className="mb-1 text-xs font-semibold tracking-[0.03em] text-[#8E7962]">节点详情</p>
                  <p className="text-sm font-semibold text-[#332922]">{selectedNode.label}</p>
                  <span
                    className={`mt-2 inline-block rounded px-1.5 py-0.5 text-xs ${
                      nodeTypeColors[selectedNode.type] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {nodeTypeLabels[selectedNode.type] || selectedNode.type}
                  </span>
                  {selectedNode.isPatientPosition && (
                    <p className="text-xs text-[#DA7756] mt-1 font-medium">当前患者位置</p>
                  )}
                  {selectedNode.isAnomaly && (
                    <p className="text-xs text-red-600 mt-1 font-medium">检测到异常</p>
                  )}
                  {selectedNode.properties &&
                    Object.entries(selectedNode.properties).map(([key, val]) => (
                      <p key={key} className="text-xs text-gray-500 mt-0.5">
                        {key}: {String(val)}
                      </p>
                    ))}
                </div>
              )}

              {/* Prediction Panel */}
              <div className="flex-1 max-h-52 overflow-y-auto">
                <PredictionPanel
                  predictions={graphData.predictions}
                  anomalies={graphData.anomalies}
                  onNodeHighlight={handleNodeClick}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeGraphExplorer;
