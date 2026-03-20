-- Migration: Create patient report interpretation cache table
-- Date: 2026-03-19
-- Description: Creates table for storing AI-generated patient report interpretations

-- ============================================================================
-- Step 1: Create sequence
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'patient_report_interpretation_t_interpretation_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.patient_report_interpretation_t_interpretation_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence patient_report_interpretation_t_interpretation_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence patient_report_interpretation_t_interpretation_id_seq already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Create table
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'patient_report_interpretation_t'
    ) THEN
        CREATE TABLE nexent.patient_report_interpretation_t (
            interpretation_id INTEGER NOT NULL DEFAULT nextval('nexent.patient_report_interpretation_t_interpretation_id_seq'::regclass),
            patient_id INTEGER NOT NULL,
            report_id VARCHAR(100) NOT NULL,
            report_type VARCHAR(50) NOT NULL,
            interpretation_json TEXT,
            severity VARCHAR(20),
            summary TEXT,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT patient_report_interpretation_t_pkey PRIMARY KEY (interpretation_id)
        );
        RAISE NOTICE 'Table patient_report_interpretation_t created successfully';
    ELSE
        RAISE NOTICE 'Table patient_report_interpretation_t already exists, skipping';
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
        AND tablename = 'patient_report_interpretation_t'
        AND indexname = 'idx_report_interp_patient_id'
    ) THEN
        CREATE INDEX idx_report_interp_patient_id ON nexent.patient_report_interpretation_t(patient_id);
        RAISE NOTICE 'Index idx_report_interp_patient_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_report_interp_patient_id already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_report_interpretation_t'
        AND indexname = 'idx_report_interp_report_id'
    ) THEN
        CREATE INDEX idx_report_interp_report_id ON nexent.patient_report_interpretation_t(report_id);
        RAISE NOTICE 'Index idx_report_interp_report_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_report_interp_report_id already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_report_interpretation_t'
        AND indexname = 'idx_report_interp_patient_report'
    ) THEN
        CREATE UNIQUE INDEX idx_report_interp_patient_report ON nexent.patient_report_interpretation_t(patient_id, report_id, tenant_id)
        WHERE delete_flag != 'Y';
        RAISE NOTICE 'Index idx_report_interp_patient_report created successfully';
    ELSE
        RAISE NOTICE 'Index idx_report_interp_patient_report already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_report_interpretation_t'
        AND indexname = 'idx_report_interp_tenant_id'
    ) THEN
        CREATE INDEX idx_report_interp_tenant_id ON nexent.patient_report_interpretation_t(tenant_id);
        RAISE NOTICE 'Index idx_report_interp_tenant_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_report_interp_tenant_id already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 4: Add table comment
-- ============================================================================

COMMENT ON TABLE nexent.patient_report_interpretation_t IS 'Patient report AI interpretation cache - stores structured interpretations for lab/imaging/pathology reports';

-- ============================================================================
-- Step 5: Verification
-- ============================================================================

SELECT
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent'
    AND table_name = 'patient_report_interpretation_t'
GROUP BY table_name
ORDER BY table_name;
