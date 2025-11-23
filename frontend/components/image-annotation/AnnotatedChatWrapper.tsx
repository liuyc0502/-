"use client";

import React, { useCallback } from "react";
import { useImageAnnotation } from "@/hooks/useImageAnnotation";
import { SplitChatLayout } from "./SplitChatLayout";
import type { Annotation } from "./ImageAnnotator";

interface AnnotatedChatWrapperProps {
  children: React.ReactNode;
  onAnnotationComplete?: (context: string, imageUrl: string, annotations: Annotation[]) => void;
  onRegionQuestion?: (region: {
    type: "rectangle" | "circle" | "point";
    coordinates: { x: number; y: number; width?: number; height?: number; radius?: number };
  }, imageUrl: string) => void;
}

/**
 * AnnotatedChatWrapper - Wrapper component that adds image annotation capability to chat
 *
 * This component wraps the chat interface and provides:
 * - Split view when annotating images
 * - Context generation for AI analysis
 * - Integration with backend annotation tools
 *
 * Usage:
 * ```tsx
 * <AnnotatedChatWrapper
 *   onAnnotationComplete={(context, imageUrl, annotations) => {
 *     // Add context to chat message
 *     sendMessage(`Please analyze the marked regions in this image. ${context}`, [imageUrl]);
 *   }}
 *   onRegionQuestion={(region, imageUrl) => {
 *     // Ask about specific region
 *     sendMessage(`What is at this marked location?`, [imageUrl], region);
 *   }}
 * >
 *   <ChatInterface />
 * </AnnotatedChatWrapper>
 * ```
 */
export function AnnotatedChatWrapper({
  children,
  onAnnotationComplete,
  onRegionQuestion,
}: AnnotatedChatWrapperProps) {
  const {
    isAnnotationMode,
    annotatedImage,
    closeAnnotationView,
    updateAnnotations,
    setSelectedRegion,
    generateAnnotationContext,
  } = useImageAnnotation();

  // Handle annotation completion
  const handleAnnotationComplete = useCallback(
    (annotations: Annotation[], imageUrl: string) => {
      updateAnnotations(annotations);
      const context = generateAnnotationContext();
      onAnnotationComplete?.(context, imageUrl, annotations);
      closeAnnotationView();
    },
    [updateAnnotations, generateAnnotationContext, onAnnotationComplete, closeAnnotationView]
  );

  // Handle region selection for Q&A
  const handleRegionSelect = useCallback(
    (region: {
      type: "rectangle" | "circle" | "point";
      coordinates: { x: number; y: number; width?: number; height?: number; radius?: number };
    }) => {
      setSelectedRegion(region);
      if (annotatedImage) {
        onRegionQuestion?.(region, annotatedImage.imageUrl);
      }
    },
    [setSelectedRegion, annotatedImage, onRegionQuestion]
  );

  // If in annotation mode, show split layout
  if (isAnnotationMode && annotatedImage) {
    return (
      <SplitChatLayout
        imageUrl={annotatedImage.imageUrl}
        onClose={closeAnnotationView}
        onAnnotationComplete={handleAnnotationComplete}
        onRegionSelect={handleRegionSelect}
      >
        {children}
      </SplitChatLayout>
    );
  }

  // Otherwise, render children normally
  return <>{children}</>;
}

/**
 * Context for providing annotation functions to child components
 */
export const ImageAnnotationContext = React.createContext<{
  openAnnotationView: (imageUrl: string) => void;
  isAnnotationMode: boolean;
} | null>(null);

/**
 * Hook to access annotation functions from child components
 */
export function useImageAnnotationContext() {
  const context = React.useContext(ImageAnnotationContext);
  if (!context) {
    throw new Error(
      "useImageAnnotationContext must be used within an AnnotatedChatWrapper"
    );
  }
  return context;
}

/**
 * Provider component that exposes annotation functions to children
 */
export function AnnotatedChatProvider({
  children,
  onAnnotationComplete,
  onRegionQuestion,
}: AnnotatedChatWrapperProps) {
  const annotationHook = useImageAnnotation();

  const handleAnnotationComplete = useCallback(
    (annotations: Annotation[], imageUrl: string) => {
      annotationHook.updateAnnotations(annotations);
      const context = annotationHook.generateAnnotationContext();
      onAnnotationComplete?.(context, imageUrl, annotations);
      annotationHook.closeAnnotationView();
    },
    [annotationHook, onAnnotationComplete]
  );

  const handleRegionSelect = useCallback(
    (region: {
      type: "rectangle" | "circle" | "point";
      coordinates: { x: number; y: number; width?: number; height?: number; radius?: number };
    }) => {
      annotationHook.setSelectedRegion(region);
      if (annotationHook.annotatedImage) {
        onRegionQuestion?.(region, annotationHook.annotatedImage.imageUrl);
      }
    },
    [annotationHook, onRegionQuestion]
  );

  const contextValue = {
    openAnnotationView: annotationHook.openAnnotationView,
    isAnnotationMode: annotationHook.isAnnotationMode,
  };

  // If in annotation mode, show split layout
  if (annotationHook.isAnnotationMode && annotationHook.annotatedImage) {
    return (
      <ImageAnnotationContext.Provider value={contextValue}>
        <SplitChatLayout
          imageUrl={annotationHook.annotatedImage.imageUrl}
          onClose={annotationHook.closeAnnotationView}
          onAnnotationComplete={handleAnnotationComplete}
          onRegionSelect={handleRegionSelect}
        >
          {children}
        </SplitChatLayout>
      </ImageAnnotationContext.Provider>
    );
  }

  return (
    <ImageAnnotationContext.Provider value={contextValue}>
      {children}
    </ImageAnnotationContext.Provider>
  );
}
