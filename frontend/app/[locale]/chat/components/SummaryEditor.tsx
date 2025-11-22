"use client";

import { useState, useEffect, useRef } from "react";
import { Input, Button } from "antd";
import { EditOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { conversationService } from "@/services/conversationService";

const { TextArea } = Input;

interface SummaryEditorProps {
  conversationId: number | null;
  currentSummary?: string;
  onSummaryChange?: (summary: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SummaryEditor({
  conversationId,
  currentSummary = "",
  onSummaryChange,
  disabled = false,
  placeholder = "Add a summary for this conversation...",
}: SummaryEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState(currentSummary);
  const [editValue, setEditValue] = useState(currentSummary);
  const [saving, setSaving] = useState(false);
  const textAreaRef = useRef<any>(null);

  // Update summary when prop changes
  useEffect(() => {
    setSummary(currentSummary);
    setEditValue(currentSummary);
  }, [currentSummary]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isEditing]);

  // Handle save
  const handleSave = async () => {
    if (!conversationId) return;

    const trimmedValue = editValue.trim();

    // Only save if changed
    if (trimmedValue === summary) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await conversationService.updateSummary({
        conversation_id: conversationId,
        summary: trimmedValue,
      });

      setSummary(trimmedValue);
      setIsEditing(false);

      // Notify parent
      if (onSummaryChange) {
        onSummaryChange(trimmedValue);
      }
    } catch (error) {
      console.error("Failed to save summary:", error);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setEditValue(summary);
    setIsEditing(false);
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSave();
    }
  };

  // Editing mode
  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <TextArea
          ref={textAreaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={saving}
          className="text-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            Save
          </Button>
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <span className="text-xs text-[#999]">Ctrl+Enter to save, Esc to cancel</span>
        </div>
      </div>
    );
  }

  // Display mode
  return (
    <div
      className={`group flex items-start gap-2 rounded-lg border border-transparent hover:border-[#E5E5E5] p-2 -m-2 transition-all ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
      onClick={() => !disabled && setIsEditing(true)}
    >
      <div className="flex-1 min-h-[24px]">
        {summary ? (
          <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{summary}</p>
        ) : (
          <p className="text-sm text-[#999] italic">{placeholder}</p>
        )}
      </div>
      {!disabled && (
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        />
      )}
    </div>
  );
}
