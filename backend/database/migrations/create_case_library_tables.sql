-- Migration: Create case library tables
-- Date: 2025-11-16
-- Description: Creates case library tables for doctor portal case management system

-- ============================================================================
-- Table 1: case_info_t - Case library basic information
-- ============================================================================

-- Step 1.1: Create sequence for case_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'case_info_t_case_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.case_info_t_case_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence case_info_t_case_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence case_info_t_case_id_seq already exists, skipping';
    END IF;
END $$;

-- Step 1.2: Create case_info_t table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'case_info_t'
    ) THEN
        CREATE TABLE nexent.case_info_t (
            case_id INTEGER NOT NULL DEFAULT nextval('nexent.case_info_t_case_id_seq'::regclass),
            case_no VARCHAR(50),
            diagnosis VARCHAR(500),
            patient_age INTEGER,
            patient_gender VARCHAR(10),
            chief_complaint TEXT,
            present_illness TEXT,
            past_medical_history TEXT,
            physical_examination TEXT,
            imaging_findings TEXT,
            treatment_plan TEXT,
            prognosis TEXT,
            symptoms JSONB,
            similarity_score NUMERIC(5, 2),
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT case_info_t_pkey PRIMARY KEY (case_id)
        );
        RAISE NOTICE 'Table case_info_t created successfully';
    ELSE
        RAISE NOTICE 'Table case_info_t already exists, skipping';
    END IF;
END $$;

-- Step 1.3: Create indexes for case_info_t
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'nexent' AND tablename = 'case_info_t' AND indexname = 'idx_case_info_tenant_id') THEN
        CREATE INDEX idx_case_info_tenant_id ON nexent.case_info_t(tenant_id);
        RAISE NOTICE 'Index idx_case_info_tenant_id created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'nexent' AND tablename = 'case_info_t' AND indexname = 'idx_case_info_case_no') THEN
        CREATE INDEX idx_case_info_case_no ON nexent.case_info_t(case_no);
        RAISE NOTICE 'Index idx_case_info_case_no created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'nexent' AND tablename = 'case_info_t' AND indexname = 'idx_case_info_diagnosis') THEN
        CREATE INDEX idx_case_info_diagnosis ON nexent.case_info_t(diagnosis);
        RAISE NOTICE 'Index idx_case_info_diagnosis created';
    END IF;
END $$;

-- ============================================================================
-- Table 2: case_laboratory_test_t - Laboratory test results
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'nexent' AND sequencename = 'case_laboratory_test_t_test_id_seq') THEN
        CREATE SEQUENCE nexent.case_laboratory_test_t_test_id_seq;
        RAISE NOTICE 'Sequence case_laboratory_test_t_test_id_seq created';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'nexent' AND table_name = 'case_laboratory_test_t') THEN
        CREATE TABLE nexent.case_laboratory_test_t (
            test_id INTEGER NOT NULL DEFAULT nextval('nexent.case_laboratory_test_t_test_id_seq'::regclass),
            case_id INTEGER,
            test_name VARCHAR(100),
            test_value VARCHAR(100),
            test_unit VARCHAR(50),
            normal_range VARCHAR(100),
            is_abnormal BOOLEAN,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT case_laboratory_test_t_pkey PRIMARY KEY (test_id)
        );
        RAISE NOTICE 'Table case_laboratory_test_t created successfully';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'nexent' AND tablename = 'case_laboratory_test_t' AND indexname = 'idx_case_laboratory_test_case_id') THEN
        CREATE INDEX idx_case_laboratory_test_case_id ON nexent.case_laboratory_test_t(case_id);
        RAISE NOTICE 'Index idx_case_laboratory_test_case_id created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'nexent' AND tablename = 'case_laboratory_test_t' AND indexname = 'idx_case_laboratory_test_tenant_id') THEN
        CREATE INDEX idx_case_laboratory_test_tenant_id ON nexent.case_laboratory_test_t(tenant_id);
        RAISE NOTICE 'Index idx_case_laboratory_test_tenant_id created';
    END IF;
END $$;

-- ============================================================================
-- Create update_time triggers for all tables
-- ============================================================================

-- Trigger for case_info_t
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_case_info_timestamp') THEN
        CREATE OR REPLACE FUNCTION nexent.update_case_info_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_case_info_timestamp
        BEFORE UPDATE ON nexent.case_info_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_case_info_timestamp();
        RAISE NOTICE 'Trigger update_case_info_timestamp created';
    END IF;
END $$;

-- Trigger for case_laboratory_test_t
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_case_laboratory_test_timestamp') THEN
        CREATE OR REPLACE FUNCTION nexent.update_case_laboratory_test_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_case_laboratory_test_timestamp
        BEFORE UPDATE ON nexent.case_laboratory_test_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_case_laboratory_test_timestamp();
        RAISE NOTICE 'Trigger update_case_laboratory_test_timestamp created';
    END IF;
END $$;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Case library tables created successfully!' as status;

-- Verify table creation
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'nexent' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'nexent'
AND table_name LIKE 'case_%'
ORDER BY table_name;
