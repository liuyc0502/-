"use client";

import React from "react";
import { Tag } from "antd";
import { ContextualPromptOption } from "./ContextualPrompts";

interface TagsPromptProps {
  options: ContextualPromptOption[];
  onSelect?: (value: string, action?: string) => void;
}

export function TagsPrompt({ options, onSelect }: TagsPromptProps) {
  const handleTagClick = (option: ContextualPromptOption) => {
    if (onSelect) {
      onSelect(option.value, option.action);
    }
  };

  const getTagColor = (color?: string) => {
    const colorMap: Record<string, string> = {
      blue: "blue",
      red: "red",
      orange: "orange",
      green: "green",
      purple: "purple",
      pink: "magenta",
    };
    return color ? colorMap[color] || "default" : "default";
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option, index) => (
        <Tag
          key={index}
          color={getTagColor(option.color)}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleTagClick(option)}
        >
          {option.icon && <span className="mr-1">{option.icon}</span>}
          {option.label}
        </Tag>
      ))}
    </div>
  );
}
