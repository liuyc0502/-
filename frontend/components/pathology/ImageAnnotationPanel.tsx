"use client";

import React, { useState } from "react";
import { ImageAnnotation } from "./ImageAnnotation";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { StaticScrollArea } from "@/components/ui/scrollArea";

interface ImageAnnotationPanelProps {
  images: Array<{
    url: string;
    name?: string;
  }>;
  onClose?: () => void;
  onAnnotationComplete?: (imageIndex: number, annotations: any[]) => void;
  className?: string;
}

export function ImageAnnotationPanel({
  images,
  onClose,
  onAnnotationComplete,
  className = "",
}: ImageAnnotationPanelProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (images.length === 0) return null;

  const currentImage = images[currentImageIndex];

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => Math.min(images.length - 1, prev + 1));
  };

  const handleAnnotationComplete = (annotations: any[]) => {
    onAnnotationComplete?.(currentImageIndex, annotations);
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden border-r bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Pathology Image Analysis</h3>
          {images.length > 1 && (
            <span className="text-xs text-gray-500">
              {currentImageIndex + 1} / {images.length}
            </span>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main annotation area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ImageAnnotation
          imageUrl={currentImage.url}
          onAnnotationComplete={handleAnnotationComplete}
          className="flex-1"
        />
      </div>

      {/* Image gallery at bottom */}
      {images.length > 1 && (
        <div className="border-t bg-gray-50 p-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevImage}
              disabled={currentImageIndex === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <StaticScrollArea className="flex-1 max-h-20">
              <div className="flex gap-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                      index === currentImageIndex
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.name || `Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === currentImageIndex && (
                      <div className="absolute inset-0 bg-blue-500 bg-opacity-10" />
                    )}
                  </button>
                ))}
              </div>
            </StaticScrollArea>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextImage}
              disabled={currentImageIndex === images.length - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
