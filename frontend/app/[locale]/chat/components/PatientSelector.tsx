"use client";

import { useState, useEffect, useMemo,useRef } from "react";
import { Select, Tooltip } from "antd";
import { UserOutlined } from "@ant-design/icons";
import patientService from "@/services/patientService";
import { conversationService } from "@/services/conversationService";
import type { Patient } from "@/types/patient";

interface PatientSelectorProps {
  conversationId: number | null;
  currentPatientId?: number | null;
  currentPatientName?: string | null;
  onPatientChange?: (patientId: number | null, patientName: string | null) => void;
  disabled?: boolean;
}

interface PendingSelection {
  patientId: number | null;
  patientName: string | null;
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

export function PatientSelector({
  conversationId,
  currentPatientId,
  currentPatientName,
  onPatientChange,
  disabled = false,
}: PatientSelectorProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    currentPatientId || null
  );

 // Track pending selection when no conversationId
 const pendingSelectionRef = useRef<PendingSelection | null>(null);
 const prevConversationIdRef = useRef<number | null>(null);

  // Load patient list on mount
  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true);
        const data = await patientService.listPatients({});
        setPatients(data.patients || []);
      } catch (error) {
        console.error("Failed to load patient list:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, []);

  // Update selected patient when prop changes
  useEffect(() => {
    setSelectedPatientId(currentPatientId || null);
  }, [currentPatientId]);

  useEffect(() => {
    const savePendingSelection = async () => {
      // Only save if conversationId just became available and we have a pending selection
      if (
        conversationId &&
        !prevConversationIdRef.current &&
        pendingSelectionRef.current
      ) {
        const { patientId, patientName } = pendingSelectionRef.current;
        try {
          await conversationService.linkPatient({
            conversation_id: conversationId,
            patient_id: patientId,
            patient_name: patientName,
          });
 
          // Notify parent component
          if (onPatientChange) {
            onPatientChange(patientId, patientName);
          }
        } catch (error) {
          console.error("Failed to save pending patient selection:", error);
        }
        pendingSelectionRef.current = null;
      }
      prevConversationIdRef.current = conversationId;
    };
 
    savePendingSelection();
  }, [conversationId, onPatientChange]);

  // Handle patient selection change
  const handleChange = async (value: number | string) => {
    // Convert empty string to null
    const patientId = value === "" ? null : (value as number);
    const selectedPatient = patientId
      ? patients.find((p) => p.patient_id === patientId)
      : null;
    const patientName = selectedPatient?.name || null;
 
    // Update local state immediately
    setSelectedPatientId(patientId);
 
    // If no conversationId, store as pending selection
    if (!conversationId) {
      pendingSelectionRef.current = { patientId, patientName };
      // Still notify parent for UI update
      if (onPatientChange) {
        onPatientChange(patientId, patientName);
      }
      return;
    }
 
    // If we have conversationId, save immediately
    try {
      await conversationService.linkPatient({
        conversation_id: conversationId,
        patient_id: patientId,
        patient_name: patientName,
      });
 
      // Notify parent component
      if (onPatientChange) {
        onPatientChange(patientId, patientName);
      }
    } catch (error) {
      console.error("Failed to link patient:", error);
    }
  };

  // Memoize options to avoid recalculating on every render
  // Use empty string for "no patient" option instead of null
  const options = useMemo(
    () => {
      const baseOptions = [
        {
          value: "",
          label: (
            <span style={{ color: "#999" }}>
              <UserOutlined style={{ marginRight: 8 }} />
              No patient linked
            </span>
          ),
        },
        ...patients.map((patient) => ({
          value: patient.patient_id,
          label: (
            <span>
              <UserOutlined style={{ marginRight: 8 }} />
              {patient.name} ({patient.medical_record_no || patient.patient_id})
            </span>
          ),
        })),
      ];

      // If current patient is not in the fetched list (e.g., pagination), add a fallback option
      if (
        currentPatientId &&
        !baseOptions.some((opt) => opt.value === currentPatientId)
      ) {
        baseOptions.push({
          value: currentPatientId,
          label: (
            <span>
              <UserOutlined style={{ marginRight: 8 }} />
              {currentPatientName || `Patient ${currentPatientId}`}
            </span>
          ),
        });
      }

      return baseOptions;
    },
    [patients, currentPatientId, currentPatientName]
  );

  // Filter option handler
  const filterOption = (input: string, option?: { label?: any }) => {
    if (!option?.label) return false;
    const text = getLabelText(option.label);
    return text.toLowerCase().includes(input.toLowerCase());
  };
 
  const showPendingHint = !conversationId && selectedPatientId !== null;

 

  return (
    <Tooltip
      title={showPendingHint ? "Will be saved when conversation starts" : ""}
      open={showPendingHint ? undefined : false}
    >
      <Select
        value={selectedPatientId === null ? "" : selectedPatientId}
        onChange={handleChange}
        options={options}
        placeholder="Select patient"
        style={{ minWidth: 200 }}
        disabled={disabled}
        loading={loading}
        showSearch
        filterOption={filterOption}
        allowClear
      />
    </Tooltip>
  );
}