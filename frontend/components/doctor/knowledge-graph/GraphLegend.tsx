"use client";

import { useState } from "react";
import { AlertTriangle, Info, MapPin } from "lucide-react";
import { EDGE_TYPE_CONFIG, NODE_TYPE_CONFIG, PATIENT_ACCENT } from "./constants";
import type { KGNodeType, KGEdgeType } from "@/types/knowledgeGraph";

export default function GraphLegend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute right-4 top-4 z-10 select-none">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 rounded-full border border-[#F0D3C0] bg-white px-3 py-2 text-xs font-medium text-[#4B5563] shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-colors hover:bg-[#FFF6F0]"
        >
          <Info size={14} className="text-[#DA7756]" />
          图例
        </button>
      ) : (
        <div className="w-60 rounded-2xl border border-[#E7E7E7] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-2 border-b border-[#EFEFEF] px-4 py-3">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-[#DA7756]" />
              <span className="text-sm font-semibold text-[#111827]">图例说明</span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-xs text-[#9CA3AF] transition-colors hover:text-[#4B5563]"
            >
              收起
            </button>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
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
                      <span className="text-[11px] text-[#4B5563]">{config.label}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                关系类型
              </p>
              <div className="space-y-1.5">
                {(Object.entries(EDGE_TYPE_CONFIG) as [KGEdgeType, (typeof EDGE_TYPE_CONFIG)[KGEdgeType]][]).map(
                  ([type, config]) => (
                    <div key={type} className="flex items-center gap-2">
                      <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: config.color }} />
                      <span className="text-[11px] text-[#4B5563]">{config.label}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
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
                  <span className="text-[11px] text-[#4B5563]">患者当前位置</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#D86C63] text-white">
                    <AlertTriangle size={10} />
                  </span>
                  <span className="text-[11px] text-[#4B5563]">异常节点</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
