"use client";

import { useState, useEffect, useMemo } from "react";
import { Select } from "antd";
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

  // Handle patient selection change
  const handleChange = async (value: number | string) => {
    if (!conversationId) {
      return;
    }

    // Convert empty string to null
    const patientId = value === "" ? null : (value as number);
    
    try {
      const selectedPatient = patientId
        ? patients.find((p) => p.patient_id === patientId)
        : null;

      // Call API to link/unlink patient
      await conversationService.linkPatient({
        conversation_id: conversationId,
        patient_id: patientId,
        patient_name: selectedPatient?.name || null,
      });

      setSelectedPatientId(patientId);

      // Notify parent component
      if (onPatientChange) {
        onPatientChange(patientId, selectedPatient?.name || null);
      }
    } catch (error) {
      console.error("Failed to link patient:", error);
    }
  };

  // Memoize options to avoid recalculating on every render
  // Use empty string for "no patient" option instead of null
  const options = useMemo(
    () => [
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
            {patient.name} ({patient.patient_id})
          </span>
        ),
      })),
    ],
    [patients]
  );

  // Filter option handler
  const filterOption = (input: string, option?: { label?: any }) => {
    if (!option?.label) return false;
    const text = getLabelText(option.label);
    return text.toLowerCase().includes(input.toLowerCase());
  };
 
  return (
    <Select
      value={selectedPatientId === null ? "" : selectedPatientId}
      onChange={handleChange}
      options={options}
      placeholder="Select patient"
      style={{ minWidth: 200 }}
      disabled={disabled || !conversationId}
      loading={loading}
      showSearch
      filterOption={filterOption}
      allowClear
    />
  );
}