-- Migration: Add vlm_model_id field to ag_tenant_agent_t table
-- Date: 2025-11-23
-- Description: Adds vlm_model_id column to support VLM (Vision Language Model) configuration for agents

-- Step 1: Add vlm_model_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'nexent'
        AND table_name = 'ag_tenant_agent_t'
        AND column_name = 'vlm_model_id'
    ) THEN
        ALTER TABLE nexent.ag_tenant_agent_t
        ADD COLUMN vlm_model_id INTEGER;

        -- Add comment to the column
        COMMENT ON COLUMN nexent.ag_tenant_agent_t.vlm_model_id IS 'VLM model ID, foreign key reference to model_record_t.model_id';

        RAISE NOTICE 'Column vlm_model_id added successfully';
    ELSE
        RAISE NOTICE 'Column vlm_model_id already exists, skipping';
    END IF;
END $$;

-- Step 2: Verify the migration
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'nexent'
AND table_name = 'ag_tenant_agent_t'
AND column_name = 'vlm_model_id';

