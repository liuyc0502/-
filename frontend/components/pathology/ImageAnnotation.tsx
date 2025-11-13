"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Circle, Trash2, ZoomIn, ZoomOut, Move } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Annotation shape type
interface Annotation {
  id: string;
  type: "circle";
  x: number; // Center X coordinate
  y: number; // Center Y coordinate
  radius: number;
  color: string;
}

interface ImageAnnotationProps {
  imageUrl: string; // Base64 or URL
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  onAnnotationComplete?: (annotations: Annotation[]) => void;
  className?: string;
}

export function ImageAnnotation({
  imageUrl,
  onAnnotationsChange,
  onAnnotationComplete,
  className = "",
}: ImageAnnotationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [tool, setTool] = useState<"select" | "circle" | "pan">("select");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      // Reset canvas when image loads
      if (canvasRef.current && containerRef.current) {
        const container = containerRef.current;
        const canvas = canvasRef.current;

        // Set canvas size to container size
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // Calculate initial scale to fit image
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;
        const initialScale = Math.min(scaleX, scaleY, 1) * 0.9;

        setScale(initialScale);
        setOffset({
          x: (canvas.width - img.width * initialScale) / 2,
          y: (canvas.height - img.height * initialScale) / 2,
        });
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !image) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Apply transformations
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw image
    ctx.drawImage(image, 0, 0);

    // Draw all annotations
    annotations.forEach((annotation) => {
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = 3 / scale; // Keep line width consistent regardless of zoom
      ctx.beginPath();
      ctx.arc(annotation.x, annotation.y, annotation.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw current annotation being drawn
    if (currentAnnotation) {
      ctx.strokeStyle = currentAnnotation.color;
      ctx.lineWidth = 3 / scale;
      ctx.beginPath();
      ctx.arc(
        currentAnnotation.x,
        currentAnnotation.y,
        currentAnnotation.radius,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // Restore context state
    ctx.restore();
  }, [image, annotations, currentAnnotation, scale, offset]);

  // Redraw when dependencies change
  useEffect(() => {
    draw();
  }, [draw]);

  // Convert canvas coordinates to image coordinates
  const canvasToImageCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const imageX = (canvasX - offset.x) / scale;
    const imageY = (canvasY - offset.y) / scale;

    return { x: imageX, y: imageY };
  };

  // Mouse down handler
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = canvasToImageCoords(e.clientX, e.clientY);

    if (tool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    if (tool === "circle") {
      setIsDrawing(true);
      const newAnnotation: Annotation = {
        id: `annotation-${Date.now()}`,
        type: "circle",
        x,
        y,
        radius: 0,
        color: "#ef4444", // Red color
      };
      setCurrentAnnotation(newAnnotation);
    }
  };

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && tool === "pan") {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!isDrawing || !currentAnnotation || tool !== "circle") return;

    const { x, y } = canvasToImageCoords(e.clientX, e.clientY);
    const radius = Math.sqrt(
      Math.pow(x - currentAnnotation.x, 2) + Math.pow(y - currentAnnotation.y, 2)
    );

    setCurrentAnnotation({
      ...currentAnnotation,
      radius,
    });
  };

  // Mouse up handler
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing && currentAnnotation && currentAnnotation.radius > 5) {
      const newAnnotations = [...annotations, currentAnnotation];
      setAnnotations(newAnnotations);
      onAnnotationsChange?.(newAnnotations);
      // Auto-send when annotation is complete
      onAnnotationComplete?.(newAnnotations);
    }
    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  // Clear all annotations
  const handleClearAll = () => {
    setAnnotations([]);
    onAnnotationsChange?.([]);
  };

  // Zoom in
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, 5));
  };

  // Zoom out
  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.2, 0.1));
  };

  // Reset view
  const handleResetView = () => {
    if (!image || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const scaleX = canvas.width / image.width;
    const scaleY = canvas.height / image.height;
    const initialScale = Math.min(scaleX, scaleY, 1) * 0.9;

    setScale(initialScale);
    setOffset({
      x: (canvas.width - image.width * initialScale) / 2,
      y: (canvas.height - image.height * initialScale) / 2,
    });
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-gray-50 flex-shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === "circle" ? "default" : "outline"}
                size="sm"
                onClick={() => setTool("circle")}
              >
                <Circle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Circle annotation tool</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === "pan" ? "default" : "outline"}
                size="sm"
                onClick={() => setTool("pan")}
              >
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pan tool</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>

          <Button variant="outline" size="sm" onClick={handleResetView}>
            Reset
          </Button>

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={annotations.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear all annotations</TooltipContent>
          </Tooltip>

          <span className="text-xs text-gray-500">
            {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
          </span>
        </TooltipProvider>
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-gray-100 min-h-0">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair w-full h-full"
          style={{
            cursor:
              tool === "pan"
                ? isPanning
                  ? "grabbing"
                  : "grab"
                : tool === "circle"
                ? "crosshair"
                : "default",
          }}
        />
      </div>
    </div>
  );
}
