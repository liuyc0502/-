"use client";

import { useState, useRef, useCallback } from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush,
  ResponsiveContainer,
} from "recharts";
import { Maximize2, Minimize2, Download, BarChart3, TrendingUp, PieChart as PieIcon } from "lucide-react";
import { Modal } from "antd";
import { exportToPdf } from "@/lib/exportPdf";

interface ChartSpec {
  chart_type: "bar" | "line" | "area" | "pie" | "radar";
  title: string;
  data: Record<string, any>[];
  xKey: string;
  yKeys: string[];
  yLabels?: string[];
  unit?: string;
  description?: string;
}

const COLORS = [
  "#DA7756", "#5B8DEF", "#50C878", "#FFB347", "#9B59B6",
  "#E74C3C", "#1ABC9C", "#F39C12", "#3498DB", "#2ECC71",
];

// Chart type switching options (only for bar/line/area which are interchangeable)
const SWITCHABLE_TYPES = ["bar", "line", "area"] as const;
type SwitchableType = typeof SWITCHABLE_TYPES[number];

export default function InteractiveChart({ spec }: { spec: ChartSpec }) {
  const [chartType, setChartType] = useState<string>(spec.chart_type);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const isSwitchable = SWITCHABLE_TYPES.includes(spec.chart_type as SwitchableType);
  const yLabels = spec.yLabels || spec.yKeys;

  const toggleKey = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const visibleYKeys = spec.yKeys.filter((k) => !hiddenKeys.has(k));

  const handleExportPng = async () => {
    if (!chartContainerRef.current) return;
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const canvas = await html2pdf()
        .set({ html2canvas: { scale: 2, useCORS: true } })
        .from(chartContainerRef.current)
        .toCanvas();
      const link = document.createElement("a");
      link.download = `${spec.title || "chart"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Export PNG failed:", e);
    }
  };

  const handleExportPdf = async () => {
    if (!chartContainerRef.current) return;
    await exportToPdf(chartContainerRef.current, `${spec.title || "chart"}.pdf`);
  };

  const renderChart = (width: number, height: number) => {
    const tooltipFormatter = (value: number) =>
      spec.unit ? `${value} ${spec.unit}` : `${value}`;

    if (chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={spec.data}
              dataKey={spec.yKeys[0]}
              nameKey={spec.xKey}
              cx="50%"
              cy="50%"
              outerRadius={height * 0.35}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {spec.data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipFormatter} />
            <Legend onClick={(e) => toggleKey(String(e.value))} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "radar") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={spec.data}>
            <PolarGrid />
            <PolarAngleAxis dataKey={spec.xKey} tick={{ fontSize: 12 }} />
            <PolarRadiusAxis />
            {visibleYKeys.map((key, idx) => (
              <Radar
                key={key}
                name={yLabels[spec.yKeys.indexOf(key)] || key}
                dataKey={key}
                stroke={COLORS[idx % COLORS.length]}
                fill={COLORS[idx % COLORS.length]}
                fillOpacity={0.2}
              />
            ))}
            <Tooltip formatter={tooltipFormatter} />
            <Legend onClick={(e) => toggleKey(String(e.dataKey))} />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    // Bar / Line / Area
    const ChartComponent = chartType === "bar" ? BarChart : chartType === "area" ? AreaChart : LineChart;
    const showBrush = spec.data.length > 10;

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={spec.xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit={spec.unit ? ` ${spec.unit}` : undefined} />
          <Tooltip formatter={tooltipFormatter} />
          <Legend
            onClick={(e) => toggleKey(String(e.dataKey))}
            wrapperStyle={{ cursor: "pointer" }}
          />
          {visibleYKeys.map((key, idx) => {
            const color = COLORS[idx % COLORS.length];
            const label = yLabels[spec.yKeys.indexOf(key)] || key;
            if (chartType === "bar") {
              return <Bar key={key} dataKey={key} name={label} fill={color} radius={[2, 2, 0, 0]} />;
            } else if (chartType === "area") {
              return <Area key={key} dataKey={key} name={label} stroke={color} fill={color} fillOpacity={0.15} />;
            } else {
              return <Line key={key} dataKey={key} name={label} stroke={color} strokeWidth={2} dot={{ r: 3 }} />;
            }
          })}
          {showBrush && <Brush dataKey={spec.xKey} height={20} stroke="#DA7756" />}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  const chartContent = (height: number) => (
    <div ref={chartContainerRef}>
      {/* Title bar */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-800">{spec.title}</h4>
        <div className="flex items-center gap-1">
          {/* Type switching buttons */}
          {isSwitchable && (
            <div className="flex items-center gap-0.5 mr-2 bg-gray-100 rounded-md p-0.5">
              <button
                onClick={() => setChartType("bar")}
                className={`p-1 rounded ${chartType === "bar" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
                title="柱状图"
              >
                <BarChart3 size={12} />
              </button>
              <button
                onClick={() => setChartType("line")}
                className={`p-1 rounded ${chartType === "line" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
                title="折线图"
              >
                <TrendingUp size={12} />
              </button>
              <button
                onClick={() => setChartType("area")}
                className={`p-1 rounded ${chartType === "area" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
                title="面积图"
              >
                <PieIcon size={12} />
              </button>
            </div>
          )}
          {!isFullscreen && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="全屏查看"
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      {renderChart(0, height)}

      {/* Description */}
      {spec.description && (
        <p className="text-xs text-gray-500 mt-2">{spec.description}</p>
      )}
    </div>
  );

  return (
    <>
      {/* Inline chart */}
      <div className="my-3 p-3 bg-white border border-gray-200 rounded-lg">
        {chartContent(240)}
      </div>

      {/* Fullscreen modal */}
      <Modal
        open={isFullscreen}
        onCancel={() => setIsFullscreen(false)}
        footer={null}
        width="90vw"
        centered
        title={
          <div className="flex items-center justify-between pr-8">
            <span>{spec.title}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPng}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded"
              >
                <Download size={12} /> PNG
              </button>
              <button
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded"
              >
                <Download size={12} /> PDF
              </button>
            </div>
          </div>
        }
      >
        <div className="py-4">
          {chartContent(480)}
        </div>
      </Modal>
    </>
  );
}
