"use client";

import React from "react";
import {
  Square,
  Circle,
  Pencil,
  MousePointer,
  Move,
  MapPin,
  ArrowRight,
  Undo2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type AnnotationTool =
  | "select"
  | "pan"
  | "rectangle"
  | "circle"
  | "freehand"
  | "point"
  | "arrow";

// Preset annotation labels with colors for medical imaging
export const PRESET_LABELS = [
  { id: "lesion", name: "病灶", color: "#FF4D4F", description: "Lesion area" },
  { id: "control", name: "对照", color: "#52C41A", description: "Control/reference area" },
  { id: "artifact", name: "伪影", color: "#FAAD14", description: "Imaging artifact" },
  { id: "shadow", name: "阴影", color: "#8C8C8C", description: "Shadow area" },
  { id: "bleeding", name: "出血", color: "#722ED1", description: "Bleeding/hemorrhage" },
  { id: "necrosis", name: "坏死", color: "#13C2C2", description: "Necrotic tissue" },
  { id: "inflammation", name: "炎症", color: "#FA8C16", description: "Inflammation" },
  { id: "tumor", name: "肿瘤", color: "#EB2F96", description: "Tumor/mass" },
  { id: "custom", name: "自定义", color: "#1890FF", description: "Custom annotation" },
];

// Common colors for quick selection
const QUICK_COLORS = [
  "#FF4D4F", // Red - Lesion
  "#52C41A", // Green - Control
  "#FAAD14", // Yellow - Artifact
  "#1890FF", // Blue - Custom
  "#722ED1", // Purple - Bleeding
  "#EB2F96", // Pink - Tumor
  "#13C2C2", // Cyan - Necrosis
  "#8C8C8C", // Gray - Shadow
];

interface AnnotationToolbarProps {
  currentTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
  currentLabel?: string;
  onLabelChange?: (label: string) => void;
  compact?: boolean;
}

const tools: { id: AnnotationTool; icon: React.ReactNode; label: string }[] = [
  { id: "select", icon: <MousePointer className="h-4 w-4" />, label: "选择" },
  { id: "pan", icon: <Move className="h-4 w-4" />, label: "平移" },
  { id: "rectangle", icon: <Square className="h-4 w-4" />, label: "矩形" },
  { id: "circle", icon: <Circle className="h-4 w-4" />, label: "圆形" },
  { id: "freehand", icon: <Pencil className="h-4 w-4" />, label: "自由绘制" },
  { id: "point", icon: <MapPin className="h-4 w-4" />, label: "标记点" },
  { id: "arrow", icon: <ArrowRight className="h-4 w-4" />, label: "箭头" },
];

export function AnnotationToolbar({
  currentTool,
  onToolChange,
  currentColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onUndo,
  onClear,
  canUndo,
  currentLabel,
  onLabelChange,
  compact = false,
}: AnnotationToolbarProps) {
  const handlePresetSelect = (preset: typeof PRESET_LABELS[0]) => {
    onColorChange(preset.color);
    onLabelChange?.(preset.name);
  };

  return (
    <TooltipProvider>
      <div
        className={`flex items-center gap-2 p-2 bg-white border-b ${
          compact ? "flex-wrap" : ""
        }`}
      >
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 border-r pr-2">
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={currentTool === tool.id ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToolChange(tool.id)}
                >
                  {tool.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tool.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Preset Labels */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: currentColor }}
                />
                <span className="text-xs">{currentLabel || "标签"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  预置标签
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {PRESET_LABELS.map((preset) => (
                    <Button
                      key={preset.id}
                      variant="ghost"
                      size="sm"
                      className={`h-8 justify-start gap-2 ${
                        currentLabel === preset.name
                          ? "bg-gray-100"
                          : ""
                      }`}
                      onClick={() => handlePresetSelect(preset)}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="text-xs truncate">{preset.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <div
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: currentColor }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500">快速选色</p>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        currentColor === color
                          ? "border-gray-900"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => onColorChange(color)}
                    />
                  ))}
                </div>
                <div className="pt-2 border-t">
                  <label className="text-xs text-gray-500">自定义颜色</label>
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="w-full h-8 mt-1 cursor-pointer"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Stroke Width */}
        <div className="flex items-center gap-2 border-r pr-2 min-w-[120px]">
          <span className="text-xs text-gray-500">线宽</span>
          <Slider
            value={[strokeWidth]}
            onValueChange={([value]) => onStrokeWidthChange(value)}
            min={1}
            max={10}
            step={1}
            className="w-16"
          />
          <span className="text-xs text-gray-600 w-4">{strokeWidth}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>撤销</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={onClear}
                disabled={!canUndo}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>清除所有</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default AnnotationToolbar;
