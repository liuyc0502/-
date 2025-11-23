"use client";

import React, { useState, useCallback } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ImageAnnotator,
  type Annotation,
} from "./ImageAnnotator";
import {
  AnnotationToolbar,
  type AnnotationTool,
} from "./AnnotationToolbar";

interface SplitChatLayoutProps {
  imageUrl: string;
  onClose: () => void;
  onAnnotationComplete?: (annotations: Annotation[], imageUrl: string) => void;
  onRegionSelect?: (region: {
    type: "rectangle" | "circle" | "point";
    coordinates: { x: number; y: number; width?: number; height?: number; radius?: number };
  }) => void;
  children: React.ReactNode;
}

/**
 * SplitChatLayout - Split screen layout component for image annotation with chat
 * Left side: Image with annotation tools
 * Right side: Chat interface (passed as children)
 */
export function SplitChatLayout({
  imageUrl,
  onClose,
  onAnnotationComplete,
  onRegionSelect,
  children,
}: SplitChatLayoutProps) {
  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentTool, setCurrentTool] = useState<AnnotationTool>("select");
  const [currentColor, setCurrentColor] = useState("#FF0000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50); // Left panel width percentage

  // Undo functionality
  const handleUndo = useCallback(() => {
    setAnnotations((prev) => prev.slice(0, -1));
  }, []);

  // Clear all annotations
  const handleClear = useCallback(() => {
    setAnnotations([]);
  }, []);

  // Handle annotation change
  const handleAnnotationsChange = useCallback((newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
  }, []);

  // Handle annotation select (for region-based Q&A)
  const handleAnnotationSelect = useCallback(
    (annotation: Annotation | null) => {
      if (annotation && onRegionSelect) {
        const points = annotation.points;
        if (annotation.type === "rectangle" && points.length >= 2) {
          const minX = Math.min(points[0].x, points[1].x);
          const minY = Math.min(points[0].y, points[1].y);
          const maxX = Math.max(points[0].x, points[1].x);
          const maxY = Math.max(points[0].y, points[1].y);
          onRegionSelect({
            type: "rectangle",
            coordinates: {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
            },
          });
        } else if (annotation.type === "circle" && points.length >= 2) {
          const cx = points[0].x;
          const cy = points[0].y;
          const radius = Math.sqrt(
            Math.pow(points[1].x - cx, 2) + Math.pow(points[1].y - cy, 2)
          );
          onRegionSelect({
            type: "circle",
            coordinates: { x: cx, y: cy, radius },
          });
        } else if (annotation.type === "point" && points.length >= 1) {
          onRegionSelect({
            type: "point",
            coordinates: { x: points[0].x, y: points[0].y },
          });
        }
      }
    },
    [onRegionSelect]
  );

  // Handle send annotations
  const handleSendAnnotations = useCallback(() => {
    if (onAnnotationComplete) {
      onAnnotationComplete(annotations, imageUrl);
    }
  }, [annotations, imageUrl, onAnnotationComplete]);

  // Toggle fullscreen for image panel
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Handle resize drag
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startRatio = splitRatio;
      const containerWidth = (e.target as HTMLElement).parentElement?.parentElement?.offsetWidth || 1;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newRatio = Math.min(80, Math.max(20, startRatio + deltaPercent));
        setSplitRatio(newRatio);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [splitRatio]
  );

  return (
    <div className="flex h-full w-full bg-gray-100">
      {/* Left Panel - Image Annotation */}
      <div
        className={`flex flex-col bg-white border-r border-gray-200 ${
          isFullscreen ? "fixed inset-0 z-50" : ""
        }`}
        style={{ width: isFullscreen ? "100%" : `${splitRatio}%` }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-200">
          <AnnotationToolbar
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            currentColor={currentColor}
            onColorChange={setCurrentColor}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            onUndo={handleUndo}
            onClear={handleClear}
            canUndo={annotations.length > 0}
          />

          <div className="flex items-center gap-1 px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-red-500"
              onClick={onClose}
              title="Close annotation view"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image Annotator */}
        <div className="flex-1 overflow-hidden">
          <ImageAnnotator
            imageUrl={imageUrl}
            annotations={annotations}
            onAnnotationsChange={handleAnnotationsChange}
            currentTool={currentTool}
            currentColor={currentColor}
            strokeWidth={strokeWidth}
            onAnnotationSelect={handleAnnotationSelect}
          />
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {annotations.length > 0
              ? `${annotations.length} annotation(s)`
              : "No annotations"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={annotations.length === 0}
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={handleSendAnnotations}
              disabled={annotations.length === 0}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Send to Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      {!isFullscreen && (
        <div
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors flex-shrink-0"
          onMouseDown={handleResizeStart}
        />
      )}

      {/* Right Panel - Chat Interface */}
      {!isFullscreen && (
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ width: `${100 - splitRatio}%` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
