"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { App } from "antd";
import reportCenterService from "@/services/reportCenterService";
import type { MetricTrend } from "@/types/reportCenter";
import { SimpleLineChart } from "./SimpleLineChart";

interface MetricTrendsTabProps {
  patientId: number;
}

const statusLabel: Record<string, { text: string; color: string }> = {
  normal: { text: "正常", color: "bg-green-100 text-green-700" },
  abnormal: { text: "异常", color: "bg-red-100 text-red-700" },
  warning: { text: "偏高/偏低", color: "bg-yellow-100 text-yellow-700" },
};

function parseNormalRange(rangeStr?: string): { min: number; max: number } | undefined {
  if (!rangeStr) return undefined;
  // Try formats like "3.5-5.5", "3.5~5.5", "3.5 - 5.5"
  const match = rangeStr.match(/([\d.]+)\s*[-~]\s*([\d.]+)/);
  if (match) {
    return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
  }
  return undefined;
}

export function MetricTrendsTab({ patientId }: MetricTrendsTabProps) {
  const { message } = App.useApp();
  const [trends, setTrends] = useState<MetricTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "abnormal">("all");

  useEffect(() => {
    loadTrends();
  }, [patientId]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      const data = await reportCenterService.getMetricTrends(patientId);
      setTrends(data);
    } catch (error) {
      console.error("Failed to load trends:", error);
      message.error("加载指标趋势失败");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        加载指标趋势...
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        暂无可追踪的指标数据
      </div>
    );
  }

  const filteredTrends = filter === "abnormal"
    ? trends.filter((t) => t.current_status === "abnormal" || t.current_status === "warning")
    : trends;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-full text-sm border transition-colors ${
            filter === "all"
              ? "bg-[#EFF7F5] text-[#6E977B] border-[#A8C5B0]"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
          }`}
        >
          全部 ({trends.length})
        </button>
        <button
          onClick={() => setFilter("abnormal")}
          className={`px-4 py-2 rounded-full text-sm border transition-colors ${
            filter === "abnormal"
              ? "bg-[#EFF7F5] text-[#6E977B] border-[#A8C5B0]"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
          }`}
        >
          异常优先 ({trends.filter((t) => t.current_status !== "normal").length})
        </button>
      </div>

      {/* Metric cards */}
      {filteredTrends.map((trend) => {
        const status = statusLabel[trend.current_status] || statusLabel.normal;
        const normalRange = parseNormalRange(trend.normal_range);
        const chartData = trend.data_points.map((dp) => ({
          x: dp.date,
          y: dp.value,
          abnormal: dp.is_abnormal,
        }));

        return (
          <Card key={trend.metric_name}>
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{trend.metric_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                    {status.text}
                  </span>
                </div>
                {trend.normal_range && (
                  <span className="text-xs text-gray-400">
                    参考范围: {trend.normal_range} {trend.metric_unit}
                  </span>
                )}
              </div>

              {/* Chart */}
              <SimpleLineChart
                dataPoints={chartData}
                normalRange={normalRange}
                unit={trend.metric_unit}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
