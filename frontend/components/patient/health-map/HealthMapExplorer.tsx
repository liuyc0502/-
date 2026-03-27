"use client";

import { useEffect, useState } from "react";
import {
  Map,
  MapPin,
  Activity,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { API_ENDPOINTS } from "@/services/api";
import { fetchWithAuth } from "@/lib/auth";
import type { PatientHealthMapData, HealthMapEvent } from "@/types/healthMap";
import { PATIENT_ACCENT, PATIENT_GREEN } from "./constants";
import JourneyPathSVG from "./JourneyPathSVG";

interface HistoryItem {
  cache_id: string;
  query: string;
  node_count: number;
  edge_count: number;
  create_time: string | null;
}

interface EmptyStateContent {
  title: string;
  description: string;
}

function likelihoodColor(likelihood: string): string {
  if (likelihood === "较大可能") return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (likelihood === "有一定可能") return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-gray-500 bg-gray-50 border-gray-200";
}

function alertSeverityColor(severity: string): string {
  if (severity === "important") return "border-red-200";
  if (severity === "attention") return "border-amber-200";
  return `border-[${PATIENT_GREEN}20]`;
}

function alertSeverityTextColor(severity: string): string {
  if (severity === "important") return "text-red-600";
  if (severity === "attention") return "text-amber-600";
  return "text-blue-600";
}

function normalizeHealthMap(payload: any): PatientHealthMapData | null {
  if (!payload) return null;
  // Handle cached data where subgraph_json may be a string
  const parsed =
    typeof payload.subgraph_json === "string"
      ? JSON.parse(payload.subgraph_json)
      : payload.subgraph_json || payload;

  // New v2 format
  if (parsed.card_type === "patient_health_map") {
    return parsed as PatientHealthMapData;
  }

  return null;
}

function buildHistoryLabel(item: HistoryItem, index: number): string {
  if (index === 0) return "最近一次";
  if (!item.create_time) return `较早一次 ${index}`;
  return new Date(item.create_time).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HealthMapExplorer() {
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState<PatientHealthMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandExplanation, setExpandExplanation] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [emptyState, setEmptyState] = useState<EmptyStateContent>({
    title: "暂无健康旅程数据",
    description: "暂无可生成的健康资料",
  });

  useEffect(() => {
    void loadLatestMap();
  }, []);

  const fetchPatientHistory = async (): Promise<HistoryItem[]> => {
    const params = new URLSearchParams({
      portal_type: "patient",
      limit: "5",
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.knowledgeGraph.history}?${params.toString()}`);
    if (!res.ok) {
      throw new Error("无法加载健康地图数据");
    }
    const data = await res.json();
    return data.items || [];
  };

  const loadMap = async (cacheId: string, manageLoading = true) => {
    if (manageLoading) {
      setLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams({ portal_type: "patient" });
      const res = await fetchWithAuth(
        `${API_ENDPOINTS.knowledgeGraph.historyDetail(cacheId)}?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error("加载健康地图失败");
      }

      const data = await res.json();
      // Support both new (health_map) and legacy (knowledge_graph) response keys
      const payload = data.health_map || data.knowledge_graph;
      if (!data.success || !payload) {
        throw new Error("加载健康地图失败");
      }

      const normalized = normalizeHealthMap(payload);
      if (!normalized) {
        // Old format cached data — trigger regeneration
        await generatePatientMap();
        return;
      }

      setMapData(normalized);
      setError(null);
      setEmptyState({
        title: "暂无健康旅程数据",
        description: "暂无可生成的健康资料",
      });
    } catch (e: any) {
      setError(e.message || "加载健康地图失败");
      setMapData(null);
      setEmptyState({
        title: "暂时无法生成健康地图",
        description: "请稍后再试，或先完善患者诊疗资料。",
      });
    } finally {
      if (manageLoading) {
        setLoading(false);
      }
    }
  };

  const generatePatientMap = async () => {
    const res = await fetchWithAuth(API_ENDPOINTS.knowledgeGraph.patientMapGenerate, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error("暂时无法生成健康地图");
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "暂时无法生成健康地图");
    }

    if (!data.generated || !data.health_map) {
      setMapData(null);
      setHistoryItems([]);
      setError(null);
      setEmptyState({
        title: "暂无健康旅程数据",
        description: data.message || "暂无可生成的健康资料",
      });
      return;
    }

    setMapData(data.health_map as PatientHealthMapData);
    setError(null);
    setEmptyState({
      title: "暂无健康旅程数据",
      description: "暂无可生成的健康资料",
    });
    const items = await fetchPatientHistory().catch(() => []);
    setHistoryItems(items);
  };

  const loadLatestMap = async () => {
    setLoading(true);
    setError(null);
    setMapData(null);

    try {
      const items = await fetchPatientHistory();
      setHistoryItems(items);

      if (items.length > 0) {
        await loadMap(items[0].cache_id, false);
      } else {
        await generatePatientMap();
      }
    } catch (e: any) {
      setError(e.message || "无法加载健康地图数据");
      setEmptyState({
        title: "暂时无法生成健康地图",
        description: "请稍后再试，或先完善患者诊疗资料。",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: PATIENT_GREEN }} />
          <p className="text-sm text-gray-500">正在加载您的健康旅程...</p>
        </div>
      </div>
    );
  }

  if (!mapData || mapData.events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <Map size={48} className="mx-auto mb-3" style={{ color: `${PATIENT_GREEN}60` }} />
          <p className="text-gray-600 font-medium">{emptyState.title}</p>
          <p className="text-sm text-gray-400 mt-1">{emptyState.description}</p>
          {error && <p className="text-xs text-amber-600 mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  // Derive view-model from health map data
  const journeyEvents = mapData.events;
  const testEvents = mapData.events.filter(
    (e) => e.stage_type === "检查" || e.metrics.length > 0
  );
  const treatmentEvents = mapData.events.filter(
    (e) => e.stage_type === "治疗" || e.medications.length > 0
  );
  const progressPercent = Math.round(mapData.journey_progress * 100);

  return (
    <div className="h-full flex flex-col bg-app-surface overflow-hidden">
      <div className="bg-app-surface border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between min-h-[104px]">
          <h1 className="text-2xl font-bold text-gray-900">您的健康旅程</h1>
          <div aria-hidden="true" className="h-14 w-[320px] shrink-0 rounded-xl opacity-0" />
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{ background: `linear-gradient(to bottom, ${PATIENT_GREEN}08, white)` }}
      >
        <div className="w-full max-w-7xl mx-auto px-8 py-5 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-white px-5 py-4 shadow-sm"
            style={{ borderColor: `${PATIENT_GREEN}20` }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${PATIENT_GREEN}12` }}
              >
                <Map size={22} style={{ color: PATIENT_GREEN }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-800">了解您的健康状况与诊疗历程</p>
                <p className="text-sm text-gray-500 mt-1">
                  {mapData.overall_summary ||
                    "这里会按时间和阶段展示您的诊疗路径、检查项目和后续可能变化。"}
                </p>
              </div>
            </div>
          </motion.div>

          {journeyEvents.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <span className="text-xs text-gray-400">旅程进度</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%`, backgroundColor: PATIENT_GREEN }}
                />
              </div>
              <span className="text-xs font-medium" style={{ color: PATIENT_GREEN }}>
                {progressPercent}%
              </span>
            </motion.div>
          )}

          {journeyEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border shadow-sm p-6 overflow-hidden"
              style={{ borderColor: `${PATIENT_GREEN}20` }}
            >
              <h3
                className="text-sm font-semibold mb-5 flex items-center gap-2"
                style={{ color: PATIENT_GREEN }}
              >
                <MapPin size={14} />
                健康旅程地图
              </h3>
              <JourneyPathSVG
                events={journeyEvents}
                size="full"
                animate
              />
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {testEvents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-2xl shadow-sm p-5 border"
                style={{ borderColor: `${PATIENT_GREEN}20` }}
              >
                <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Sparkles size={14} />
                  检查项目
                </h3>
                <div className="space-y-2">
                  {testEvents.map((event) => (
                    <div key={event.event_id} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 size={14} className="text-blue-400 shrink-0" />
                      <span>{event.title}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {treatmentEvents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-sm p-5 border"
                style={{ borderColor: `${PATIENT_GREEN}20` }}
              >
                <h3
                  className="text-sm font-semibold mb-3 flex items-center gap-2"
                  style={{ color: PATIENT_GREEN }}
                >
                  <Stethoscope size={14} />
                  治疗方案
                </h3>
                <div className="space-y-2">
                  {treatmentEvents.map((event) => (
                    <div key={event.event_id} className="flex items-center gap-2 text-sm text-gray-700">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: PATIENT_GREEN }}
                      />
                      <span>{event.title}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {mapData.predictions && mapData.predictions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-white rounded-2xl shadow-sm p-5 border"
                style={{ borderColor: `${PATIENT_GREEN}20` }}
              >
                <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                  <Activity size={14} />
                  接下来可能...
                </h3>
                <div className="space-y-2.5">
                  {mapData.predictions.slice(0, 3).map((pred, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 border ${likelihoodColor(pred.likelihood)}`}
                      >
                        {pred.likelihood}
                      </span>
                      <div>
                        <p className="text-sm text-gray-700">{pred.description}</p>
                        {pred.timeframe && (
                          <p className="text-xs text-gray-400 mt-0.5">{pred.timeframe}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {mapData.alerts && mapData.alerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl shadow-sm p-5 border border-amber-200"
              >
                <h3 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
                  <AlertCircle size={14} />
                  需要关注
                </h3>
                <div className="space-y-2">
                  {mapData.alerts.map((alert, index) => (
                    <div key={index}>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      {alert.action && (
                        <p className="text-xs text-gray-400 mt-0.5">{alert.action}</p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <button
            onClick={() => setExpandExplanation(!expandExplanation)}
            className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
          >
            这意味着什么?
            {expandExplanation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-2xl p-5 text-sm text-gray-600 leading-relaxed"
              style={{ backgroundColor: `${PATIENT_GREEN}08` }}
            >
              <p>
                这张健康旅程图展示了您的诊疗历程。
                <strong className="text-gray-700">实心圆点</strong>代表您经历的关键节点，
                <strong style={{ color: PATIENT_ACCENT }}>橙色标记</strong>
                表示您当前所在的阶段，
                <strong className="text-gray-700">虚线圆点</strong>
                代表待进行的诊疗步骤。
              </p>
              <p className="mt-2">
                如果有"接下来可能..."的提示，那是基于您的诊疗历程做出的参考预测，
                具体情况请以主治医生的诊断为准。如有任何疑问，建议随时与医生沟通。
              </p>
            </motion.div>
          )}

          {historyItems.length > 1 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-2">其他健康旅程</p>
              <div className="flex gap-2 flex-wrap">
                {historyItems.slice(1).map((item, index) => (
                  <button
                    key={item.cache_id}
                    onClick={() => void loadMap(item.cache_id)}
                    className="text-xs px-3 py-1.5 rounded-full border text-gray-600 transition-colors hover:shadow-sm"
                    style={{ borderColor: `${PATIENT_GREEN}30` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${PATIENT_GREEN}10`;
                      e.currentTarget.style.borderColor = `${PATIENT_GREEN}60`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "";
                      e.currentTarget.style.borderColor = `${PATIENT_GREEN}30`;
                    }}
                  >
                    {buildHistoryLabel(item, index + 1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HealthMapExplorer;
