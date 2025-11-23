/**
 * useImageAnnotation - Hook for managing image annotation state in chat
 *
 * This hook manages the state for image annotation split view in the chat interface.
 * It handles:
 * - Opening/closing the annotation view when an image is uploaded
 * - Managing annotation data
 * - Generating annotation context for AI analysis
 */

import { useState, useCallback } from "react";
import type { Annotation } from "@/components/image-annotation";

export interface AnnotatedImageData {
  imageUrl: string;
  annotations: Annotation[];
  selectedRegion?: {
    type: "rectangle" | "circle" | "point";
    coordinates: {
      x: number;
      y: number;
      width?: number;
      height?: number;
      radius?: number;
    };
  };
}

export interface UseImageAnnotationReturn {
  // State
  isAnnotationMode: boolean;
  annotatedImage: AnnotatedImageData | null;

  // Actions
  openAnnotationView: (imageUrl: string) => void;
  closeAnnotationView: () => void;
  updateAnnotations: (annotations: Annotation[]) => void;
  setSelectedRegion: (region: AnnotatedImageData["selectedRegion"]) => void;

  // Utilities
  generateAnnotationContext: () => string;
  getAnnotationSummary: () => {
    totalAnnotations: number;
    byType: Record<string, number>;
  };
}

export function useImageAnnotation(): UseImageAnnotationReturn {
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [annotatedImage, setAnnotatedImage] =
    useState<AnnotatedImageData | null>(null);

  /**
   * Open the annotation view with a specific image
   */
  const openAnnotationView = useCallback((imageUrl: string) => {
    setAnnotatedImage({
      imageUrl,
      annotations: [],
    });
    setIsAnnotationMode(true);
  }, []);

  /**
   * Close the annotation view
   */
  const closeAnnotationView = useCallback(() => {
    setIsAnnotationMode(false);
    // Keep the annotated image data for reference
  }, []);

  /**
   * Update annotations for the current image
   */
  const updateAnnotations = useCallback((annotations: Annotation[]) => {
    setAnnotatedImage((prev) => {
      if (!prev) return null;
      return { ...prev, annotations };
    });
  }, []);

  /**
   * Set the currently selected region (for region-based Q&A)
   */
  const setSelectedRegion = useCallback(
    (region: AnnotatedImageData["selectedRegion"]) => {
      setAnnotatedImage((prev) => {
        if (!prev) return null;
        return { ...prev, selectedRegion: region };
      });
    },
    []
  );

  /**
   * Generate a text description of annotations for AI context
   */
  const generateAnnotationContext = useCallback(() => {
    if (!annotatedImage || annotatedImage.annotations.length === 0) {
      return "";
    }

    const annotations = annotatedImage.annotations;
    let context = `The user has marked ${annotations.length} region(s) on the image:\n`;

    annotations.forEach((ann, index) => {
      switch (ann.type) {
        case "rectangle":
          if (ann.points.length >= 2) {
            const [start, end] = ann.points;
            const width = Math.abs(end.x - start.x);
            const height = Math.abs(end.y - start.y);
            context += `${index + 1}. Rectangle at (${Math.round(
              start.x
            )}, ${Math.round(start.y)}), size ${Math.round(
              width
            )}x${Math.round(height)} pixels\n`;
          }
          break;
        case "circle":
          if (ann.points.length >= 2) {
            const [center, edge] = ann.points;
            const radius = Math.sqrt(
              Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
            );
            context += `${index + 1}. Circle centered at (${Math.round(
              center.x
            )}, ${Math.round(center.y)}), radius ${Math.round(radius)} pixels\n`;
          }
          break;
        case "point":
          if (ann.points.length >= 1) {
            context += `${index + 1}. Point marked at (${Math.round(
              ann.points[0].x
            )}, ${Math.round(ann.points[0].y)})\n`;
          }
          break;
        case "arrow":
          if (ann.points.length >= 2) {
            const [start, end] = ann.points;
            context += `${index + 1}. Arrow from (${Math.round(
              start.x
            )}, ${Math.round(start.y)}) to (${Math.round(end.x)}, ${Math.round(
              end.y
            )})\n`;
          }
          break;
        case "freehand":
          context += `${index + 1}. Freehand drawing with ${ann.points.length} points\n`;
          break;
      }

      if (ann.label) {
        context += `   Label: ${ann.label}\n`;
      }
    });

    if (annotatedImage.selectedRegion) {
      const region = annotatedImage.selectedRegion;
      context += `\nCurrently focused region: ${region.type} at (${Math.round(
        region.coordinates.x
      )}, ${Math.round(region.coordinates.y)})`;
      if (region.coordinates.width && region.coordinates.height) {
        context += ` with size ${Math.round(
          region.coordinates.width
        )}x${Math.round(region.coordinates.height)}`;
      }
      if (region.coordinates.radius) {
        context += ` with radius ${Math.round(region.coordinates.radius)}`;
      }
      context += "\n";
    }

    return context;
  }, [annotatedImage]);

  /**
   * Get a summary of annotations by type
   */
  const getAnnotationSummary = useCallback(() => {
    if (!annotatedImage) {
      return { totalAnnotations: 0, byType: {} };
    }

    const byType: Record<string, number> = {};
    annotatedImage.annotations.forEach((ann) => {
      byType[ann.type] = (byType[ann.type] || 0) + 1;
    });

    return {
      totalAnnotations: annotatedImage.annotations.length,
      byType,
    };
  }, [annotatedImage]);

  return {
    isAnnotationMode,
    annotatedImage,
    openAnnotationView,
    closeAnnotationView,
    updateAnnotations,
    setSelectedRegion,
    generateAnnotationContext,
    getAnnotationSummary,
  };
}
