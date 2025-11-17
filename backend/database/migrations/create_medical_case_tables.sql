-- Migration: Create medical case library tables
-- Date: 2025-01-27
-- Description: Creates medical case library tables for storing case information, symptoms, lab results, images, favorites, and view history

-- ============================================================================
-- Step 1: Create sequences
-- ============================================================================

-- Sequence for medical_case_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'medical_case_t_case_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.medical_case_t_case_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence medical_case_t_case_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence medical_case_t_case_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for medical_case_detail_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'medical_case_detail_t_detail_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.medical_case_detail_t_detail_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence medical_case_detail_t_detail_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence medical_case_detail_t_detail_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for medical_case_symptom_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'medical_case_symptom_t_symptom_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.medical_case_symptom_t_symptom_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence medical_case_symptom_t_symptom_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence medical_case_symptom_t_symptom_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for medical_case_lab_result_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'medical_case_lab_result_t_lab_result_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.medical_case_lab_result_t_lab_result_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence medical_case_lab_result_t_lab_result_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence medical_case_lab_result_t_lab_result_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for medical_case_image_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'medical_case_image_t_image_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.medical_case_image_t_image_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence medical_case_image_t_image_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence medical_case_image_t_image_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for medical_case_favorite_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'medical_case_favorite_t_favorite_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.medical_case_favorite_t_favorite_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence medical_case_favorite_t_favorite_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence medical_case_favorite_t_favorite_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for medical_case_view_history_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'medical_case_view_history_t_history_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.medical_case_view_history_t_history_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence medical_case_view_history_t_history_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence medical_case_view_history_t_history_id_seq already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Create tables
-- ============================================================================

-- Table: medical_case_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'medical_case_t'
    ) THEN
        CREATE TABLE nexent.medical_case_t (
            case_id INTEGER NOT NULL DEFAULT nextval('nexent.medical_case_t_case_id_seq'::regclass),
            case_no VARCHAR(50) NOT NULL,
            case_title VARCHAR(200),
            diagnosis VARCHAR(500),
            disease_type VARCHAR(100),
            age INTEGER,
            gender VARCHAR(10),
            chief_complaint VARCHAR(500),
            category VARCHAR(100),
            tags JSONB,
            view_count INTEGER DEFAULT 0,
            is_classic BOOLEAN DEFAULT FALSE,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT medical_case_t_pkey PRIMARY KEY (case_id)
        );
        RAISE NOTICE 'Table medical_case_t created successfully';
    ELSE
        RAISE NOTICE 'Table medical_case_t already exists, skipping';
    END IF;
END $$;

-- Table: medical_case_detail_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'medical_case_detail_t'
    ) THEN
        CREATE TABLE nexent.medical_case_detail_t (
            detail_id INTEGER NOT NULL DEFAULT nextval('nexent.medical_case_detail_t_detail_id_seq'::regclass),
            case_id INTEGER NOT NULL,
            present_illness_history TEXT,
            past_medical_history TEXT,
            family_history TEXT,
            physical_examination JSONB,
            imaging_results JSONB,
            diagnosis_basis TEXT,
            treatment_plan TEXT,
            medications JSONB,
            prognosis TEXT,
            clinical_notes TEXT,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT medical_case_detail_t_pkey PRIMARY KEY (detail_id)
        );
        RAISE NOTICE 'Table medical_case_detail_t created successfully';
    ELSE
        RAISE NOTICE 'Table medical_case_detail_t already exists, skipping';
    END IF;
END $$;

-- Table: medical_case_symptom_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'medical_case_symptom_t'
    ) THEN
        CREATE TABLE nexent.medical_case_symptom_t (
            symptom_id INTEGER NOT NULL DEFAULT nextval('nexent.medical_case_symptom_t_symptom_id_seq'::regclass),
            case_id INTEGER NOT NULL,
            symptom_name VARCHAR(200),
            symptom_description VARCHAR(500),
            is_key_symptom BOOLEAN DEFAULT FALSE,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT medical_case_symptom_t_pkey PRIMARY KEY (symptom_id)
        );
        RAISE NOTICE 'Table medical_case_symptom_t created successfully';
    ELSE
        RAISE NOTICE 'Table medical_case_symptom_t already exists, skipping';
    END IF;
