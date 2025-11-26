"use client";

import { List, Button, Input, Space, Popconfirm, Tag, Typography } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import type { Annotation } from "@/types/annotation";
import { ANNOTATION_TYPE_LABELS } from "@/types/annotation";

const { Text } = Typography;

interface AnnotationListProps {
  annotations: Annotation[];
  onAnnotationClick: (annotation: Annotation) => void;
  onAnnotationUpdate: (annotationId: number, label: string) => void;
  onAnnotationDelete: (annotationId: number) => void;
  highlightedAnnotationId?: number | null;
}

export function AnnotationList({
  annotations,
  onAnnotationClick,
  onAnnotationUpdate,
  onAnnotationDelete,
  highlightedAnnotationId,
}: AnnotationListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const handleEditStart = (annotation: Annotation) => {
    setEditingId(annotation.annotation_id);
    setEditingLabel(annotation.annotation_label || "");
  };

  const handleEditSave = (annotationId: number) => {
    onAnnotationUpdate(annotationId, editingLabel);
    setEditingId(null);
    setEditingLabel("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingLabel("");
  };

  return (
    <div className="bg-white border rounded">
      <div className="p-4 border-b bg-gray-50">
        <Text strong>标注列表 ({annotations.length})</Text>
      </div>
      <List
        dataSource={annotations}
        locale={{ emptyText: "暂无标注" }}
        renderItem={(annotation) => {
          const isHighlighted = annotation.annotation_id === highlightedAnnotationId;
          const isEditing = editingId === annotation.annotation_id;

          return (
            <List.Item
              className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                isHighlighted ? "bg-blue-50 border-l-4 border-blue-500" : ""
              }`}
              onClick={() => !isEditing && onAnnotationClick(annotation)}
            >
              <div className="w-full px-2">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: annotation.annotation_color }}
                    />
                    <Text strong>{annotation.region_name}</Text>
                    <Tag color={annotation.annotation_color}>
                      {ANNOTATION_TYPE_LABELS[annotation.annotation_type]}
                    </Tag>
                  </div>
                  {isHighlighted && (
                    <EyeOutlined className="text-blue-500" />
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      placeholder="输入标注描述"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Space>
                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSave(annotation.annotation_id);
                        }}
                      >
                        保存
                      </Button>
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCancel();
                        }}
                      >
                        取消
                      </Button>
                    </Space>
                  </div>
                ) : (
                  <>
                    <Text type="secondary" className="block mb-2">
                      {annotation.annotation_label || "无描述"}
                    </Text>
                    <Space size="small">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStart(annotation);
                        }}
                      >
                        编辑
                      </Button>
                      <Popconfirm
                        title="确认删除此标注？"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          onAnnotationDelete(annotation.annotation_id);
                        }}
                        okText="确认"
                        cancelText="取消"
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        >
                          删除
                        </Button>
                      </Popconfirm>
                    </Space>
                  </>
                )}
              </div>
            </List.Item>
          );
        }}
      />
    </div>
  );
}
