"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Annotation, AnnotationCoordinates } from "@/types/annotation";

interface AnnotationCanvasProps {
  imageUrl: string;
  width?: number;
  height?: number;
  annotations: Annotation[];
  drawingMode: 'circle' | 'rectangle' | null;
  currentColor?: string;
  onAnnotationCreated: (coords: AnnotationCoordinates) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  highlightedAnnotationId?: number | null;
}

export function AnnotationCanvas({
  imageUrl,
  width = 800,
  height = 600,
  annotations,
  drawingMode,
  currentColor = '#FF0000',
  onAnnotationCreated,
  onAnnotationClick,
  highlightedAnnotationId,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentShape, setCurrentShape] = useState<AnnotationCoordinates | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw image
    if (image) {
      ctx.drawImage(image, 0, 0, width, height);
    }

    // Draw existing annotations
    annotations.forEach((ann) => {
      const isHighlighted = ann.annotation_id === highlightedAnnotationId;
      const strokeWidth = isHighlighted ? 4 : 2;
      const opacity = isHighlighted ? 1 : 0.7;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = ann.annotation_color || '#FF0000';
      ctx.lineWidth = strokeWidth;

      if (ann.annotation_shape === 'circle' && ann.coordinates.x && ann.coordinates.y && ann.coordinates.radius) {
        ctx.beginPath();
        ctx.arc(ann.coordinates.x, ann.coordinates.y, ann.coordinates.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.annotation_shape === 'rectangle' && ann.coordinates.x !== undefined && ann.coordinates.y !== undefined && ann.coordinates.width && ann.coordinates.height) {
        ctx.strokeRect(ann.coordinates.x, ann.coordinates.y, ann.coordinates.width, ann.coordinates.height);
      }

      ctx.restore();
    });

    // Draw current drawing shape
    if (currentShape) {
      ctx.save();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      if (currentShape.shape === 'circle' && currentShape.x && currentShape.y && currentShape.radius) {
        ctx.beginPath();
        ctx.arc(currentShape.x, currentShape.y, currentShape.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (currentShape.shape === 'rectangle' && currentShape.x !== undefined && currentShape.y !== undefined && currentShape.width && currentShape.height) {
        ctx.strokeRect(currentShape.x, currentShape.y, currentShape.width, currentShape.height);
      }

      ctx.restore();
    }
  }, [image, annotations, currentShape, currentColor, highlightedAnnotationId, width, height]);

  // Redraw when dependencies change
  useEffect(() => {
    draw();
  }, [draw]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingMode) {
      // Check if clicking on an annotation
      const pos = getMousePos(e);
      if (pos && onAnnotationClick) {
        const clickedAnnotation = findAnnotationAtPoint(pos.x, pos.y);
        if (clickedAnnotation) {
          onAnnotationClick(clickedAnnotation);
        }
      }
      return;
    }

    const pos = getMousePos(e);
    if (!pos) return;

    setIsDrawing(true);
    setStartPos(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !drawingMode) return;

    const pos = getMousePos(e);
    if (!pos) return;

    if (drawingMode === 'circle') {
      const radius = Math.sqrt(
        Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
      );
      setCurrentShape({
        shape: 'circle',
        x: startPos.x,
        y: startPos.y,
        radius,
      });
    } else if (drawingMode === 'rectangle') {
      setCurrentShape({
        shape: 'rectangle',
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y),
      });
    }
  };

  const handleMouseUp = () => {
    if (currentShape && isDrawing) {
      // Only create annotation if shape has meaningful size
      const hasSize = currentShape.shape === 'circle' 
        ? (currentShape.radius && currentShape.radius > 5)
        : (currentShape.width && currentShape.width > 5 && currentShape.height && currentShape.height > 5);
      
      if (hasSize) {
        onAnnotationCreated(currentShape);
      }
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentShape(null);
  };

  const findAnnotationAtPoint = (x: number, y: number): Annotation | null => {
    // Check annotations in reverse order (top-most first)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i];
      const coords = ann.coordinates;

      if (ann.annotation_shape === 'circle' && coords.x && coords.y && coords.radius) {
        const distance = Math.sqrt(Math.pow(x - coords.x, 2) + Math.pow(y - coords.y, 2));
        if (distance <= coords.radius) {
          return ann;
        }
      } else if (ann.annotation_shape === 'rectangle' && coords.x !== undefined && coords.y !== undefined && coords.width && coords.height) {
        if (x >= coords.x && x <= coords.x + coords.width && y >= coords.y && y <= coords.y + coords.height) {
          return ann;
        }
      }
    }
    return null;
  };

  return (
    <div className="border rounded bg-gray-100 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: drawingMode ? 'crosshair' : 'pointer' }}
      />
    </div>
  );
}
