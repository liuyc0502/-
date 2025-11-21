"use client";

import { useState, useEffect } from "react";
import { Select, Spin } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { patientService } from "@/services/patientService";
import { conversationService } from "@/services/conversationService";
import type { PatientInfo } from "@/types/patient";

interface PatientSelectorProps {
  conversationId: number | null;
  currentPatientId?: number | null;
  currentPatientName?: string | null;
  onPatientChange?: (patientId: number | null, patientName: string | null) => void;
  disabled?: boolean;
}

export function PatientSelector({
  conversationId,
  currentPatientId,
  currentPatientName,
  onPatientChange,
  disabled = false,
}: PatientSelectorProps) {
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    currentPatientId || null
  );

  // Load patient list
  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true);
        const data = await patientService.getList({});
        setPatients(data || []);
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
  const handleChange = async (value: number | null) => {
    if (!conversationId) {
      return;
    }

    try {
      const selectedPatient = value
        ? patients.find((p) => p.patient_id === value)
        : null;

      // Call API to link/unlink patient
      await conversationService.linkPatient({
        conversation_id: conversationId,
        patient_id: value,
        patient_name: selectedPatient?.name || null,
      });

      setSelectedPatientId(value);

      // Notify parent component
      if (onPatientChange) {
        onPatientChange(value, selectedPatient?.name || null);
      }
    } catch (error) {
      console.error("Failed to link patient:", error);
    }
  };

  const options = [
    {
      value: null,
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
          {patient.name} ({patient.patient_no})
        </span>
      ),
    })),
  ];

  return (
    <Select
      value={selectedPatientId}
      onChange={handleChange}
      options={options}
      placeholder="Select patient"
      style={{ minWidth: 200 }}
      disabled={disabled || !conversationId}
      loading={loading}
      showSearch
      filterOption={(input, option) => {
        const label = option?.label as any;
        if (!label) return false;
        const text =
          typeof label === "string"
            ? label
            : label.props?.children?.join("") || "";
        return text.toLowerCase().includes(input.toLowerCase());
      }}
      allowClear
    />
  );
}
