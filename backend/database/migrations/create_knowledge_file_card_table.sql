-- Migration: Create knowledge_file_card_t table
-- Date: 2025-11-15
-- Description: Creates knowledge_file_card_t table for storing knowledge file card information

-- Step 1: Create sequence for card_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'knowledge_file_card_t_card_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.knowledge_file_card_t_card_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

        RAISE NOTICE 'Sequence knowledge_file_card_t_card_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence knowledge_file_card_t_card_id_seq already exists, skipping';
    END IF;
END $$;

-- Step 2: Create table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'knowledge_file_card_t'
    ) THEN
        CREATE TABLE nexent.knowledge_file_card_t (
            card_id INTEGER NOT NULL DEFAULT nextval('nexent.knowledge_file_card_t_card_id_seq'::regclass),
            file_path VARCHAR(500) NOT NULL,
            knowledge_id INTEGER NOT NULL,
            card_title VARCHAR(200),
            card_summary VARCHAR(1000),
            category VARCHAR(100),
            tags VARCHAR(500),
            view_count INTEGER DEFAULT 0,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT knowledge_file_card_t_pkey PRIMARY KEY (card_id)
        );

        RAISE NOTICE 'Table knowledge_file_card_t created successfully';
    ELSE
        RAISE NOTICE 'Table knowledge_file_card_t already exists, skipping';
    END IF;
END $$;

-- Step 3: Create indexes for performance
DO $$
BEGIN
    -- Index on file_path for quick lookups
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'knowledge_file_card_t'
        AND indexname = 'idx_knowledge_file_card_file_path'
    ) THEN
        CREATE INDEX idx_knowledge_file_card_file_path
        ON nexent.knowledge_file_card_t(file_path);

        RAISE NOTICE 'Index idx_knowledge_file_card_file_path created successfully';
    ELSE
        RAISE NOTICE 'Index idx_knowledge_file_card_file_path already exists, skipping';
    END IF;

    -- Index on knowledge_id for filtering by knowledge base
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'knowledge_file_card_t'
        AND indexname = 'idx_knowledge_file_card_knowledge_id'
    ) THEN
        CREATE INDEX idx_knowledge_file_card_knowledge_id
        ON nexent.knowledge_file_card_t(knowledge_id);

        RAISE NOTICE 'Index idx_knowledge_file_card_knowledge_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_knowledge_file_card_knowledge_id already exists, skipping';
    END IF;

    -- Index on tenant_id for multi-tenant filtering
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'knowledge_file_card_t'
        AND indexname = 'idx_knowledge_file_card_tenant_id'
    ) THEN
        CREATE INDEX idx_knowledge_file_card_tenant_id
        ON nexent.knowledge_file_card_t(tenant_id);

        RAISE NOTICE 'Index idx_knowledge_file_card_tenant_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_knowledge_file_card_tenant_id already exists, skipping';
    END IF;

    -- Index on category for filtering by category
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'knowledge_file_card_t'
        AND indexname = 'idx_knowledge_file_card_category'
    ) THEN
        CREATE INDEX idx_knowledge_file_card_category
        ON nexent.knowledge_file_card_t(category);

        RAISE NOTICE 'Index idx_knowledge_file_card_category created successfully';
    ELSE
        RAISE NOTICE 'Index idx_knowledge_file_card_category already exists, skipping';
    END IF;

    -- Composite index on tenant_id and delete_flag for common queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'knowledge_file_card_t'
        AND indexname = 'idx_knowledge_file_card_tenant_delete'
    ) THEN
        CREATE INDEX idx_knowledge_file_card_tenant_delete
        ON nexent.knowledge_file_card_t(tenant_id, delete_flag);

        RAISE NOTICE 'Index idx_knowledge_file_card_tenant_delete created successfully';
    ELSE
        RAISE NOTICE 'Index idx_knowledge_file_card_tenant_delete already exists, skipping';
    END IF;
END $$;

-- Step 4: Create trigger to update update_time automatically
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_knowledge_file_card_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_knowledge_file_card_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_knowledge_file_card_timestamp
        BEFORE UPDATE ON nexent.knowledge_file_card_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_knowledge_file_card_timestamp();

        RAISE NOTICE 'Trigger update_knowledge_file_card_timestamp created successfully';
    ELSE
        RAISE NOTICE 'Trigger update_knowledge_file_card_timestamp already exists, skipping';
    END IF;
END $$;

-- Step 5: Verify the migration
SELECT
    COUNT(*) as total_cards,
    COUNT(DISTINCT tenant_id) as tenant_count,
    COUNT(DISTINCT knowledge_id) as knowledge_base_count
FROM nexent.knowledge_file_card_t
WHERE delete_flag != 'Y';

