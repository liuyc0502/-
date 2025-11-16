-- Migration: Add portal_type field to conversation_record_t table
-- Date: 2025-11-12
-- Description: Adds portal_type column to support conversation isolation by portal type

-- Step 1: Add portal_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'nexent'
        AND table_name = 'conversation_record_t'
        AND column_name = 'portal_type'
    ) THEN
        ALTER TABLE nexent.conversation_record_t
        ADD COLUMN portal_type VARCHAR(50) DEFAULT 'general';

        RAISE NOTICE 'Column portal_type added successfully';
    ELSE
        RAISE NOTICE 'Column portal_type already exists, skipping';
    END IF;
END $$;

-- Step 2: Update existing records to have 'general' portal_type if NULL
UPDATE nexent.conversation_record_t
SET portal_type = 'general'
WHERE portal_type IS NULL;

-- Step 3: Add index for performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'conversation_record_t'
        AND indexname = 'idx_conversation_portal_type'
    ) THEN
        CREATE INDEX idx_conversation_portal_type
        ON nexent.conversation_record_t(portal_type);

        RAISE NOTICE 'Index idx_conversation_portal_type created successfully';
    ELSE
        RAISE NOTICE 'Index idx_conversation_portal_type already exists, skipping';
    END IF;
END $$;

-- Step 4: Verify the migration
SELECT
    portal_type,
    COUNT(*) as conversation_count
FROM nexent.conversation_record_t
GROUP BY portal_type
ORDER BY portal_type;
