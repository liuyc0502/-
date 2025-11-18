-- Migration: Create care plan management tables
-- Date: 2025-01-18
-- Description: Creates care plan management tables for patient rehabilitation planning

-- ============================================================================
-- Step 1: Create sequences
-- ============================================================================

-- Sequence for care_plan_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'care_plan_t_plan_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.care_plan_t_plan_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence care_plan_t_plan_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence care_plan_t_plan_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for care_plan_medication_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'care_plan_medication_t_medication_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.care_plan_medication_t_medication_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence care_plan_medication_t_medication_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence care_plan_medication_t_medication_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for care_plan_task_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'care_plan_task_t_task_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.care_plan_task_t_task_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence care_plan_task_t_task_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence care_plan_task_t_task_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for care_plan_precaution_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'care_plan_precaution_t_precaution_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.care_plan_precaution_t_precaution_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence care_plan_precaution_t_precaution_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence care_plan_precaution_t_precaution_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for care_plan_completion_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'care_plan_completion_t_completion_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.care_plan_completion_t_completion_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence care_plan_completion_t_completion_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence care_plan_completion_t_completion_id_seq already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Create tables
-- ============================================================================

-- Table: care_plan_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'care_plan_t'
    ) THEN
        CREATE TABLE nexent.care_plan_t (
            plan_id INTEGER NOT NULL DEFAULT nextval('nexent.care_plan_t_plan_id_seq'::regclass),
            patient_id INTEGER NOT NULL,
            plan_name VARCHAR(200),
            plan_description TEXT,
            start_date VARCHAR(20),
            end_date VARCHAR(20),
            status VARCHAR(20) DEFAULT 'active',
            doctor_id VARCHAR(100),
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT care_plan_t_pkey PRIMARY KEY (plan_id)
        );
        RAISE NOTICE 'Table care_plan_t created successfully';
    ELSE
        RAISE NOTICE 'Table care_plan_t already exists, skipping';
    END IF;
END $$;

-- Table: care_plan_medication_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'care_plan_medication_t'
    ) THEN
        CREATE TABLE nexent.care_plan_medication_t (
            medication_id INTEGER NOT NULL DEFAULT nextval('nexent.care_plan_medication_t_medication_id_seq'::regclass),
            plan_id INTEGER NOT NULL,
            medication_name VARCHAR(200) NOT NULL,
            dosage VARCHAR(100),
            frequency VARCHAR(100),
            time_slots JSONB,
            notes TEXT,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT care_plan_medication_t_pkey PRIMARY KEY (medication_id)
        );
        RAISE NOTICE 'Table care_plan_medication_t created successfully';
    ELSE
        RAISE NOTICE 'Table care_plan_medication_t already exists, skipping';
    END IF;
END $$;

-- Table: care_plan_task_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'care_plan_task_t'
    ) THEN
        CREATE TABLE nexent.care_plan_task_t (
            task_id INTEGER NOT NULL DEFAULT nextval('nexent.care_plan_task_t_task_id_seq'::regclass),
            plan_id INTEGER NOT NULL,
            task_title VARCHAR(200) NOT NULL,
            task_description TEXT,
            task_category VARCHAR(50),
            frequency VARCHAR(100),
            duration VARCHAR(50),
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT care_plan_task_t_pkey PRIMARY KEY (task_id)
        );
        RAISE NOTICE 'Table care_plan_task_t created successfully';
    ELSE
        RAISE NOTICE 'Table care_plan_task_t already exists, skipping';
    END IF;
END $$;

-- Table: care_plan_precaution_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'care_plan_precaution_t'
    ) THEN
        CREATE TABLE nexent.care_plan_precaution_t (
            precaution_id INTEGER NOT NULL DEFAULT nextval('nexent.care_plan_precaution_t_precaution_id_seq'::regclass),
            plan_id INTEGER NOT NULL,
            precaution_content TEXT NOT NULL,
            priority VARCHAR(20),
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT care_plan_precaution_t_pkey PRIMARY KEY (precaution_id)
        );
        RAISE NOTICE 'Table care_plan_precaution_t created successfully';
    ELSE
        RAISE NOTICE 'Table care_plan_precaution_t already exists, skipping';
    END IF;
END $$;

-- Table: care_plan_completion_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'care_plan_completion_t'
    ) THEN
        CREATE TABLE nexent.care_plan_completion_t (
            completion_id INTEGER NOT NULL DEFAULT nextval('nexent.care_plan_completion_t_completion_id_seq'::regclass),
            plan_id INTEGER NOT NULL,
            patient_id INTEGER NOT NULL,
            record_date VARCHAR(20) NOT NULL,
            item_type VARCHAR(20) NOT NULL,
            item_id INTEGER NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            completion_time TIMESTAMP,
            notes TEXT,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT care_plan_completion_t_pkey PRIMARY KEY (completion_id)
        );
        RAISE NOTICE 'Table care_plan_completion_t created successfully';
    ELSE
        RAISE NOTICE 'Table care_plan_completion_t already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 3: Create indexes for performance optimization
