-- Migration: Add patient linking and status management to conversations
-- Date: 2025-11-21
-- Description: Add fields for conversation-patient association, status tracking, tags, and archiving
 
-- Add new columns to conversation_record_t
ALTER TABLE nexent.conversation_record_t
ADD COLUMN IF NOT EXISTS patient_id INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS patient_name VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS conversation_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS archived_to_timeline BOOLEAN DEFAULT FALSE;
 
-- Add comments for documentation
COMMENT ON COLUMN nexent.conversation_record_t.patient_id IS 'Linked patient ID (nullable for general consultations)';
COMMENT ON COLUMN nexent.conversation_record_t.patient_name IS 'Redundant field for patient name to optimize queries';
COMMENT ON COLUMN nexent.conversation_record_t.conversation_status IS 'Status: active/pending_followup/difficult_case/completed/archived';
COMMENT ON COLUMN nexent.conversation_record_t.tags IS 'Custom tags array for categorization';
COMMENT ON COLUMN nexent.conversation_record_t.summary IS 'Conversation summary for display in list';
COMMENT ON COLUMN nexent.conversation_record_t.archived_at IS 'Archive timestamp';
COMMENT ON COLUMN nexent.conversation_record_t.archived_to_timeline IS 'Whether archived to patient timeline';
 
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_patient_id ON nexent.conversation_record_t(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_status ON nexent.conversation_record_t(conversation_status);
CREATE INDEX IF NOT EXISTS idx_conversation_portal_patient ON nexent.conversation_record_t(portal_type, patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_tags ON nexent.conversation_record_t USING GIN(tags) WHERE array_length(tags, 1) > 0;
CREATE INDEX IF NOT EXISTS idx_conversation_archived_at ON nexent.conversation_record_t(archived_at) WHERE archived_at IS NOT NULL;
 
-- Create a function to validate conversation status
CREATE OR REPLACE FUNCTION nexent.validate_conversation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conversation_status NOT IN ('active', 'pending_followup', 'difficult_case', 'completed', 'archived') THEN
    RAISE EXCEPTION 'Invalid conversation_status: %. Must be one of: active, pending_followup, difficult_case, completed, archived', NEW.conversation_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
-- Create trigger to validate status
DROP TRIGGER IF EXISTS trg_validate_conversation_status ON nexent.conversation_record_t;
CREATE TRIGGER trg_validate_conversation_status
  BEFORE INSERT OR UPDATE ON nexent.conversation_record_t
  FOR EACH ROW
  EXECUTE FUNCTION nexent.validate_conversation_status();
 
-- Update existing records to have default status
UPDATE nexent.conversation_record_t
SET conversation_status = 'active'
WHERE conversation_status IS NULL;