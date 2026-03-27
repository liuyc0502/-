"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import type { KGNodeType } from "@/types/knowledgeGraph";
import { MapPin, AlertTriangle } from "lucide-react";
import { NODE_TYPE_CONFIG, PATIENT_ACCENT } from "./constants";

interface CustomNodeData {
  label: string;
  nodeType: KGNodeType;
  isPatientPosition?: boolean;
  isAnomaly?: boolean;
}

function CustomGraphNode({ data, selected }: NodeProps<CustomNodeData>) {
  const config = NODE_TYPE_CONFIG[data.nodeType] || NODE_TYPE_CONFIG.Disease;
  const Icon = config.icon;

  return (
    <div
      className={`relative group transition-all duration-200 ${selected ? "scale-105" : ""}`}
      style={{
        minWidth: 160,
        filter: data.isPatientPosition
          ? `drop-shadow(0 0 8px rgba(218,119,86,0.35))`
          : data.isAnomaly
          ? `drop-shadow(0 0 8px rgba(239,68,68,0.35))`
          : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !rounded-full !border-2 !border-white"
        style={{ backgroundColor: config.accent }}
      />

      <div
        className={`rounded-xl shadow-md border transition-shadow group-hover:shadow-lg ${
          data.isAnomaly ? "border-dashed border-red-400 border-2" : ""
        }`}
        style={{
          backgroundColor: config.surface,
          borderColor: data.isAnomaly ? undefined : `${config.accent}55`,
          boxShadow: selected
            ? "0 10px 22px rgba(91, 63, 34, 0.14)"
            : "0 4px 12px rgba(91, 63, 34, 0.08)",
        }}
      >
        {/* Patient position badge */}
        {data.isPatientPosition && (
          <div
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
            style={{ backgroundColor: PATIENT_ACCENT }}
          >
            <MapPin size={10} className="text-white" />
          </div>
        )}

        {/* Anomaly badge */}
        {data.isAnomaly && !data.isPatientPosition && (
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-sm animate-pulse">
            <AlertTriangle size={10} className="text-white" />
          </div>
        )}

        <div className="px-3.5 py-2.5">
          {/* Top row: icon + type label */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${config.accent}1A`, color: config.accent }}
            >
              <Icon size={11} />
            </div>
            <span
              className="text-[10px] font-medium tracking-wide uppercase"
              style={{ color: config.accent }}
            >
              {config.label}
            </span>
          </div>

          {/* Separator */}
          <div className="w-full h-px mb-1.5" style={{ backgroundColor: `${config.accent}38` }} />

          {/* Node label */}
          <p className="text-sm font-semibold leading-snug text-[#332922]">{data.label}</p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !rounded-full !border-2 !border-white"
        style={{ backgroundColor: config.accent }}
      />
    </div>
  );
}

export const nodeTypes = { custom: memo(CustomGraphNode) };
export default memo(CustomGraphNode);
