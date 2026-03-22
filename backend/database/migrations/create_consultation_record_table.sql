-- Migration: Create consultation record table
-- Date: 2026-03-20
-- Description: Creates consultation_record_t for persisting multi-agent debate consultation sessions

-- ============================================================================
-- Step 1: Create sequence
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'consultation_record_t_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.consultation_record_t_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence consultation_record_t_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence consultation_record_t_id_seq already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Create table
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent' AND table_name = 'consultation_record_t'
    ) THEN
        CREATE TABLE nexent.consultation_record_t (
            consultation_id     INTEGER NOT NULL DEFAULT nextval('nexent.consultation_record_t_id_seq'::regclass),
            consultation_uuid   VARCHAR(64) NOT NULL,
            question            TEXT NOT NULL,
            status              VARCHAR(20) NOT NULL DEFAULT 'running',
            total_rounds        INTEGER DEFAULT 0,
            max_rounds          INTEGER DEFAULT 5,
            specialist_agents   JSONB DEFAULT '[]'::jsonb,
            round_results       JSONB DEFAULT '[]'::jsonb,
            final_recommendation TEXT,
            agreements          JSONB DEFAULT '[]'::jsonb,
            disagreements       JSONB DEFAULT '[]'::jsonb,
            confidence          FLOAT DEFAULT 0,
            conversation_id     INTEGER,
            patient_id          INTEGER,
            tenant_id           VARCHAR(100),
            create_time         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by          VARCHAR(100),
            updated_by          VARCHAR(100),
            delete_flag         VARCHAR(1) DEFAULT 'N',
            CONSTRAINT consultation_record_t_pkey PRIMARY KEY (consultation_id)
        );
        RAISE NOTICE 'Table consultation_record_t created successfully';
    ELSE
        RAISE NOTICE 'Table consultation_record_t already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 3: Create indexes
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND indexname = 'idx_consultation_record_uuid'
    ) THEN
        CREATE INDEX idx_consultation_record_uuid
        ON nexent.consultation_record_t (consultation_uuid);
        RAISE NOTICE 'Index idx_consultation_record_uuid created successfully';
    ELSE
        RAISE NOTICE 'Index idx_consultation_record_uuid already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND indexname = 'idx_consultation_record_tenant'
    ) THEN
        CREATE INDEX idx_consultation_record_tenant
        ON nexent.consultation_record_t (tenant_id, delete_flag);
        RAISE NOTICE 'Index idx_consultation_record_tenant created successfully';
    ELSE
        RAISE NOTICE 'Index idx_consultation_record_tenant already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND indexname = 'idx_consultation_record_conversation'
    ) THEN
        CREATE INDEX idx_consultation_record_conversation
        ON nexent.consultation_record_t (conversation_id);
        RAISE NOTICE 'Index idx_consultation_record_conversation created successfully';
    ELSE
        RAISE NOTICE 'Index idx_consultation_record_conversation already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND indexname = 'idx_consultation_record_patient'
    ) THEN
        CREATE INDEX idx_consultation_record_patient
        ON nexent.consultation_record_t (patient_id);
        RAISE NOTICE 'Index idx_consultation_record_patient created successfully';
    ELSE
        RAISE NOTICE 'Index idx_consultation_record_patient already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 4: Create update_time trigger
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_consultation_record_t_timestamp') THEN
        CREATE OR REPLACE FUNCTION nexent.update_consultation_record_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_consultation_record_t_timestamp
        BEFORE UPDATE ON nexent.consultation_record_t
        FOR EACH ROW EXECUTE FUNCTION nexent.update_consultation_record_t_timestamp();
        RAISE NOTICE 'Trigger update_consultation_record_t_timestamp created successfully';
    ELSE
        RAISE NOTICE 'Trigger update_consultation_record_t_timestamp already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 5: Verification
-- ============================================================================

SELECT
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent'
AND table_name = 'consultation_record_t'
GROUP BY table_name;
