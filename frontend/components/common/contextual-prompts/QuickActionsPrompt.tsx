"use client";

import React from "react";
import { Button } from "antd";
import {
  FileText,
  Plus,
  Search,
  Calendar,
  BarChart,
  Star,
  Copy,
  GitCompare,
  BookOpen,
  Network,
  Edit,
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  Home,
  CheckSquare,
  Bell,
} from "lucide-react";
import { ContextualPromptOption } from "./ContextualPrompts";

interface QuickActionsPromptProps {
  options: ContextualPromptOption[];
  onSelect?: (value: string, action?: string) => void;
}

const iconMap: Record<string, React.ElementType> = {
  FileText,
  Plus,
  Search,
  Calendar,
  BarChart,
  Star,
  Copy,
  GitCompare,
  BookOpen,
  Network,
  Edit,
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  Home,
  CheckSquare,
  Bell,
};

export function QuickActionsPrompt({
  options,
  onSelect,
}: QuickActionsPromptProps) {
  const handleActionClick = (option: ContextualPromptOption) => {
    if (onSelect) {
      onSelect(option.value, option.action);
    }
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent size={16} /> : null;
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option, index) => (
        <Button
          key={index}
          type="default"
          size="middle"
          icon={getIcon(option.icon)}
          className="flex items-center justify-start text-left hover:border-blue-400"
          onClick={() => handleActionClick(option)}
        >
          <span className="ml-1 truncate">{option.label}</span>
        </Button>
      ))}
    </div>
  );
}