-- ============================================================================

-- Indexes for care_plan_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'care_plan_t'
        AND indexname = 'idx_care_plan_patient_id'
    ) THEN
        CREATE INDEX idx_care_plan_patient_id ON nexent.care_plan_t(patient_id);
        RAISE NOTICE 'Index idx_care_plan_patient_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_care_plan_patient_id already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'care_plan_t'
        AND indexname = 'idx_care_plan_status'
    ) THEN
        CREATE INDEX idx_care_plan_status ON nexent.care_plan_t(status);
        RAISE NOTICE 'Index idx_care_plan_status created successfully';
    ELSE
        RAISE NOTICE 'Index idx_care_plan_status already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'care_plan_t'
        AND indexname = 'idx_care_plan_tenant_id'
    ) THEN
        CREATE INDEX idx_care_plan_tenant_id ON nexent.care_plan_t(tenant_id);
        RAISE NOTICE 'Index idx_care_plan_tenant_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_care_plan_tenant_id already exists, skipping';
    END IF;
END $$;

-- Indexes for care_plan_medication_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'care_plan_medication_t'
        AND indexname = 'idx_medication_plan_id'
    ) THEN
        CREATE INDEX idx_medication_plan_id ON nexent.care_plan_medication_t(plan_id);
        RAISE NOTICE 'Index idx_medication_plan_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_medication_plan_id already exists, skipping';
    END IF;
END $$;

-- Indexes for care_plan_task_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'care_plan_task_t'
        AND indexname = 'idx_task_plan_id'
    ) THEN
        CREATE INDEX idx_task_plan_id ON nexent.care_plan_task_t(plan_id);
        RAISE NOTICE 'Index idx_task_plan_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_task_plan_id already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'care_plan_task_t'
        AND indexname = 'idx_task_category'
    ) THEN
        CREATE INDEX idx_task_category ON nexent.care_plan_task_t(task_category);
        RAISE NOTICE 'Index idx_task_category created successfully';
    ELSE
        RAISE NOTICE 'Index idx_task_category already exists, skipping';
    END IF;
END $$;

-- Indexes for care_plan_precaution_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'care_plan_precaution_t'
        AND indexname = 'idx_precaution_plan_id'
    ) THEN
        CREATE INDEX idx_precaution_plan_id ON nexent.care_plan_precaution_t(plan_id);
        RAISE NOTICE 'Index idx_precaution_plan_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_precaution_plan_id already exists, skipping';
    END IF;
END $$;

-- Indexes for care_plan_completion_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'care_plan_completion_t'
        AND indexname = 'idx_completion_plan_id'
    ) THEN
        CREATE INDEX idx_completion_plan_id ON nexent.care_plan_completion_t(plan_id);
        RAISE NOTICE 'Index idx_completion_plan_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_completion_plan_id already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'care_plan_completion_t'
        AND indexname = 'idx_completion_patient_date'
    ) THEN
        CREATE INDEX idx_completion_patient_date ON nexent.care_plan_completion_t(patient_id, record_date);
        RAISE NOTICE 'Index idx_completion_patient_date created successfully';
    ELSE
        RAISE NOTICE 'Index idx_completion_patient_date already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'care_plan_completion_t'
        AND indexname = 'idx_completion_item'
    ) THEN
        CREATE INDEX idx_completion_item ON nexent.care_plan_completion_t(item_type, item_id);
        RAISE NOTICE 'Index idx_completion_item created successfully';
    ELSE
        RAISE NOTICE 'Index idx_completion_item already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 4: Add table comments
-- ============================================================================

COMMENT ON TABLE nexent.care_plan_t IS 'Care plan main table for patient rehabilitation planning';
COMMENT ON TABLE nexent.care_plan_medication_t IS 'Medication schedule table for care plans';
COMMENT ON TABLE nexent.care_plan_task_t IS 'Rehabilitation task table for care plans';
COMMENT ON TABLE nexent.care_plan_precaution_t IS 'Precautions and medical advice table for care plans';
COMMENT ON TABLE nexent.care_plan_completion_t IS 'Care plan completion record table - tracks patient daily completion status';

-- ============================================================================
-- Step 5: Verification - Count columns in each table
-- ============================================================================

SELECT
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent'
    AND table_name IN (
        'care_plan_t',
        'care_plan_medication_t',
        'care_plan_task_t',
        'care_plan_precaution_t',
        'care_plan_completion_t'
    )
GROUP BY table_name
ORDER BY table_name;
