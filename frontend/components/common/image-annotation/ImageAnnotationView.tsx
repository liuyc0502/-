"use client";

import { useState, useEffect } from "react";
import { message, Spin } from "antd";
import { AnnotationCanvas } from "./AnnotationCanvas";
import { AnnotationToolbar } from "./AnnotationToolbar";
import { AnnotationList } from "./AnnotationList";
import type {
  Annotation,
  AnnotationType,
  AnnotationCoordinates,
} from "@/types/annotation";
import { ANNOTATION_COLORS } from "@/types/annotation";
import { annotationService } from "@/services/annotationService";

interface ImageAnnotationViewProps {
  imageId: number;
  imageUrl: string;
  onClose?: () => void;
  chatComponent?: React.ReactNode; // Optional chat interface on the right
}

export function ImageAnnotationView({
  imageId,
  imageUrl,
  onClose,
  chatComponent,
}: ImageAnnotationViewProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'circle' | 'rectangle' | null>(null);
  const [selectedType, setSelectedType] = useState<AnnotationType>('lesion');
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<number | null>(null);

  const currentColor = ANNOTATION_COLORS[selectedType];

  // Load annotations
  useEffect(() => {
    loadAnnotations();
  }, [imageId]);

  const loadAnnotations = async () => {
    try {
      setLoading(true);
      const data = await annotationService.getAnnotations(imageId);
      setAnnotations(data);
    } catch (error) {
      message.error("加载标注失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnotationCreated = async (coords: AnnotationCoordinates) => {
    try {
      const result = await annotationService.createAnnotation({
        image_id: imageId,
        annotation_type: selectedType,
        annotation_shape: coords.shape,
        coordinates: coords,
        annotation_color: currentColor,
        annotation_label: "",
      });

      message.success(`已创建${result.message}`);
      await loadAnnotations();
    } catch (error) {
      message.error("创建标注失败");
      console.error(error);
    }
  };

  const handleAnnotationUpdate = async (annotationId: number, label: string) => {
    try {
      await annotationService.updateAnnotation(annotationId, {
        annotation_label: label,
      });
      message.success("标注已更新");
      await loadAnnotations();
    } catch (error) {
      message.error("更新标注失败");
      console.error(error);
    }
  };

  const handleAnnotationDelete = async (annotationId: number) => {
    try {
      await annotationService.deleteAnnotation(annotationId);
      message.success("标注已删除");
      await loadAnnotations();
      if (highlightedAnnotationId === annotationId) {
        setHighlightedAnnotationId(null);
      }
    } catch (error) {
      message.error("删除标注失败");
      console.error(error);
    }
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    setHighlightedAnnotationId(
      annotation.annotation_id === highlightedAnnotationId
        ? null
        : annotation.annotation_id
    );
  };

  const handleClearAll = async () => {
    try {
      // Delete all annotations
      await Promise.all(
        annotations.map((ann) =>
          annotationService.deleteAnnotation(ann.annotation_id)
        )
      );
      message.success("已清除所有标注");
      setAnnotations([]);
      setHighlightedAnnotationId(null);
    } catch (error) {
      message.error("清除标注失败");
      console.error(error);
    }
  };

  if (loading && annotations.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large">
          <span className="text-gray-500 ml-3">加载标注中...</span>
        </Spin>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Toolbar - Fixed at top */}
      <div className="flex-shrink-0 p-3 bg-white border-b">
        <AnnotationToolbar
          drawingMode={drawingMode}
          onDrawingModeChange={setDrawingMode}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          currentColor={currentColor}
          onClear={annotations.length > 0 ? handleClearAll : undefined}
        />
      </div>

      {/* Main content area - No scrolling on container */}
      <div className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0">
        {/* Canvas - Takes remaining space, centered */}
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-white rounded border">
          <div className="max-w-full max-h-full">
            <AnnotationCanvas
              imageUrl={imageUrl}
              width={600}
              height={450}
              annotations={annotations}
              drawingMode={drawingMode}
              currentColor={currentColor}
              onAnnotationCreated={handleAnnotationCreated}
              onAnnotationClick={handleAnnotationClick}
              highlightedAnnotationId={highlightedAnnotationId}
            />
          </div>
        </div>

        {/* Annotation list - Fixed width, scrollable */}
        <div className="w-52 flex-shrink-0 overflow-y-auto bg-white rounded border">
          <AnnotationList
            annotations={annotations}
            onAnnotationClick={handleAnnotationClick}
            onAnnotationUpdate={handleAnnotationUpdate}
            onAnnotationDelete={handleAnnotationDelete}
            highlightedAnnotationId={highlightedAnnotationId}
          />
        </div>
      </div>
    </div>
  );
}
