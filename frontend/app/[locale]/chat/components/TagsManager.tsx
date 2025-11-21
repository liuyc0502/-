"use client";

import { useState, useEffect, useRef } from "react";
import { Tag, Input, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { conversationService } from "@/services/conversationService";

interface TagsManagerProps {
  conversationId: number | null;
  currentTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  disabled?: boolean;
  maxTags?: number;
}

export function TagsManager({
  conversationId,
  currentTags = [],
  onTagsChange,
  disabled = false,
  maxTags = 10,
}: TagsManagerProps) {
  const [tags, setTags] = useState<string[]>(currentTags);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [editInputIndex, setEditInputIndex] = useState(-1);
  const [editInputValue, setEditInputValue] = useState("");
  const inputRef = useRef<any>(null);
  const editInputRef = useRef<any>(null);

  // Update tags when prop changes
  useEffect(() => {
    setTags(currentTags);
  }, [currentTags]);

  // Focus input when visible
  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  // Focus edit input when editing
  useEffect(() => {
    if (editInputIndex !== -1) {
      editInputRef.current?.focus();
    }
  }, [editInputIndex]);

  // Save tags to backend
  const saveTags = async (newTags: string[]) => {
    if (!conversationId) {
      return;
    }

    try {
      await conversationService.updateTags({
        conversation_id: conversationId,
        tags: newTags,
      });

      setTags(newTags);

      // Notify parent component
      if (onTagsChange) {
        onTagsChange(newTags);
      }
    } catch (error) {
      console.error("Failed to update tags:", error);
    }
  };

  // Handle tag close
  const handleClose = (removedTag: string) => {
    const newTags = tags.filter((tag) => tag !== removedTag);
    saveTags(newTags);
  };

  // Show input for adding new tag
  const showInput = () => {
    if (tags.length >= maxTags) {
      return;
    }
    setInputVisible(true);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Handle input confirm (add new tag)
  const handleInputConfirm = () => {
    const trimmedValue = inputValue.trim();

    if (trimmedValue && !tags.includes(trimmedValue)) {
      const newTags = [...tags, trimmedValue];
      saveTags(newTags);
    }

    setInputVisible(false);
    setInputValue("");
  };

  // Handle edit tag double click
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditInputValue(e.target.value);
  };

  // Handle edit tag confirm
  const handleEditInputConfirm = () => {
    const trimmedValue = editInputValue.trim();
    const newTags = [...tags];

    if (trimmedValue && !newTags.includes(trimmedValue)) {
      newTags[editInputIndex] = trimmedValue;
      saveTags(newTags);
    }

    setEditInputIndex(-1);
    setEditInputValue("");
  };

  // Tag colors
  const tagColors = [
    "magenta",
    "red",
    "volcano",
    "orange",
    "gold",
    "lime",
    "green",
    "cyan",
    "blue",
    "geekblue",
    "purple",
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {tags.map((tag, index) => {
        // Edit mode
        if (editInputIndex === index) {
          return (
            <Input
              ref={editInputRef}
              key={tag}
              size="small"
              style={{ width: 80 }}
              value={editInputValue}
              onChange={handleEditInputChange}
              onBlur={handleEditInputConfirm}
              onPressEnter={handleEditInputConfirm}
            />
          );
        }

        // Display mode
        const isLongTag = tag.length > 20;
        const tagElem = (
          <Tag
            key={tag}
            closable={!disabled}
            color={tagColors[index % tagColors.length]}
            onClose={() => handleClose(tag)}
            style={{ userSelect: "none" }}
            onDoubleClick={(e) => {
              if (disabled) return;
              setEditInputIndex(index);
              setEditInputValue(tag);
              e.preventDefault();
            }}
          >
            {isLongTag ? `${tag.slice(0, 20)}...` : tag}
          </Tag>
        );

        return isLongTag ? (
          <Tooltip title={tag} key={tag}>
            {tagElem}
          </Tooltip>
        ) : (
          tagElem
        );
      })}

      {/* Add tag input */}
      {inputVisible ? (
        <Input
          ref={inputRef}
          type="text"
          size="small"
          style={{ width: 80 }}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputConfirm}
          onPressEnter={handleInputConfirm}
        />
      ) : (
        <Tag
          onClick={showInput}
          style={{
            background: "#fff",
            borderStyle: "dashed",
            cursor: disabled || tags.length >= maxTags ? "not-allowed" : "pointer",
            opacity: disabled || tags.length >= maxTags ? 0.5 : 1,
          }}
        >
          <PlusOutlined /> Add Tag
        </Tag>
      )}
    </div>
  );
}
