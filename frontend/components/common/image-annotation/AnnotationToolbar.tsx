"use client";

import { Button, Space, Select, Tooltip } from "antd";
import {
  BorderOutlined,
  RadiusSettingOutlined,
  EditOutlined,
  DeleteOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import type { AnnotationType } from "@/types/annotation";
import { ANNOTATION_COLORS, ANNOTATION_TYPE_LABELS } from "@/types/annotation";

interface AnnotationToolbarProps {
  drawingMode: 'circle' | 'rectangle' | null;
  onDrawingModeChange: (mode: 'circle' | 'rectangle' | null) => void;
  selectedType: AnnotationType;
  onTypeChange: (type: AnnotationType) => void;
  currentColor: string;
  onClear?: () => void;
}

export function AnnotationToolbar({
  drawingMode,
  onDrawingModeChange,
  selectedType,
  onTypeChange,
  currentColor,
  onClear,
}: AnnotationToolbarProps) {
  return (
    <div className="bg-white border rounded p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Drawing tools */}
        <Space size="middle">
          <span className="text-gray-700 font-medium">绘制工具：</span>
          <Tooltip title="圆形标注">
            <Button
              type={drawingMode === 'circle' ? 'primary' : 'default'}
              icon={<RadiusSettingOutlined />}
              onClick={() => onDrawingModeChange(drawingMode === 'circle' ? null : 'circle')}
            >
              圆形
            </Button>
          </Tooltip>
          <Tooltip title="矩形标注">
            <Button
              type={drawingMode === 'rectangle' ? 'primary' : 'default'}
              icon={<BorderOutlined />}
              onClick={() => onDrawingModeChange(drawingMode === 'rectangle' ? null : 'rectangle')}
            >
              矩形
            </Button>
          </Tooltip>
          <Tooltip title="停止绘制">
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() => onDrawingModeChange(null)}
              disabled={!drawingMode}
            >
              选择
            </Button>
          </Tooltip>
        </Space>

        {/* Annotation type selector */}
        <Space size="middle">
          <span className="text-gray-700 font-medium">标注类型：</span>
          <Select
            value={selectedType}
            onChange={onTypeChange}
            style={{ width: 150 }}
          >
            {(Object.keys(ANNOTATION_TYPE_LABELS) as AnnotationType[]).map((type) => (
              <Select.Option key={type} value={type}>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: ANNOTATION_COLORS[type] }}
                  />
                  <span>{ANNOTATION_TYPE_LABELS[type]}</span>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Space>

        {/* Clear button */}
        {onClear && (
          <Tooltip title="清除所有标注">
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={onClear}
            >
              清除全部
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Current color indicator */}
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center space-x-2">
          <span className="text-gray-600 text-sm">当前颜色：</span>
          <div
            className="w-6 h-6 rounded border-2 border-gray-300"
            style={{ backgroundColor: currentColor }}
          />
          <span className="text-gray-700 font-medium">
            {ANNOTATION_TYPE_LABELS[selectedType]}
          </span>
        </div>
      </div>
    </div>
  );
}
