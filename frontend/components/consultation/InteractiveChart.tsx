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
import { Maximize2, Download, BarChart3, TrendingUp, PieChart as PieIcon } from "lucide-react";
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

const SERIES_COLORS = [
  "#DA7756",
  "#4D79CB",
  "#4A8B69",
  "#B87426",
  "#C98E74",
  "#7A98D8",
  "#6C9E7C",
  "#D2A55A",
];
const PANEL_BORDER = "#E7DDD1";
const PANEL_BG = "#FEFBF7";
const PANEL_SOFT_BG = "#FBF7F1";
const TEXT_PRIMARY = "#41362D";
const TEXT_SECONDARY = "#6B5E54";
const TEXT_MUTED = "#9B8E82";
const GRID_COLOR = "#EDE3D7";
const AXIS_COLOR = "#C8BAAC";
const TOOLTIP_BG = "#FFFDF9";
const TOOLTIP_BORDER = "#E7DDD1";
const ACTIVE_ACCENT = "#DA7756";

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
  const getSeriesColor = useCallback((idx: number) => SERIES_COLORS[idx % SERIES_COLORS.length], []);

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
    const tooltipContentStyle = {
      backgroundColor: TOOLTIP_BG,
      border: `1px solid ${TOOLTIP_BORDER}`,
      borderRadius: "12px",
      boxShadow: "0 10px 28px rgba(65, 54, 45, 0.08)",
      color: TEXT_PRIMARY,
    };
    const tooltipLabelStyle = { color: TEXT_PRIMARY, fontWeight: 600 };
    const tooltipItemStyle = { color: TEXT_SECONDARY };
    const legendWrapperStyle = { cursor: "pointer", color: TEXT_SECONDARY, paddingTop: 8 };

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
                <Cell key={idx} fill={getSeriesColor(idx)} />
              ))}
            </Pie>
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
            />
            <Legend onClick={(e) => toggleKey(String(e.value))} wrapperStyle={legendWrapperStyle} />
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
                stroke={getSeriesColor(idx)}
                fill={getSeriesColor(idx)}
                fillOpacity={0.12}
                strokeWidth={2}
              />
            ))}
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
            />
            <Legend onClick={(e) => toggleKey(String(e.dataKey))} wrapperStyle={legendWrapperStyle} />
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
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis
            dataKey={spec.xKey}
            tick={{ fontSize: 12, fill: TEXT_SECONDARY }}
            stroke={AXIS_COLOR}
            tickLine={{ stroke: AXIS_COLOR }}
            axisLine={{ stroke: AXIS_COLOR }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: TEXT_SECONDARY }}
            stroke={AXIS_COLOR}
            tickLine={{ stroke: AXIS_COLOR }}
            axisLine={{ stroke: AXIS_COLOR }}
            unit={spec.unit ? ` ${spec.unit}` : undefined}
          />
          <Tooltip
            formatter={tooltipFormatter}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
          <Legend
            onClick={(e) => toggleKey(String(e.dataKey))}
            wrapperStyle={legendWrapperStyle}
          />
          {visibleYKeys.map((key, idx) => {
            const color = getSeriesColor(idx);
            const label = yLabels[spec.yKeys.indexOf(key)] || key;
            if (chartType === "bar") {
              return <Bar key={key} dataKey={key} name={label} fill={color} radius={[2, 2, 0, 0]} />;
            } else if (chartType === "area") {
              return <Area key={key} dataKey={key} name={label} stroke={color} fill={color} fillOpacity={0.14} strokeWidth={2} />;
            } else {
              return <Line key={key} dataKey={key} name={label} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color, strokeWidth: 0 }} />;
            }
          })}
          {showBrush && (
            <Brush
              dataKey={spec.xKey}
              height={20}
              stroke={ACTIVE_ACCENT}
              travellerWidth={10}
              fill={PANEL_SOFT_BG}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  const chartContent = (height: number) => (
    <div ref={chartContainerRef}>
      {/* Title bar */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>{spec.title}</h4>
        <div className="flex items-center gap-1">
          {/* Type switching buttons */}
          {isSwitchable && (
            <div className="mr-2 flex items-center gap-0.5 rounded-md p-0.5" style={{ backgroundColor: PANEL_SOFT_BG }}>
              <button
                onClick={() => setChartType("bar")}
                className="rounded p-1 transition-colors"
                style={chartType === "bar" ? { backgroundColor: "#FFFFFF", color: ACTIVE_ACCENT, boxShadow: "0 1px 2px rgba(65, 54, 45, 0.08)" } : { color: TEXT_SECONDARY }}
                title="柱状图"
              >
                <BarChart3 size={12} />
              </button>
              <button
                onClick={() => setChartType("line")}
                className="rounded p-1 transition-colors"
                style={chartType === "line" ? { backgroundColor: "#FFFFFF", color: ACTIVE_ACCENT, boxShadow: "0 1px 2px rgba(65, 54, 45, 0.08)" } : { color: TEXT_SECONDARY }}
                title="折线图"
              >
                <TrendingUp size={12} />
              </button>
              <button
                onClick={() => setChartType("area")}
                className="rounded p-1 transition-colors"
                style={chartType === "area" ? { backgroundColor: "#FFFFFF", color: ACTIVE_ACCENT, boxShadow: "0 1px 2px rgba(65, 54, 45, 0.08)" } : { color: TEXT_SECONDARY }}
                title="面积图"
              >
                <PieIcon size={12} />
              </button>
            </div>
          )}
          {!isFullscreen && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="rounded p-1 transition-colors"
              style={{ color: TEXT_MUTED }}
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
        <p className="mt-2 text-xs" style={{ color: TEXT_SECONDARY }}>{spec.description}</p>
      )}
    </div>
  );

  return (
    <>
      {/* Inline chart */}
      <div
        className="my-3 rounded-lg border p-3"
        style={{ backgroundColor: PANEL_BG, borderColor: PANEL_BORDER }}
      >
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
                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
                style={{ color: TEXT_SECONDARY, borderColor: PANEL_BORDER, backgroundColor: PANEL_BG }}
              >
                <Download size={12} /> PNG
              </button>
              <button
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
                style={{ color: TEXT_SECONDARY, borderColor: PANEL_BORDER, backgroundColor: PANEL_BG }}
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
