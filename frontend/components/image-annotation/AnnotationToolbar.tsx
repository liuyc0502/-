"use client";

import React from "react";
import {
  MousePointer2,
  Square,
  Circle,
  Pencil,
  Target,
  ArrowUpRight,
  Hand,
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

export interface AnnotationToolbarProps {
  currentTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
}

const PRESET_COLORS = [
  "#FF0000", // Red
  "#FF6B00", // Orange
  "#FFD700", // Yellow
  "#00FF00", // Green
  "#00BFFF", // Light Blue
  "#0000FF", // Blue
  "#8B00FF", // Purple
  "#FF1493", // Pink
  "#FFFFFF", // White
  "#000000", // Black
];

const tools: { id: AnnotationTool; icon: React.ElementType; label: string }[] =
  [
    { id: "select", icon: MousePointer2, label: "Select" },
    { id: "pan", icon: Hand, label: "Pan / Move" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "freehand", icon: Pencil, label: "Freehand" },
    { id: "point", icon: Target, label: "Point" },
    { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
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
}: AnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white border-b border-gray-200">
      {/* Drawing tools */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <TooltipProvider>
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={currentTool === tool.id ? "default" : "ghost"}
                  size="icon"
                  className={`h-9 w-9 ${
                    currentTool === tool.id
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : ""
                  }`}
                  onClick={() => onToolChange(tool.id)}
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tool.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-2 border-r border-gray-200 pr-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-9 p-0 border-2"
              style={{ backgroundColor: currentColor }}
            >
              <span className="sr-only">Pick color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`h-8 w-8 rounded-md border-2 transition-transform hover:scale-110 ${
                    currentColor === color
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onColorChange(color)}
                />
              ))}
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-500 block mb-1">
                Custom color
              </label>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-full h-8 cursor-pointer rounded border border-gray-200"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Stroke width */}
      <div className="flex items-center gap-2 border-r border-gray-200 pr-2 min-w-[120px]">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3">
              <div
                className="w-4 h-4 rounded-full mr-2"
                style={{
                  backgroundColor: currentColor,
                  transform: `scale(${0.5 + strokeWidth * 0.1})`,
                }}
              />
              <span className="text-xs">{strokeWidth}px</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3">
            <label className="text-xs text-gray-500 block mb-2">
              Stroke Width
            </label>
            <div className="flex items-center gap-3">
              <Slider
                value={[strokeWidth]}
                onValueChange={([value]) => onStrokeWidthChange(value)}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <span className="text-sm w-8 text-right">{strokeWidth}px</span>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={onClear}
                disabled={!canUndo}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear All</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Help text */}
      <div className="ml-auto text-xs text-gray-400">
        {currentTool === "rectangle" && "Click and drag to draw rectangle"}
        {currentTool === "circle" && "Click center, drag to set radius"}
        {currentTool === "freehand" && "Click and drag to draw freely"}
        {currentTool === "point" && "Click to mark a point"}
        {currentTool === "arrow" && "Click and drag to draw arrow"}
        {currentTool === "pan" && "Click and drag to move image"}
        {currentTool === "select" && "Click to select annotation"}
      </div>
    </div>
  );
}
