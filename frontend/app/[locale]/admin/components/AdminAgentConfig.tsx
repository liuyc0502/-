"use client";

import { useState } from "react";
import { Select } from "antd";
import AgentConfig from "../../setup/agents/config";

type PortalType = "doctor" | "student" | "patient";

const portalOptions = [
  { value: "doctor", label: "医生端" },
  { value: "student", label: "学生端" },
  { value: "patient", label: "患者端" },
];

export default function AdminAgentConfig() {
  const [selectedPortal, setSelectedPortal] = useState<PortalType>("doctor");

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-8 pt-6 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">智能体配置</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">配置端口：</span>
            <Select
              value={selectedPortal}
              onChange={setSelectedPortal}
              options={portalOptions}
              className="w-32"
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          当前正在为 <span className="font-medium text-slate-700">{portalOptions.find(o => o.value === selectedPortal)?.label}</span> 配置智能体
        </p>
      </div>
      <div className="flex-1 overflow-auto">
        <AgentConfig key={selectedPortal} />
      </div>
    </div>
  );
}
