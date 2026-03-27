-- Add attachments column to consultation_record_t for multimodal support
-- Stores JSON array of file attachment references [{name, type, object_name, url, round, source}]

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'nexent' AND table_name = 'consultation_record_t' AND column_name = 'attachments'
    ) THEN
        ALTER TABLE nexent.consultation_record_t ADD COLUMN attachments JSONB DEFAULT '[]';
        RAISE NOTICE 'Added attachments column to consultation_record_t';
    ELSE
        RAISE NOTICE 'attachments column already exists in consultation_record_t';
    END IF;
END $$;
