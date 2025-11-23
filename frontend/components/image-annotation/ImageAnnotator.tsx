"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnnotationToolbar, AnnotationTool } from "./AnnotationToolbar";
export interface Annotation {
  id: string;
  type: "rectangle" | "circle" | "freehand" | "point" | "arrow";
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  label?: string;
}
interface ImageAnnotatorProps {
  imageUrl: string;
  annotations?: Annotation[];
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  onRegionSelect?: (region: {
    type: string;
    coordinates: any;
    imageUrl: string;
  }) => void;
  onPointClick?: (point: { x: number; y: number; imageUrl: string }) => void;
  readOnly?: boolean;
  className?: string;
}
export function ImageAnnotator({
  imageUrl,
  annotations = [],
  onAnnotationsChange,
  onRegionSelect,
  onPointClick,
  readOnly = false,
  className = "",
}: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentTool, setCurrentTool] = useState<AnnotationTool>("select");
  const [currentColor, setCurrentColor] = useState("#FF0000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(
    null
  );
  const [localAnnotations, setLocalAnnotations] =
    useState<Annotation[]>(annotations);
  // Load image
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      // Fit image to container
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        const fitScale = Math.min(scaleX, scaleY, 1) * 0.9;
        setScale(fitScale);
        setOffset({
          x: (containerWidth - img.width * fitScale) / 2,
          y: (containerHeight - img.height * fitScale) / 2,
        });
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);
  // Update local annotations when prop changes
  useEffect(() => {
    setLocalAnnotations(annotations);
  }, [annotations]);
  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !image) return;
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw image
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0);
    // Draw annotations
    [...localAnnotations, currentAnnotation].forEach((annotation) => {
      if (!annotation) return;
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = annotation.strokeWidth / scale;
      ctx.fillStyle = annotation.color + "33"; // Add transparency
      switch (annotation.type) {
        case "rectangle":
          if (annotation.points.length >= 2) {
            const [start, end] = annotation.points;
            const width = end.x - start.x;
            const height = end.y - start.y;
            ctx.strokeRect(start.x, start.y, width, height);
            ctx.fillRect(start.x, start.y, width, height);
          }
          break;
        case "circle":
          if (annotation.points.length >= 2) {
            const [center, edge] = annotation.points;
            const radius = Math.sqrt(
              Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
            );
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();
          }
          break;
        case "freehand":
          if (annotation.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
            annotation.points.forEach((point) => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
          }
          break;
        case "point":
          if (annotation.points.length === 1) {
            const point = annotation.points[0];
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8 / scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Draw crosshair
            ctx.beginPath();
            ctx.moveTo(point.x - 12 / scale, point.y);
            ctx.lineTo(point.x + 12 / scale, point.y);
            ctx.moveTo(point.x, point.y - 12 / scale);
            ctx.lineTo(point.x, point.y + 12 / scale);
            ctx.stroke();
          }
          break;
        case "arrow":
          if (annotation.points.length >= 2) {
            const [start, end] = annotation.points;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const headLength = 15 / scale;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            // Arrow head
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - headLength * Math.cos(angle - Math.PI / 6),
              end.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - headLength * Math.cos(angle + Math.PI / 6),
              end.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
          break;
      }
    });
    ctx.restore();
  }, [image, scale, offset, localAnnotations, currentAnnotation]);
  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);
  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        draw();
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);
  // Get mouse position in image coordinates
  const getImageCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;
    return { x, y };
  };
  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    const coords = getImageCoordinates(e);
    if (currentTool === "pan") {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }
    if (currentTool === "select") {
      // Check if clicking on existing annotation
      return;
    }
    if (currentTool === "point") {
      const newAnnotation: Annotation = {
        id: `ann-${Date.now()}`,
        type: "point",
        points: [coords],
        color: currentColor,
        strokeWidth,
      };
      setLocalAnnotations([...localAnnotations, newAnnotation]);
      onAnnotationsChange?.([...localAnnotations, newAnnotation]);
      onPointClick?.({ ...coords, imageUrl });
      return;
    }
    // Start drawing
    setIsDrawing(true);
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      type: currentTool as Annotation["type"],
      points: [coords],
      color: currentColor,
      strokeWidth,
    };
    setCurrentAnnotation(newAnnotation);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && currentTool === "pan") {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }
    if (!isDrawing || !currentAnnotation) return;
    const coords = getImageCoordinates(e);
    if (currentAnnotation.type === "freehand") {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...currentAnnotation.points, coords],
      });
    } else {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [currentAnnotation.points[0], coords],
      });
    }
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    if (isDrawing && currentAnnotation) {
      const newAnnotations = [...localAnnotations, currentAnnotation];
      setLocalAnnotations(newAnnotations);
      onAnnotationsChange?.(newAnnotations);
      // Notify region selection
      if (
        currentAnnotation.type === "rectangle" &&
        currentAnnotation.points.length >= 2
      ) {
        const [start, end] = currentAnnotation.points;
        onRegionSelect?.({
          type: "rectangle",
          coordinates: {
            x1: Math.min(start.x, end.x),
            y1: Math.min(start.y, end.y),
            x2: Math.max(start.x, end.x),
            y2: Math.max(start.y, end.y),
          },
          imageUrl,
        });
      } else if (
        currentAnnotation.type === "circle" &&
        currentAnnotation.points.length >= 2
      ) {
        const [center, edge] = currentAnnotation.points;
        const radius = Math.sqrt(
          Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
        );
        onRegionSelect?.({
          type: "circle",
          coordinates: { cx: center.x, cy: center.y, radius },
          imageUrl,
        });
      }
      setCurrentAnnotation(null);
      setIsDrawing(false);
    }
  };
  // Zoom handlers
  const handleZoomIn = () => setScale((s) => Math.min(s * 1.2, 5));
  const handleZoomOut = () => setScale((s) => Math.max(s / 1.2, 0.1));
  const handleReset = () => {
    if (image && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = containerWidth / image.width;
      const scaleY = containerHeight / image.height;
      const fitScale = Math.min(scaleX, scaleY, 1) * 0.9;
      setScale(fitScale);
      setOffset({
        x: (containerWidth - image.width * fitScale) / 2,
        y: (containerHeight - image.height * fitScale) / 2,
      });
    }
  };
  // Clear annotations
  const handleClear = () => {
    setLocalAnnotations([]);
    onAnnotationsChange?.([]);
  };
  // Undo last annotation
  const handleUndo = () => {
    if (localAnnotations.length > 0) {
      const newAnnotations = localAnnotations.slice(0, -1);
      setLocalAnnotations(newAnnotations);
      onAnnotationsChange?.(newAnnotations);
    }
  };
  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(Math.max(s * delta, 0.1), 5));
  };
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      {!readOnly && (
        <AnnotationToolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          currentColor={currentColor}
          onColorChange={setCurrentColor}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          onUndo={handleUndo}
          onClear={handleClear}
          canUndo={localAnnotations.length > 0}
        />
      )}
      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-gray-100 overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${
            currentTool === "pan"
              ? "cursor-grab"
              : currentTool === "select"
              ? "cursor-default"
              : "cursor-crosshair"
          } ${isDragging ? "cursor-grabbing" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex gap-2 bg-white rounded-lg shadow-md p-1">
          <Button variant="ghost" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="flex items-center px-2 text-sm text-gray-600">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        {/* No image placeholder */}
        {!image && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <p>No image loaded</p>
          </div>
        )}
      </div>
    </div>
  );
}