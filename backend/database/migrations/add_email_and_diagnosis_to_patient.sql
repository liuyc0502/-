-- Migration: Add email and diagnosis fields to patient_info_t table
-- Date: 2025-11-17
-- Description: Add email field for patient portal login and diagnosis field for current diagnosis

-- Add email column with unique constraint and index
ALTER TABLE nexent.patient_info_t
ADD COLUMN IF NOT EXISTS email VARCHAR(200);

-- Add unique constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_email
ON nexent.patient_info_t (email)
WHERE email IS NOT NULL AND delete_flag != 'Y';

-- Add regular index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_email_lookup
ON nexent.patient_info_t (email);

-- Add diagnosis column for storing current primary diagnosis
ALTER TABLE nexent.patient_info_t
ADD COLUMN IF NOT EXISTS diagnosis VARCHAR(500);

-- Add comment to email column
COMMENT ON COLUMN nexent.patient_info_t.email IS 'Email address for patient portal login';

-- Add comment to diagnosis column
COMMENT ON COLUMN nexent.patient_info_t.diagnosis IS 'Current primary diagnosis';

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Added email and diagnosis fields to patient_info_t';
END $$;
