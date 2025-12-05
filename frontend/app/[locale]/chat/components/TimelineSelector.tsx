"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Select, Tooltip, Modal, Form, Input, DatePicker, message } from "antd";
import { Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import patientService from "@/services/patientService";
import { conversationService } from "@/services/conversationService";
import type { TimelineStage, CreateTimelineRequest } from "@/types/patient";

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
  const [selectedTimelineId, setSelectedTimelineId] = useState<number | null>(() => {
    // First check if we have currentTimelineId from props
    if (currentTimelineId) return currentTimelineId;

    // If not, check if we have a pending selection in localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pendingTimelineSelection');
        if (stored) {
          const pending = JSON.parse(stored);
          return pending.timelineId;
        }
      } catch (error) {
        console.error('Failed to parse pending timeline selection:', error);
      }
    }

    return null;
  });

  // Track pending selection when no conversationId - use localStorage for persistence
  const getPendingSelection = (): PendingSelection | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('pendingTimelineSelection');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to parse pending timeline selection from localStorage:', error);
      return null;
    }
  };

  const setPendingSelection = (selection: PendingSelection | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (selection) {
        localStorage.setItem('pendingTimelineSelection', JSON.stringify(selection));
      } else {
        localStorage.removeItem('pendingTimelineSelection');
      }
    } catch (error) {
      console.error('Failed to save pending timeline selection to localStorage:', error);
    }
  };

  const prevConversationIdRef = useRef<number | null>(null);

  // New timeline modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  // Load timeline list when patient is selected
  useEffect(() => {
    const loadTimelines = async () => {
      console.log('[TimelineSelector] currentPatientId changed:', currentPatientId);

      if (!currentPatientId) {
        console.log('[TimelineSelector] No patient selected, clearing timelines');
        setTimelines([]);
        setSelectedTimelineId(null);
        return;
      }

      console.log('[TimelineSelector] Loading timelines for patient:', currentPatientId);
      try {
        setLoading(true);
        const data = await patientService.getPatientTimeline(currentPatientId);
        console.log('[TimelineSelector] Loaded timelines:', data);
        setTimelines(data || []);
      } catch (error) {
        console.error("Failed to load timeline list:", error);
        setTimelines([]);
      } finally {
        setLoading(false);
      }
    };

    loadTimelines();
  }, [currentPatientId]);

  // Initialize from pending selection on mount if no conversationId
  useEffect(() => {
    if (!conversationId && !currentTimelineId) {
      const pendingSelection = getPendingSelection();
      if (pendingSelection) {
        console.log('[TimelineSelector] Restoring pending selection on mount:', pendingSelection);
        setSelectedTimelineId(pendingSelection.timelineId);
        // Notify parent to update UI
        if (onTimelineChange) {
          onTimelineChange(pendingSelection.timelineId, pendingSelection.timelineName);
        }
      }
    }
  }, []); // Run only on mount

  // Update selected timeline when prop changes
  useEffect(() => {
    setSelectedTimelineId(currentTimelineId || null);
  }, [currentTimelineId]);

  useEffect(() => {
    const savePendingSelection = async () => {
      // Only save if conversationId just became available and we have a pending selection
      if (
        conversationId &&
        !prevConversationIdRef.current
      ) {
        const pendingSelection = getPendingSelection();
        if (pendingSelection) {
          const { timelineId, timelineName } = pendingSelection;
          console.log('[TimelineSelector] Saving pending timeline selection:', { conversationId, timelineId, timelineName });
          try {
            await conversationService.linkTimeline({
              conversation_id: conversationId,
              timeline_id: timelineId,
              timeline_name: timelineName,
            });

            console.log('[TimelineSelector] Successfully saved pending timeline selection');

            // Notify parent component
            if (onTimelineChange) {
              onTimelineChange(timelineId, timelineName);
            }

            // Clear pending selection after successfully saving
            setPendingSelection(null);
          } catch (error) {
            console.error("Failed to save pending timeline selection:", error);
          }
        }
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

    console.log('[TimelineSelector] Timeline selection changed:', { conversationId, timelineId, timelineName });

    // If no conversationId, store as pending selection
    if (!conversationId) {
      console.log('[TimelineSelector] No conversationId yet, storing as pending selection');
      setPendingSelection({ timelineId, timelineName });
      // Still notify parent for UI update
      if (onTimelineChange) {
        onTimelineChange(timelineId, timelineName);
      }
      return;
    }

    // If we have conversationId, save immediately
    console.log('[TimelineSelector] ConversationId exists, saving immediately');
    try {
      await conversationService.linkTimeline({
        conversation_id: conversationId,
        timeline_id: timelineId,
        timeline_name: timelineName,
      });

      console.log('[TimelineSelector] Successfully linked timeline to conversation');

      // Clear any pending selection since we just saved
      setPendingSelection(null);

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

  // Helper function to format date to YYYY-MM-DD
  const formatDate = (dateValue: any): string => {
    if (!dateValue) {
      throw new Error("Date is required");
    }
    
    let date: Date;
    
    // Handle dayjs object (from Ant Design DatePicker) - convert to native Date
    if (dateValue && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    }
    // Handle native Date object
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    // Handle string - parse it
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        // If parsing fails, assume it's already in YYYY-MM-DD format
        return dateValue;
      }
    }
    else {
      throw new Error('Invalid date format');
    }
    
    // Format to YYYY-MM-DD using native Date methods
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle create new timeline
  const handleCreateTimeline = async (values: any) => {
    if (!currentPatientId) {
      message.error("请先选择患者");
      return;
    }

    setCreating(true);
    try {
      const timelineData: CreateTimelineRequest = {
        patient_id: currentPatientId,
        stage_type: values.stage_type,
        stage_date: formatDate(values.stage_date),
        stage_title: values.stage_title,
        diagnosis: values.diagnosis || "",
        status: "current",
        display_order: 0,
      };

      const result = await patientService.createTimelineStage(timelineData);
      const newTimelineId = result.timeline_id;
      const newTimelineName = values.stage_title;

      message.success("时间线创建成功");

      // Reload timeline list
      const updatedTimelines = await patientService.getPatientTimeline(currentPatientId);
      setTimelines(updatedTimelines || []);

      // Auto-select the newly created timeline
      setSelectedTimelineId(newTimelineId);

      // Link to conversation if conversationId exists
      if (conversationId) {
        await conversationService.linkTimeline({
          conversation_id: conversationId,
          timeline_id: newTimelineId,
          timeline_name: newTimelineName,
        });
        // Clear any pending selection since we just saved
        setPendingSelection(null);
      } else {
        // Store as pending selection
        setPendingSelection({
          timelineId: newTimelineId,
          timelineName: newTimelineName,
        });
      }

      // Notify parent component
      if (onTimelineChange) {
        onTimelineChange(newTimelineId, newTimelineName);
      }

      // Close modal and reset form
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error("Failed to create timeline:", error);
      message.error("创建时间线失败");
    } finally {
      setCreating(false);
    }
  };

  const showPendingHint = !conversationId && selectedTimelineId !== null;

  // Disable if no patient is selected
  const isDisabled = disabled || !currentPatientId;

  return (
    <>
      <div className="flex items-center gap-2">
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

        {/* New Timeline Button */}
        {currentPatientId && (
          <Tooltip title="新建时间线">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Create Timeline Modal */}
      <Modal
        title="新建时间线"
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTimeline}
          initialValues={{
            stage_date: undefined,
            stage_type: "初诊",
          }}
        >
          <Form.Item
            name="stage_title"
            label="阶段名称"
            rules={[{ required: true, message: "请输入阶段名称" }]}
          >
            <Input placeholder="例如: 初诊检查" />
          </Form.Item>

          <Form.Item
            name="stage_type"
            label="阶段类型"
            rules={[{ required: true, message: "请选择阶段类型" }]}
          >
            <Select placeholder="选择类型">
              <Select.Option value="初诊">初诊</Select.Option>
              <Select.Option value="检查">检查</Select.Option>
              <Select.Option value="确诊">确诊</Select.Option>
              <Select.Option value="治疗">治疗</Select.Option>
              <Select.Option value="随访">随访</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="stage_date"
            label="日期"
            rules={[{ required: true, message: "请选择日期" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
              placeholder="选择日期"
            />
          </Form.Item>

          <Form.Item name="diagnosis" label="诊断" >
            <Input.TextArea
              placeholder="可选，输入初步诊断"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
