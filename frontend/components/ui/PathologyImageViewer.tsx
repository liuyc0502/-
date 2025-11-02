"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card } from "./card";
import { ScrollArea } from "./scrollArea";
import { Button } from "./button";
import { ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

/**
 * Annotation coordinates and metadata
 */
export interface PathologyAnnotation {
  term: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  description: string;
}

/**
 * Pathology image data structure
 */
export interface PathologyImageData {
  imageUrl: string;
  caseTitle: string;
  caseDescription?: string;
  annotations: PathologyAnnotation[];
  keywords?: string[];
}

interface PathologyImageViewerProps {
  data: PathologyImageData;
  className?: string;
}

/**
 * Interactive pathology image viewer with clickable annotations
 *
 * Features:
 * - Display pathology images with annotations
 * - Click terms to show arrows pointing to corresponding regions
 * - Zoom and pan controls
 * - Responsive design
 */
export const PathologyImageViewer: React.FC<PathologyImageViewerProps> = ({
  data,
  className = "",
}) => {
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [isExpanded, setIsExpanded] = useState(true);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update image dimensions when loaded
  useEffect(() => {
    if (imageRef.current && imageLoaded) {
      setImageDimensions({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
      });
    }
  }, [imageLoaded]);

  // Handle term click
  const handleTermClick = (term: string) => {
    setSelectedTerm(selectedTerm === term ? null : term);

    // Scroll to image if term is selected
    if (selectedTerm !== term && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Get annotation for selected term
  const selectedAnnotation = data.annotations.find(
    (ann) => ann.term === selectedTerm
  );

  // Calculate arrow position and size relative to current image dimensions
  const getAnnotationStyle = (annotation: PathologyAnnotation) => {
    if (!imageRef.current || !imageLoaded) return {};

    const imgWidth = imageRef.current.clientWidth;
    const imgHeight = imageRef.current.clientHeight;
    const naturalWidth = imageRef.current.naturalWidth;
    const naturalHeight = imageRef.current.naturalHeight;

    // Scale coordinates from natural size to displayed size
    const scaleX = imgWidth / naturalWidth;
    const scaleY = imgHeight / naturalHeight;

    const x = annotation.coordinates.x * scaleX;
    const y = annotation.coordinates.y * scaleY;
    const width = annotation.coordinates.width * scaleX;
    const height = annotation.coordinates.height * scaleY;

    return {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {data.caseTitle}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 p-0"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Case Description */}
          {data.caseDescription && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data.caseDescription}
            </p>
          )}

          {/* Image Container with Controls */}
          <div className="space-y-2">
            {/* Zoom Controls */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="h-8 px-2"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[4rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="h-8 px-2"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetZoom}
                disabled={zoom === 1}
                className="h-8 px-2"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Image with Annotations */}
            <div
              ref={containerRef}
              className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-auto bg-gray-100 dark:bg-gray-900"
              style={{ maxHeight: "500px" }}
            >
              <div
                className="relative inline-block"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  transition: "transform 0.2s ease-in-out",
                }}
              >
                <img
                  ref={imageRef}
                  src={data.imageUrl}
                  alt={data.caseTitle}
                  onLoad={() => setImageLoaded(true)}
                  className="max-w-full h-auto"
                />

                {/* Annotation Overlay */}
                {selectedAnnotation && imageLoaded && (
                  <div
                    className="absolute border-4 border-red-500 bg-red-500/20 pointer-events-none"
                    style={getAnnotationStyle(selectedAnnotation)}
                  >
                    {/* Arrow pointing to center of annotation */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <svg
                        width="60"
                        height="60"
                        viewBox="0 0 60 60"
                        className="drop-shadow-lg"
                      >
                        {/* Arrow shaft */}
                        <line
                          x1="30"
                          y1="0"
                          x2="30"
                          y2="40"
                          stroke="#ef4444"
                          strokeWidth="3"
                        />
                        {/* Arrow head */}
                        <polygon
                          points="30,50 20,35 40,35"
                          fill="#ef4444"
                        />
                      </svg>
                    </div>

                    {/* Label */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded text-xs font-semibold whitespace-nowrap shadow-lg">
                      {selectedAnnotation.term}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Annotations List */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Anatomical Structures ({data.annotations.length})
            </h4>
            <ScrollArea className="h-64 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-2 space-y-1">
                {data.annotations.map((annotation, index) => (
                  <button
                    key={`${annotation.term}-${index}`}
                    onClick={() => handleTermClick(annotation.term)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedTerm === annotation.term
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{annotation.term}</div>
                        {selectedTerm === annotation.term && annotation.description && (
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {annotation.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Keywords */}
          {data.keywords && data.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.keywords.map((keyword, index) => (
                <span
                  key={`${keyword}-${index}`}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
