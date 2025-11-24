"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Annotation } from "./ImageAnnotator";

export interface AnnotatedImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  annotations: Annotation[];
  ocrText?: string;
  ocrMetadata?: any;
  fileName?: string;
  fileType?: string;
}

export interface AnnotationContextType {
  // Annotation mode state
  isAnnotationMode: boolean;
  setAnnotationMode: (mode: boolean) => void;

  // Current image being annotated
  currentImage: AnnotatedImage | null;
  setCurrentImage: (image: AnnotatedImage | null) => void;

  // All annotated images in current session
  annotatedImages: AnnotatedImage[];
  addAnnotatedImage: (image: AnnotatedImage) => void;
  updateAnnotatedImage: (id: string, updates: Partial<AnnotatedImage>) => void;
  removeAnnotatedImage: (id: string) => void;

  // Highlighted region (for chat interaction)
  highlightedRegion: string | null;
  setHighlightedRegion: (regionId: string | null) => void;

  // OCR state
  isOcrProcessing: boolean;
  setOcrProcessing: (processing: boolean) => void;
  ocrResult: any | null;
  setOcrResult: (result: any | null) => void;

  // Form modal state
  showOcrFormModal: boolean;
  setShowOcrFormModal: (show: boolean) => void;

  // Utility functions
  getAnnotationById: (imageId: string, annotationId: string) => Annotation | undefined;
  updateAnnotation: (imageId: string, annotationId: string, updates: Partial<Annotation>) => void;
  clearAllAnnotations: () => void;
}

const AnnotationContext = createContext<AnnotationContextType | undefined>(undefined);

interface AnnotationProviderProps {
  children: ReactNode;
}

export function AnnotationProvider({ children }: AnnotationProviderProps) {
  // Annotation mode
  const [isAnnotationMode, setAnnotationMode] = useState(false);

  // Current image
  const [currentImage, setCurrentImage] = useState<AnnotatedImage | null>(null);

  // All annotated images
  const [annotatedImages, setAnnotatedImages] = useState<AnnotatedImage[]>([]);

  // Highlighted region
  const [highlightedRegion, setHighlightedRegion] = useState<string | null>(null);

  // OCR state
  const [isOcrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);

  // Form modal
  const [showOcrFormModal, setShowOcrFormModal] = useState(false);

  // Add annotated image
  const addAnnotatedImage = useCallback((image: AnnotatedImage) => {
    setAnnotatedImages((prev) => {
      const existing = prev.find((img) => img.id === image.id);
      if (existing) {
        return prev.map((img) => (img.id === image.id ? { ...img, ...image } : img));
      }
      return [...prev, image];
    });
  }, []);

  // Update annotated image
  const updateAnnotatedImage = useCallback(
    (id: string, updates: Partial<AnnotatedImage>) => {
      setAnnotatedImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, ...updates } : img))
      );
      // Also update current image if it's the same
      if (currentImage?.id === id) {
        setCurrentImage((prev) => (prev ? { ...prev, ...updates } : prev));
      }
    },
    [currentImage]
  );

  // Remove annotated image
  const removeAnnotatedImage = useCallback(
    (id: string) => {
      setAnnotatedImages((prev) => prev.filter((img) => img.id !== id));
      if (currentImage?.id === id) {
        setCurrentImage(null);
      }
    },
    [currentImage]
  );

  // Get annotation by ID
  const getAnnotationById = useCallback(
    (imageId: string, annotationId: string): Annotation | undefined => {
      const image = annotatedImages.find((img) => img.id === imageId);
      return image?.annotations.find((ann) => ann.id === annotationId);
    },
    [annotatedImages]
  );

  // Update specific annotation
  const updateAnnotation = useCallback(
    (imageId: string, annotationId: string, updates: Partial<Annotation>) => {
      setAnnotatedImages((prev) =>
        prev.map((img) => {
          if (img.id === imageId) {
            return {
              ...img,
              annotations: img.annotations.map((ann) =>
                ann.id === annotationId ? { ...ann, ...updates } : ann
              ),
            };
          }
          return img;
        })
      );
    },
    []
  );

  // Clear all annotations
  const clearAllAnnotations = useCallback(() => {
    setAnnotatedImages([]);
    setCurrentImage(null);
    setHighlightedRegion(null);
    setOcrResult(null);
  }, []);

  const value: AnnotationContextType = {
    isAnnotationMode,
    setAnnotationMode,
    currentImage,
    setCurrentImage,
    annotatedImages,
    addAnnotatedImage,
    updateAnnotatedImage,
    removeAnnotatedImage,
    highlightedRegion,
    setHighlightedRegion,
    isOcrProcessing,
    setOcrProcessing,
    ocrResult,
    setOcrResult,
    showOcrFormModal,
    setShowOcrFormModal,
    getAnnotationById,
    updateAnnotation,
    clearAllAnnotations,
  };

  return (
    <AnnotationContext.Provider value={value}>
      {children}
    </AnnotationContext.Provider>
  );
}

export function useAnnotation() {
  const context = useContext(AnnotationContext);
  if (context === undefined) {
    throw new Error("useAnnotation must be used within an AnnotationProvider");
  }
  return context;
}

export default AnnotationContext;
