"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnnotationProvider } from "./AnnotationContext";
import { AnnotationPanel } from "./AnnotationPanel";
import { OcrResultFormModal } from "@/components/doctor/ocr/OcrResultFormModal";

interface ImageAnnotationModalProps {
  imageUrl?: string;
  imageFile?: File;
  imageName?: string;
  onClose: () => void;
  onSave?: (data: {
    imageUrl: string;
    annotations: any[];
    ocrText?: string;
    savedTo?: "case" | "patient";
  }) => void;
}

/**
 * Image Annotation Modal Component
 * Integrates annotation, OCR, and save workflow in a full-screen modal
 * Supports both URL-based images and local File objects
 */
export function ImageAnnotationModal({
  imageUrl,
  imageFile,
  imageName = "image.png",
  onClose,
  onSave,
}: ImageAnnotationModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);

  // Create local URL from File object if provided
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setLocalImageUrl(url);

      // Cleanup URL when component unmounts
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [imageFile]);

  // Use provided imageUrl or generated localImageUrl
  const displayImageUrl = imageUrl || localImageUrl;
  const displayImageName = imageName || imageFile?.name || "image.png";

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save annotation:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Don't render if no image source is available
  if (!displayImageUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-[95vw] max-h-[95vh] bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              医学影像标注与识别
            </h2>
            <span className="text-sm text-gray-500">{displayImageName}</span>
            {imageFile && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                本地文件
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Modal Content - Annotation Panel */}
        <div className="flex-1 overflow-hidden">
          <AnnotationProvider initialImageUrl={displayImageUrl}>
            <AnnotationPanel
              onClose={onClose}
              showCloseButton={false}
              enableOcr={true}
              enableSave={true}
            />
            {/* OCR Result Form Modal will be rendered by AnnotationContext */}
          </AnnotationProvider>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            提示：标注病灶区域，点击 OCR 识别文字，保存到病例库或患者档案
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              取消
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