END $$;

-- Table: medical_case_lab_result_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'medical_case_lab_result_t'
    ) THEN
        CREATE TABLE nexent.medical_case_lab_result_t (
            lab_result_id INTEGER NOT NULL DEFAULT nextval('nexent.medical_case_lab_result_t_lab_result_id_seq'::regclass),
            case_id INTEGER NOT NULL,
            test_name VARCHAR(200),
            test_full_name VARCHAR(500),
            test_value VARCHAR(100),
            test_unit VARCHAR(50),
            normal_range VARCHAR(100),
            is_abnormal BOOLEAN DEFAULT FALSE,
            abnormal_indicator VARCHAR(10),
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT medical_case_lab_result_t_pkey PRIMARY KEY (lab_result_id)
        );
        RAISE NOTICE 'Table medical_case_lab_result_t created successfully';
    ELSE
        RAISE NOTICE 'Table medical_case_lab_result_t already exists, skipping';
    END IF;
END $$;

-- Table: medical_case_image_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'medical_case_image_t'
    ) THEN
        CREATE TABLE nexent.medical_case_image_t (
            image_id INTEGER NOT NULL DEFAULT nextval('nexent.medical_case_image_t_image_id_seq'::regclass),
            case_id INTEGER NOT NULL,
            image_type VARCHAR(50),
            image_description VARCHAR(500),
            image_url VARCHAR(500),
            thumbnail_url VARCHAR(500),
            display_order INTEGER,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT medical_case_image_t_pkey PRIMARY KEY (image_id)
        );
        RAISE NOTICE 'Table medical_case_image_t created successfully';
    ELSE
        RAISE NOTICE 'Table medical_case_image_t already exists, skipping';
    END IF;
END $$;

-- Table: medical_case_favorite_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'medical_case_favorite_t'
    ) THEN
        CREATE TABLE nexent.medical_case_favorite_t (
            favorite_id INTEGER NOT NULL DEFAULT nextval('nexent.medical_case_favorite_t_favorite_id_seq'::regclass),
            case_id INTEGER NOT NULL,
            user_id VARCHAR(100) NOT NULL,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT medical_case_favorite_t_pkey PRIMARY KEY (favorite_id)
        );
        RAISE NOTICE 'Table medical_case_favorite_t created successfully';
    ELSE
        RAISE NOTICE 'Table medical_case_favorite_t already exists, skipping';
    END IF;
END $$;

-- Table: medical_case_view_history_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'medical_case_view_history_t'
    ) THEN
        CREATE TABLE nexent.medical_case_view_history_t (
            history_id INTEGER NOT NULL DEFAULT nextval('nexent.medical_case_view_history_t_history_id_seq'::regclass),
            case_id INTEGER NOT NULL,
            user_id VARCHAR(100) NOT NULL,
            view_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT medical_case_view_history_t_pkey PRIMARY KEY (history_id)
        );
        RAISE NOTICE 'Table medical_case_view_history_t created successfully';
    ELSE
        RAISE NOTICE 'Table medical_case_view_history_t already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 3: Create indexes
-- ============================================================================

