"use client";

import React, { useState } from "react";
import { Button, Tooltip, Input, Divider, Badge, message } from "antd";
import {
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  Save,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ImageAnnotator, Annotation } from "./ImageAnnotator";
import { useAnnotation, AnnotatedImage } from "./AnnotationContext";
import { PRESET_LABELS } from "./AnnotationToolbar";

const { TextArea } = Input;

interface AnnotationPanelProps {
  onClose?: () => void;
  onOcrRequest?: () => void;
  onSaveToLibrary?: () => void;
  onAskAboutRegion?: (annotation: Annotation) => void;
}

export function AnnotationPanel({
  onClose,
  onOcrRequest,
  onSaveToLibrary,
  onAskAboutRegion,
}: AnnotationPanelProps) {
  const {
    currentImage,
    setCurrentImage,
    annotatedImages,
    updateAnnotatedImage,
    highlightedRegion,
    setHighlightedRegion,
    isOcrProcessing,
    ocrResult,
    setShowOcrFormModal,
  } = useAnnotation();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [remarkText, setRemarkText] = useState("");

  // Current image index for navigation
  const currentIndex = annotatedImages.findIndex((img) => img.id === currentImage?.id);

  // Handle annotation changes
  const handleAnnotationsChange = (annotations: Annotation[]) => {
    if (currentImage) {
      updateAnnotatedImage(currentImage.id, { annotations });
    }
  };

  // Handle region select
  const handleRegionSelect = (region: {
    type: string;
    coordinates: any;
    imageUrl: string;
    annotation?: Annotation;
  }) => {
    if (region.annotation) {
      setSelectedAnnotation(region.annotation);
      setRemarkText(region.annotation.remark || "");
    }
  };

  // Navigate to previous image
  const handlePrevImage = () => {
    if (currentIndex > 0) {
      setCurrentImage(annotatedImages[currentIndex - 1]);
      setSelectedAnnotation(null);
    }
  };

  // Navigate to next image
  const handleNextImage = () => {
    if (currentIndex < annotatedImages.length - 1) {
      setCurrentImage(annotatedImages[currentIndex + 1]);
      setSelectedAnnotation(null);
    }
  };

  // Update annotation remark
  const handleRemarkSave = () => {
    if (selectedAnnotation && currentImage) {
      const updatedAnnotations = currentImage.annotations.map((ann) =>
        ann.id === selectedAnnotation.id ? { ...ann, remark: remarkText } : ann
      );
      updateAnnotatedImage(currentImage.id, { annotations: updatedAnnotations });
      setSelectedAnnotation({ ...selectedAnnotation, remark: remarkText });
      message.success("备注已保存");
    }
  };

  // Handle ask about region
  const handleAskAboutRegion = () => {
    if (selectedAnnotation && onAskAboutRegion) {
      onAskAboutRegion(selectedAnnotation);
    }
  };

  // Handle save to library
  const handleSaveToLibrary = () => {
    if (ocrResult) {
      setShowOcrFormModal(true);
    } else if (onSaveToLibrary) {
      onSaveToLibrary();
    }
  };

  if (!currentImage) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>上传图片开始标注</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-white border-r ${
        isExpanded ? "fixed inset-0 z-50" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">图片标注</span>
          {annotatedImages.length > 1 && (
            <Badge
              count={`${currentIndex + 1}/${annotatedImages.length}`}
              style={{ backgroundColor: "#1890ff" }}
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip title={isExpanded ? "退出全屏" : "全屏"}>
            <Button
              type="text"
              size="small"
              icon={
                isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )
              }
              onClick={() => setIsExpanded(!isExpanded)}
            />
          </Tooltip>
          <Tooltip title="关闭">
            <Button
              type="text"
              size="small"
              icon={<X className="h-4 w-4" />}
              onClick={onClose}
            />
          </Tooltip>
        </div>
      </div>

      {/* Image Navigation (if multiple images) */}
      {annotatedImages.length > 1 && (
        <div className="flex items-center justify-between px-2 py-1 border-b bg-gray-50">
          <Button
            type="text"
            size="small"
            icon={<ChevronLeft className="h-4 w-4" />}
            onClick={handlePrevImage}
            disabled={currentIndex <= 0}
          >
            上一张
          </Button>
          <div className="flex gap-1 overflow-x-auto max-w-[200px]">
            {annotatedImages.map((img, idx) => (
              <button
                key={img.id}
                className={`w-8 h-8 rounded border overflow-hidden flex-shrink-0 ${
                  img.id === currentImage.id
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200"
                }`}
                onClick={() => setCurrentImage(img)}
              >
                <img
                  src={img.thumbnailUrl || img.url}
                  alt={`Image ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
          <Button
            type="text"
            size="small"
            icon={<ChevronRight className="h-4 w-4" />}
            onClick={handleNextImage}
            disabled={currentIndex >= annotatedImages.length - 1}
          >
            下一张
          </Button>
        </div>
      )}

      {/* Image Annotator */}
      <div className="flex-1 overflow-hidden">
        <ImageAnnotator
          imageUrl={currentImage.url}
          annotations={currentImage.annotations}
          onAnnotationsChange={handleAnnotationsChange}
          onRegionSelect={handleRegionSelect}
          highlightRegion={highlightedRegion || undefined}
        />
      </div>

      {/* Annotation List & Selected Annotation */}
      <div className="border-t bg-gray-50">
        {/* Annotation List */}
        {currentImage.annotations.length > 0 && (
          <div className="px-3 py-2 border-b">
            <div className="text-xs font-medium text-gray-500 mb-2">
              标注列表 ({currentImage.annotations.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {currentImage.annotations.map((ann) => (
                <button
                  key={ann.id}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                    selectedAnnotation?.id === ann.id
                      ? "bg-blue-100 text-blue-700"
                      : "bg-white border hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setSelectedAnnotation(ann);
                    setRemarkText(ann.remark || "");
                    setHighlightedRegion(ann.id);
                  }}
                  onMouseEnter={() => setHighlightedRegion(ann.id)}
                  onMouseLeave={() => setHighlightedRegion(null)}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: ann.color }}
                  />
                  <span>区域{ann.regionNumber}</span>
                  {ann.label && <span className="text-gray-500">: {ann.label}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Annotation Detail */}
        {selectedAnnotation && (
          <div className="px-3 py-2 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">
                区域 {selectedAnnotation.regionNumber}
                {selectedAnnotation.label && ` - ${selectedAnnotation.label}`}
              </span>
              <Button
                type="link"
                size="small"
                icon={<MessageSquare className="h-3 w-3" />}
                onClick={handleAskAboutRegion}
              >
                提问
              </Button>
            </div>
            <TextArea
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="添加备注..."
              rows={2}
              className="text-xs"
            />
            <Button
              type="primary"
              size="small"
              className="mt-2"
              onClick={handleRemarkSave}
            >
              保存备注
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="px-3 py-2 flex items-center gap-2">
          <Button
            size="small"
            icon={
              isOcrProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )
            }
            onClick={onOcrRequest}
            disabled={isOcrProcessing}
          >
            {isOcrProcessing ? "识别中..." : "OCR 识别"}
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<Save className="h-4 w-4" />}
            onClick={handleSaveToLibrary}
            disabled={!currentImage.annotations.length && !ocrResult}
          >
            入库
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AnnotationPanel;
