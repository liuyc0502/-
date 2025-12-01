"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Select, Tooltip } from "antd";
import { Clock } from "lucide-react";
import patientService from "@/services/patientService";
import { conversationService } from "@/services/conversationService";
import type { TimelineStage } from "@/types/patient";

interface TimelineSelectorProps {
  conversationId: number | null;
  currentTimelineId?: number | null;
  currentTimelineName?: string | null;
  currentPatientId?: number | null;
  onTimelineChange?: (timelineId: number | null, timelineName: string | null) => void;
  disabled?: boolean;
}

interface PendingSelection {
  timelineId: number | null;
  timelineName: string | null;
}

// Helper function to extract text from option label for filtering
const getLabelText = (label: any): string => {
  if (typeof label === "string") {
    return label;
  }
  if (label?.props?.children) {
    const children = label.props.children;
    if (Array.isArray(children)) {
      return children.join("");
    }
    return String(children);
  }
  return "";
};

export function TimelineSelector({
  conversationId,
  currentTimelineId,
  currentTimelineName,
  currentPatientId,
  onTimelineChange,
  disabled = false,
}: TimelineSelectorProps) {
  const [timelines, setTimelines] = useState<TimelineStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTimelineId, setSelectedTimelineId] = useState<number | null>(
    currentTimelineId || null
  );

  // Track pending selection when no conversationId
  const pendingSelectionRef = useRef<PendingSelection | null>(null);
  const prevConversationIdRef = useRef<number | null>(null);

  // Load timeline list when patient is selected
  useEffect(() => {
    const loadTimelines = async () => {
      if (!currentPatientId) {
        setTimelines([]);
        return;
      }

      try {
        setLoading(true);
        const data = await patientService.getPatientTimeline(currentPatientId);
        setTimelines(data || []);
      } catch (error) {
        console.error("Failed to load timeline list:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTimelines();
  }, [currentPatientId]);

  // Update selected timeline when prop changes
  useEffect(() => {
    setSelectedTimelineId(currentTimelineId || null);
  }, [currentTimelineId]);

  useEffect(() => {
    const savePendingSelection = async () => {
      // Only save if conversationId just became available and we have a pending selection
      if (
        conversationId &&
        !prevConversationIdRef.current &&
        pendingSelectionRef.current
      ) {
        const { timelineId, timelineName } = pendingSelectionRef.current;
        try {
          await conversationService.linkTimeline({
            conversation_id: conversationId,
            timeline_id: timelineId,
            timeline_name: timelineName,
          });

          // Notify parent component
          if (onTimelineChange) {
            onTimelineChange(timelineId, timelineName);
          }
        } catch (error) {
          console.error("Failed to save pending timeline selection:", error);
        }
        pendingSelectionRef.current = null;
      }
      prevConversationIdRef.current = conversationId;
    };

    savePendingSelection();
  }, [conversationId, onTimelineChange]);

  // Handle timeline selection change
  const handleChange = async (value: number | string) => {
    // Convert empty string to null
    const timelineId = value === "" ? null : (value as number);
    const selectedTimeline = timelineId
      ? timelines.find((t) => t.timeline_id === timelineId)
      : null;
    const timelineName = selectedTimeline?.stage_title || null;

    // Update local state immediately
    setSelectedTimelineId(timelineId);

    // If no conversationId, store as pending selection
    if (!conversationId) {
      pendingSelectionRef.current = { timelineId, timelineName };
      // Still notify parent for UI update
      if (onTimelineChange) {
        onTimelineChange(timelineId, timelineName);
      }
      return;
    }

    // If we have conversationId, save immediately
    try {
      await conversationService.linkTimeline({
        conversation_id: conversationId,
        timeline_id: timelineId,
        timeline_name: timelineName,
      });

      // Notify parent component
      if (onTimelineChange) {
        onTimelineChange(timelineId, timelineName);
      }
    } catch (error) {
      console.error("Failed to link timeline:", error);
    }
  };

  // Memoize options to avoid recalculating on every render
  const options = useMemo(
    () => {
      const baseOptions = [
        {
          value: "",
          label: (
            <span style={{ color: "#999" }}>
              <Clock className="inline h-4 w-4 mr-2" />
              No timeline linked
            </span>
          ),
        },
        ...timelines.map((timeline) => ({
          value: timeline.timeline_id,
          label: (
            <span>
              <Clock className="inline h-4 w-4 mr-2" />
              {timeline.stage_title} ({new Date(timeline.stage_date).toLocaleDateString()})
            </span>
          ),
        })),
      ];

      // If current timeline is not in the fetched list, add a fallback option
      if (
        currentTimelineId &&
        !baseOptions.some((opt) => opt.value === currentTimelineId)
      ) {
        baseOptions.push({
          value: currentTimelineId,
          label: (
            <span>
              <Clock className="inline h-4 w-4 mr-2" />
              {currentTimelineName || `Timeline ${currentTimelineId}`}
            </span>
          ),
        });
      }

      return baseOptions;
    },
    [timelines, currentTimelineId, currentTimelineName]
  );

  // Filter option handler
  const filterOption = (input: string, option?: { label?: any }) => {
    if (!option?.label) return false;
    const text = getLabelText(option.label);
    return text.toLowerCase().includes(input.toLowerCase());
  };

  const showPendingHint = !conversationId && selectedTimelineId !== null;

  // Disable if no patient is selected
  const isDisabled = disabled || !currentPatientId;

  return (
    <Tooltip
      title={
        !currentPatientId
          ? "Please select a patient first"
          : showPendingHint
          ? "Will be saved when conversation starts"
          : ""
      }
      open={!currentPatientId || showPendingHint ? undefined : false}
    >
      <Select
        value={selectedTimelineId === null ? "" : selectedTimelineId}
        onChange={handleChange}
        options={options}
        placeholder="Select timeline"
        style={{ minWidth: 200 }}
        disabled={isDisabled}
        loading={loading}
        showSearch
        filterOption={filterOption}
        allowClear
      />
    </Tooltip>
  );
}
