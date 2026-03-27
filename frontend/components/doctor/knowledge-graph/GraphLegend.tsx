"use client";

import { AlertTriangle, Info, MapPin } from "lucide-react";
import { EDGE_TYPE_CONFIG, NODE_TYPE_CONFIG, PATIENT_ACCENT } from "./constants";
import type { KGNodeType, KGEdgeType } from "@/types/knowledgeGraph";

export default function GraphLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 select-none">
      <div className="w-60 rounded-2xl border border-[#D8C8B6] bg-[#F5EDE1] shadow-[0_8px_24px_rgba(91,63,34,0.08)]">
        <div className="flex items-center gap-2 border-b border-[#EFE6DB] px-4 py-3">
          <Info size={14} className="text-[#A38767]" />
          <span className="text-sm font-semibold text-[#4D4337]">图例说明</span>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A866E]">
              节点类型
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {(Object.entries(NODE_TYPE_CONFIG) as [KGNodeType, (typeof NODE_TYPE_CONFIG)[KGNodeType]][]).map(
                ([type, config]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-md border"
                      style={{
                        backgroundColor: config.surface,
                        borderColor: `${config.accent}55`,
                      }}
                    />
                    <span className="text-[11px] text-[#5A4D40]">{config.label}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A866E]">
              关系类型
            </p>
            <div className="space-y-1.5">
              {(Object.entries(EDGE_TYPE_CONFIG) as [KGEdgeType, (typeof EDGE_TYPE_CONFIG)[KGEdgeType]][]).map(
                ([type, config]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: config.color }} />
                    <span className="text-[11px] text-[#5A4D40]">{config.label}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A866E]">
              特殊标记
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: PATIENT_ACCENT }}
                >
                  <MapPin size={10} />
                </span>
                <span className="text-[11px] text-[#5A4D40]">患者当前位置</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white">
                  <AlertTriangle size={10} />
                </span>
                <span className="text-[11px] text-[#5A4D40]">异常节点</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
