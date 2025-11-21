"use client";

import { useState, useEffect } from "react";
import { Select, Tag } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { conversationService } from "@/services/conversationService";

interface ConversationStatusProps {
  conversationId: number | null;
  currentStatus?: string;
  onStatusChange?: (status: string) => void;
  disabled?: boolean;
}

// Status configuration
const STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "blue",
    icon: <FileTextOutlined />,
  },
  pending_followup: {
    label: "Pending Follow-up",
    color: "orange",
    icon: <ClockCircleOutlined />,
  },
  difficult_case: {
    label: "Difficult Case",
    color: "red",
    icon: <ExclamationCircleOutlined />,
  },
  completed: {
    label: "Completed",
    color: "green",
    icon: <CheckCircleOutlined />,
  },
  archived: {
    label: "Archived",
    color: "default",
    icon: <InboxOutlined />,
  },
} as const;

type StatusType = keyof typeof STATUS_CONFIG;

export function ConversationStatus({
  conversationId,
  currentStatus = "active",
  onStatusChange,
  disabled = false,
}: ConversationStatusProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus);
  const [loading, setLoading] = useState(false);

  // Update selected status when prop changes
  useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus]);

  // Handle status change
  const handleChange = async (value: string) => {
    if (!conversationId) {
      return;
    }

    try {
      setLoading(true);

      // Call API to update status
      await conversationService.updateStatus({
        conversation_id: conversationId,
        status: value as any,
      });

      setSelectedStatus(value);

      // Notify parent component
      if (onStatusChange) {
        onStatusChange(value);
      }
    } catch (error) {
      console.error("Failed to update conversation status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate options
  const options = Object.entries(STATUS_CONFIG).map(([key, config]) => ({
    value: key,
    label: (
      <span>
        {config.icon}
        <span style={{ marginLeft: 8 }}>{config.label}</span>
      </span>
    ),
  }));

  // Current status config
  const currentConfig =
    STATUS_CONFIG[selectedStatus as StatusType] || STATUS_CONFIG.active;

  return (
    <Select
      value={selectedStatus}
      onChange={handleChange}
      options={options}
      style={{ minWidth: 160 }}
      disabled={disabled || !conversationId || loading}
      loading={loading}
      tagRender={(props) => {
        const { value } = props;
        const config =
          STATUS_CONFIG[value as StatusType] || STATUS_CONFIG.active;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      }}
    />
  );
}
