"use client";

import React from "react";
import { TagsPrompt } from "./TagsPrompt";
import { DropdownPrompt } from "./DropdownPrompt";
import { QuickActionsPrompt } from "./QuickActionsPrompt";
import { CardsPrompt } from "./CardsPrompt";
import { FormPrompt } from "./FormPrompt";

export interface ContextualPromptOption {
  label: string;
  value: string;
  color?: string;
  icon?: string;
  description?: string;
  action?: string;
  [key: string]: any;
}

export interface ContextualPromptData {
  type: "contextual_prompt";
  prompt_type: "tags" | "dropdown" | "quick_actions" | "cards" | "form";
  title: string;
  description?: string;
  options: ContextualPromptOption[];
  context?: string;
  priority?: "high" | "medium" | "low";
  timestamp?: string;
}

interface ContextualPromptsProps {
  data: ContextualPromptData;
  onSelect?: (value: string, action?: string) => void;
  onSubmit?: (formData: Record<string, any>) => void;
}

export function ContextualPrompts({
  data,
  onSelect,
  onSubmit,
}: ContextualPromptsProps) {
  const { prompt_type, title, description, options, priority } = data;

  // Priority-based styling
  const priorityColors = {
    high: "border-red-200 bg-red-50/50",
    medium: "border-blue-200 bg-blue-50/50",
    low: "border-gray-200 bg-gray-50/50",
  };

  const containerClass = `
    rounded-lg border p-4 mb-3
    ${priorityColors[priority || "medium"]}
    animate-in fade-in-50 slide-in-from-bottom-2 duration-300
  `;

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
        {description && (
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        )}
      </div>

      {/* Render appropriate prompt type */}
      <div className="mt-2">
        {prompt_type === "tags" && (
          <TagsPrompt options={options} onSelect={onSelect} />
        )}
        {prompt_type === "dropdown" && (
          <DropdownPrompt options={options} onSelect={onSelect} />
        )}
        {prompt_type === "quick_actions" && (
          <QuickActionsPrompt options={options} onSelect={onSelect} />
        )}
        {prompt_type === "cards" && (
          <CardsPrompt options={options} onSelect={onSelect} />
        )}
        {prompt_type === "form" && (
          <FormPrompt fields={options} onSubmit={onSubmit} />
        )}
      </div>
    </div>
  );
}
