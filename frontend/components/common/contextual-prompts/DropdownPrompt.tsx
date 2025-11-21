"use client";

import React, { useState } from "react";
import { Select, Button } from "antd";
import { ContextualPromptOption } from "./ContextualPrompts";

interface DropdownPromptProps {
  options: ContextualPromptOption[];
  onSelect?: (value: string, action?: string) => void;
}

export function DropdownPrompt({ options, onSelect }: DropdownPromptProps) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>();

  const handleConfirm = () => {
    if (selectedValue && onSelect) {
      const selectedOption = options.find((opt) => opt.value === selectedValue);
      onSelect(selectedValue, selectedOption?.action);
    }
  };

  return (
    <div className="flex gap-2">
      <Select
        style={{ flex: 1 }}
        placeholder="请选择..."
        value={selectedValue}
        onChange={setSelectedValue}
        options={options.map((opt) => ({
          label: opt.label,
          value: opt.value,
        }))}
      />
      <Button type="primary" onClick={handleConfirm} disabled={!selectedValue}>
        确定
      </Button>
    </div>
  );
}
