"use client";

import { useState, useEffect, useRef } from "react";
import { Select, Tag, Tooltip } from "antd";
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
  // Track pending status when no conversationId
  const pendingStatusRef = useRef<string | null>(null);
  const prevConversationIdRef = useRef<number | null>(null);

  // Update selected status when prop changes
  useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus]);

  // Auto-save pending status when conversationId becomes available
  useEffect(() => {
    const savePendingStatus = async () => {
      if (
        conversationId &&
        !prevConversationIdRef.current &&
        pendingStatusRef.current
      ) {
        try {
          await conversationService.updateStatus({
            conversation_id: conversationId,
            status: pendingStatusRef.current as any,
          });

          if (onStatusChange) {
            onStatusChange(pendingStatusRef.current);
          }
        } catch (error) {
          console.error("Failed to save pending status:", error);
        }
        pendingStatusRef.current = null;
      }
      prevConversationIdRef.current = conversationId;
    };

    savePendingStatus();
  }, [conversationId, onStatusChange]);

  // Handle status change
  const handleChange = async (value: string) => {
    // Update local state immediately
    setSelectedStatus(value);

    // If no conversationId, store as pending
    if (!conversationId) {
      pendingStatusRef.current = value;
      if (onStatusChange) {
        onStatusChange(value);
      }
      return;
    }

    try {
      setLoading(true);

      // Call API to update status
      await conversationService.updateStatus({
        conversation_id: conversationId,
        status: value as any,
      });

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
 
  // Show hint when no conversation exists and status changed
  const showPendingHint = !conversationId && selectedStatus !== "active";

  return (
    <Tooltip
      title={showPendingHint ? "Will be saved when conversation starts" : ""}
      open={showPendingHint ? undefined : false}
    >
      <Select
        value={selectedStatus}
        onChange={handleChange}
        options={options}
        style={{ minWidth: 160 }}
        disabled={disabled || loading}
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
    </Tooltip>
  );
}