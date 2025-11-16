"use client";

import AgentConfig from "../../setup/agents/config";

export default function AdminAgentConfig() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <AgentConfig />
      </div>
    </div>
  );
}
