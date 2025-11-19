-- Migration: Add patient report interpretation fields to patient_timeline_detail_t
-- Date: 2025-11-19
-- Description: Add patient_summary and patient_suggestions fields for patient-friendly report interpretation

-- Add patient_summary field (plain language interpretation for patients)
ALTER TABLE nexent.patient_timeline_detail_t
ADD COLUMN IF NOT EXISTS patient_summary TEXT;

COMMENT ON COLUMN nexent.patient_timeline_detail_t.patient_summary IS 'Patient-friendly interpretation (plain language)';

-- Add patient_suggestions field (JSON array of suggestions for patients)
ALTER TABLE nexent.patient_timeline_detail_t
ADD COLUMN IF NOT EXISTS patient_suggestions JSON;

COMMENT ON COLUMN nexent.patient_timeline_detail_t.patient_suggestions IS 'Suggestions for patient (JSON array)';
