"use client";

import React from "react";
import { Card } from "antd";
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
  Pill,
  Home,
  CheckSquare,
  Bell,
} from "lucide-react";
import { ContextualPromptOption } from "./ContextualPrompts";

interface CardsPromptProps {
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
  Pill,
  Home,
  CheckSquare,
  Bell,
};

export function CardsPrompt({ options, onSelect }: CardsPromptProps) {
  const handleCardClick = (option: ContextualPromptOption) => {
    if (onSelect) {
      onSelect(option.value, option.action);
    }
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = iconMap[iconName];
    return IconComponent ? (
      <IconComponent size={20} className="text-blue-500" />
    ) : null;
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option, index) => (
        <Card
          key={index}
          size="small"
          hoverable
          className="cursor-pointer transition-all hover:shadow-md hover:border-blue-400"
          onClick={() => handleCardClick(option)}
        >
          <div className="flex items-start space-x-3">
            {option.icon && (
              <div className="mt-1 flex-shrink-0">{getIcon(option.icon)}</div>
            )}
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-semibold text-gray-800 truncate">
                {option.title || option.label}
              </h5>
              {option.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