-- Indexes for medical_case_t
DO $$
BEGIN
    -- Index on tenant_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_t'
        AND indexname = 'idx_medical_case_tenant_id'
    ) THEN
        CREATE INDEX idx_medical_case_tenant_id ON nexent.medical_case_t(tenant_id);
        RAISE NOTICE 'Index idx_medical_case_tenant_id created successfully';
    END IF;

    -- Index on case_no
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_t'
        AND indexname = 'idx_medical_case_case_no'
    ) THEN
        CREATE INDEX idx_medical_case_case_no ON nexent.medical_case_t(case_no);
        RAISE NOTICE 'Index idx_medical_case_case_no created successfully';
    END IF;

    -- Index on disease_type
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_t'
        AND indexname = 'idx_medical_case_disease_type'
    ) THEN
        CREATE INDEX idx_medical_case_disease_type ON nexent.medical_case_t(disease_type);
        RAISE NOTICE 'Index idx_medical_case_disease_type created successfully';
    END IF;

    -- Composite index on tenant_id and delete_flag
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_t'
        AND indexname = 'idx_medical_case_tenant_delete'
    ) THEN
        CREATE INDEX idx_medical_case_tenant_delete ON nexent.medical_case_t(tenant_id, delete_flag);
        RAISE NOTICE 'Index idx_medical_case_tenant_delete created successfully';
    END IF;
END $$;

-- Indexes for medical_case_detail_t
DO $$
BEGIN
    -- Index on case_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_detail_t'
        AND indexname = 'idx_medical_case_detail_case_id'
    ) THEN
        CREATE INDEX idx_medical_case_detail_case_id ON nexent.medical_case_detail_t(case_id);
        RAISE NOTICE 'Index idx_medical_case_detail_case_id created successfully';
    END IF;
END $$;

-- Indexes for medical_case_symptom_t
DO $$
BEGIN
    -- Index on case_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_symptom_t'
        AND indexname = 'idx_medical_case_symptom_case_id'
    ) THEN
        CREATE INDEX idx_medical_case_symptom_case_id ON nexent.medical_case_symptom_t(case_id);
        RAISE NOTICE 'Index idx_medical_case_symptom_case_id created successfully';
    END IF;
END $$;

-- Indexes for medical_case_lab_result_t
DO $$
BEGIN
    -- Index on case_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_lab_result_t'
        AND indexname = 'idx_medical_case_lab_result_case_id'
    ) THEN
        CREATE INDEX idx_medical_case_lab_result_case_id ON nexent.medical_case_lab_result_t(case_id);
        RAISE NOTICE 'Index idx_medical_case_lab_result_case_id created successfully';
    END IF;
END $$;

-- Indexes for medical_case_image_t
DO $$
BEGIN
    -- Index on case_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_image_t'
        AND indexname = 'idx_medical_case_image_case_id'
    ) THEN
        CREATE INDEX idx_medical_case_image_case_id ON nexent.medical_case_image_t(case_id);
        RAISE NOTICE 'Index idx_medical_case_image_case_id created successfully';
    END IF;

    -- Index on display_order
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_image_t'
        AND indexname = 'idx_medical_case_image_display_order'
    ) THEN
        CREATE INDEX idx_medical_case_image_display_order ON nexent.medical_case_image_t(display_order);
        RAISE NOTICE 'Index idx_medical_case_image_display_order created successfully';
    END IF;
END $$;

-- Indexes for medical_case_favorite_t
DO $$
BEGIN
    -- Index on case_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_favorite_t'
        AND indexname = 'idx_medical_case_favorite_case_id'
    ) THEN
        CREATE INDEX idx_medical_case_favorite_case_id ON nexent.medical_case_favorite_t(case_id);
        RAISE NOTICE 'Index idx_medical_case_favorite_case_id created successfully';
    END IF;

    -- Index on user_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_favorite_t'
        AND indexname = 'idx_medical_case_favorite_user_id'
    ) THEN
        CREATE INDEX idx_medical_case_favorite_user_id ON nexent.medical_case_favorite_t(user_id);
        RAISE NOTICE 'Index idx_medical_case_favorite_user_id created successfully';
    END IF;

    -- Composite index on user_id and case_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_favorite_t'
        AND indexname = 'idx_medical_case_favorite_user_case'
    ) THEN
        CREATE INDEX idx_medical_case_favorite_user_case ON nexent.medical_case_favorite_t(user_id, case_id);
        RAISE NOTICE 'Index idx_medical_case_favorite_user_case created successfully';
    END IF;
END $$;

