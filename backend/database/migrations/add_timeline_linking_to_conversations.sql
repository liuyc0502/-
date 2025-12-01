-- Add timeline linking fields to conversation_record_t table
-- Migration: Add linked_timeline_id and linked_timeline_name columns

-- Add linked_timeline_id column
ALTER TABLE nexent.conversation_record_t
ADD COLUMN IF NOT EXISTS linked_timeline_id INTEGER DEFAULT NULL;

-- Add linked_timeline_name column
ALTER TABLE nexent.conversation_record_t
ADD COLUMN IF NOT EXISTS linked_timeline_name VARCHAR(200) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN nexent.conversation_record_t.linked_timeline_id IS 'Linked timeline ID (nullable)';
COMMENT ON COLUMN nexent.conversation_record_t.linked_timeline_name IS 'Timeline stage name for quick reference';

-- Create index for linked_timeline_id for better query performance
CREATE INDEX IF NOT EXISTS idx_conversation_linked_timeline
ON nexent.conversation_record_t(linked_timeline_id)
WHERE linked_timeline_id IS NOT NULL;