-- Indexes for medical_case_view_history_t
DO $$
BEGIN
    -- Index on case_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_view_history_t'
        AND indexname = 'idx_medical_case_view_history_case_id'
    ) THEN
        CREATE INDEX idx_medical_case_view_history_case_id ON nexent.medical_case_view_history_t(case_id);
        RAISE NOTICE 'Index idx_medical_case_view_history_case_id created successfully';
    END IF;

    -- Index on user_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_view_history_t'
        AND indexname = 'idx_medical_case_view_history_user_id'
    ) THEN
        CREATE INDEX idx_medical_case_view_history_user_id ON nexent.medical_case_view_history_t(user_id);
        RAISE NOTICE 'Index idx_medical_case_view_history_user_id created successfully';
    END IF;

    -- Index on view_time
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'medical_case_view_history_t'
        AND indexname = 'idx_medical_case_view_history_view_time'
    ) THEN
        CREATE INDEX idx_medical_case_view_history_view_time ON nexent.medical_case_view_history_t(view_time);
        RAISE NOTICE 'Index idx_medical_case_view_history_view_time created successfully';
    END IF;
END $$;

-- ============================================================================
-- Step 4: Create triggers for update_time
-- ============================================================================

-- Trigger for medical_case_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_medical_case_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_medical_case_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_medical_case_t_timestamp
        BEFORE UPDATE ON nexent.medical_case_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_medical_case_t_timestamp();

        RAISE NOTICE 'Trigger update_medical_case_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for medical_case_detail_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_medical_case_detail_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_medical_case_detail_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_medical_case_detail_t_timestamp
        BEFORE UPDATE ON nexent.medical_case_detail_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_medical_case_detail_t_timestamp();

        RAISE NOTICE 'Trigger update_medical_case_detail_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for medical_case_symptom_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_medical_case_symptom_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_medical_case_symptom_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_medical_case_symptom_t_timestamp
        BEFORE UPDATE ON nexent.medical_case_symptom_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_medical_case_symptom_t_timestamp();

        RAISE NOTICE 'Trigger update_medical_case_symptom_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for medical_case_lab_result_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_medical_case_lab_result_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_medical_case_lab_result_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_medical_case_lab_result_t_timestamp
        BEFORE UPDATE ON nexent.medical_case_lab_result_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_medical_case_lab_result_t_timestamp();

        RAISE NOTICE 'Trigger update_medical_case_lab_result_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for medical_case_image_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_medical_case_image_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_medical_case_image_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_medical_case_image_t_timestamp
        BEFORE UPDATE ON nexent.medical_case_image_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_medical_case_image_t_timestamp();

        RAISE NOTICE 'Trigger update_medical_case_image_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for medical_case_favorite_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_medical_case_favorite_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_medical_case_favorite_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_medical_case_favorite_t_timestamp
        BEFORE UPDATE ON nexent.medical_case_favorite_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_medical_case_favorite_t_timestamp();

        RAISE NOTICE 'Trigger update_medical_case_favorite_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for medical_case_view_history_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_medical_case_view_history_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_medical_case_view_history_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_medical_case_view_history_t_timestamp
        BEFORE UPDATE ON nexent.medical_case_view_history_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_medical_case_view_history_t_timestamp();

        RAISE NOTICE 'Trigger update_medical_case_view_history_t_timestamp created successfully';
    END IF;
END $$;

-- ============================================================================
-- Step 5: Verify the migration
-- ============================================================================
SELECT
    'medical_case_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'medical_case_t'
UNION ALL
SELECT
    'medical_case_detail_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'medical_case_detail_t'
UNION ALL
SELECT
    'medical_case_symptom_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'medical_case_symptom_t'
UNION ALL
SELECT
    'medical_case_lab_result_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'medical_case_lab_result_t'
UNION ALL
SELECT
    'medical_case_image_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'medical_case_image_t'
UNION ALL
SELECT
    'medical_case_favorite_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'medical_case_favorite_t'
UNION ALL
SELECT
    'medical_case_view_history_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'medical_case_view_history_t';

