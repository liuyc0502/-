-- Migration: Create patient management tables
-- Date: 2025-01-27
-- Description: Creates patient management tables for storing patient information, timelines, todos, etc.

-- ============================================================================
-- Step 1: Create sequences
-- ============================================================================

-- Sequence for patient_info_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'patient_info_t_patient_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.patient_info_t_patient_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence patient_info_t_patient_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence patient_info_t_patient_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for patient_timeline_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'patient_timeline_t_timeline_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.patient_timeline_t_timeline_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence patient_timeline_t_timeline_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence patient_timeline_t_timeline_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for patient_timeline_detail_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'patient_timeline_detail_t_detail_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.patient_timeline_detail_t_detail_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence patient_timeline_detail_t_detail_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence patient_timeline_detail_t_detail_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for patient_medical_image_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'patient_medical_image_t_image_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.patient_medical_image_t_image_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence patient_medical_image_t_image_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence patient_medical_image_t_image_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for patient_metrics_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'patient_metrics_t_metric_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.patient_metrics_t_metric_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence patient_metrics_t_metric_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence patient_metrics_t_metric_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for patient_attachment_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'patient_attachment_t_attachment_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.patient_attachment_t_attachment_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence patient_attachment_t_attachment_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence patient_attachment_t_attachment_id_seq already exists, skipping';
    END IF;
END $$;

-- Sequence for patient_todo_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'patient_todo_t_todo_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.patient_todo_t_todo_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        RAISE NOTICE 'Sequence patient_todo_t_todo_id_seq created successfully';
    ELSE
        RAISE NOTICE 'Sequence patient_todo_t_todo_id_seq already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Create tables
-- ============================================================================

-- Table: patient_info_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'patient_info_t'
    ) THEN
        CREATE TABLE nexent.patient_info_t (
            patient_id INTEGER NOT NULL DEFAULT nextval('nexent.patient_info_t_patient_id_seq'::regclass),
            name VARCHAR(100),
            gender VARCHAR(10),
            age INTEGER,
            date_of_birth VARCHAR(20),
            medical_record_no VARCHAR(50),
            phone VARCHAR(20),
            address VARCHAR(500),
            allergies JSONB,
            family_history TEXT,
            past_medical_history JSONB,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT patient_info_t_pkey PRIMARY KEY (patient_id)
        );
        RAISE NOTICE 'Table patient_info_t created successfully';
    ELSE
        RAISE NOTICE 'Table patient_info_t already exists, skipping';
    END IF;
END $$;

-- Table: patient_timeline_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'patient_timeline_t'
    ) THEN
        CREATE TABLE nexent.patient_timeline_t (
            timeline_id INTEGER NOT NULL DEFAULT nextval('nexent.patient_timeline_t_timeline_id_seq'::regclass),
            patient_id INTEGER,
            stage_type VARCHAR(50),
            stage_date VARCHAR(20),
            stage_title VARCHAR(200),
            diagnosis VARCHAR(500),
            status VARCHAR(20),
            display_order INTEGER,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT patient_timeline_t_pkey PRIMARY KEY (timeline_id)
        );
        RAISE NOTICE 'Table patient_timeline_t created successfully';
    ELSE
        RAISE NOTICE 'Table patient_timeline_t already exists, skipping';
    END IF;
END $$;

-- Table: patient_timeline_detail_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'patient_timeline_detail_t'
    ) THEN
        CREATE TABLE nexent.patient_timeline_detail_t (
            detail_id INTEGER NOT NULL DEFAULT nextval('nexent.patient_timeline_detail_t_detail_id_seq'::regclass),
            timeline_id INTEGER,
            doctor_notes TEXT,
            pathology_findings TEXT,
            medications JSONB,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT patient_timeline_detail_t_pkey PRIMARY KEY (detail_id)
        );
        RAISE NOTICE 'Table patient_timeline_detail_t created successfully';
    ELSE
        RAISE NOTICE 'Table patient_timeline_detail_t already exists, skipping';
    END IF;
END $$;

-- Table: patient_medical_image_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'patient_medical_image_t'
    ) THEN
        CREATE TABLE nexent.patient_medical_image_t (
            image_id INTEGER NOT NULL DEFAULT nextval('nexent.patient_medical_image_t_image_id_seq'::regclass),
            timeline_id INTEGER,
            image_type VARCHAR(50),
            image_label VARCHAR(200),
            image_url VARCHAR(500),
            thumbnail_url VARCHAR(500),
            display_order INTEGER,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT patient_medical_image_t_pkey PRIMARY KEY (image_id)
        );
        RAISE NOTICE 'Table patient_medical_image_t created successfully';
    ELSE
        RAISE NOTICE 'Table patient_medical_image_t already exists, skipping';
    END IF;
END $$;

-- Table: patient_metrics_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'patient_metrics_t'
    ) THEN
        CREATE TABLE nexent.patient_metrics_t (
            metric_id INTEGER NOT NULL DEFAULT nextval('nexent.patient_metrics_t_metric_id_seq'::regclass),
            timeline_id INTEGER,
            metric_name VARCHAR(50),
            metric_full_name VARCHAR(200),
            metric_value VARCHAR(50),
            metric_unit VARCHAR(20),
            metric_trend VARCHAR(20),
            metric_status VARCHAR(20),
            normal_range_min NUMERIC(10, 2),
            normal_range_max NUMERIC(10, 2),
            percentage INTEGER,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT patient_metrics_t_pkey PRIMARY KEY (metric_id)
        );
        RAISE NOTICE 'Table patient_metrics_t created successfully';
    ELSE
        RAISE NOTICE 'Table patient_metrics_t already exists, skipping';
    END IF;
END $$;

-- Table: patient_attachment_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'patient_attachment_t'
    ) THEN
        CREATE TABLE nexent.patient_attachment_t (
            attachment_id INTEGER NOT NULL DEFAULT nextval('nexent.patient_attachment_t_attachment_id_seq'::regclass),
            timeline_id INTEGER,
            file_name VARCHAR(200),
            file_type VARCHAR(50),
            file_url VARCHAR(500),
            file_size INTEGER,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT patient_attachment_t_pkey PRIMARY KEY (attachment_id)
        );
        RAISE NOTICE 'Table patient_attachment_t created successfully';
    ELSE
        RAISE NOTICE 'Table patient_attachment_t already exists, skipping';
    END IF;
END $$;

-- Table: patient_todo_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'patient_todo_t'
    ) THEN
        CREATE TABLE nexent.patient_todo_t (
            todo_id INTEGER NOT NULL DEFAULT nextval('nexent.patient_todo_t_todo_id_seq'::regclass),
            patient_id INTEGER,
            todo_title VARCHAR(200),
            todo_description TEXT,
            todo_type VARCHAR(50),
            due_date VARCHAR(20),
            priority VARCHAR(20),
            status VARCHAR(20),
            assigned_doctor VARCHAR(100),
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT patient_todo_t_pkey PRIMARY KEY (todo_id)
        );
        RAISE NOTICE 'Table patient_todo_t created successfully';
    ELSE
        RAISE NOTICE 'Table patient_todo_t already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 3: Create indexes
-- ============================================================================

-- Indexes for patient_info_t
DO $$
BEGIN
    -- Index on tenant_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_info_t'
        AND indexname = 'idx_patient_info_tenant_id'
    ) THEN
        CREATE INDEX idx_patient_info_tenant_id ON nexent.patient_info_t(tenant_id);
        RAISE NOTICE 'Index idx_patient_info_tenant_id created successfully';
    END IF;

    -- Index on medical_record_no
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_info_t'
        AND indexname = 'idx_patient_info_medical_record_no'
    ) THEN
        CREATE INDEX idx_patient_info_medical_record_no ON nexent.patient_info_t(medical_record_no);
        RAISE NOTICE 'Index idx_patient_info_medical_record_no created successfully';
    END IF;

    -- Composite index on tenant_id and delete_flag
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_info_t'
        AND indexname = 'idx_patient_info_tenant_delete'
    ) THEN
        CREATE INDEX idx_patient_info_tenant_delete ON nexent.patient_info_t(tenant_id, delete_flag);
        RAISE NOTICE 'Index idx_patient_info_tenant_delete created successfully';
    END IF;
END $$;

-- Indexes for patient_timeline_t
DO $$
BEGIN
    -- Index on patient_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_timeline_t'
        AND indexname = 'idx_patient_timeline_patient_id'
    ) THEN
        CREATE INDEX idx_patient_timeline_patient_id ON nexent.patient_timeline_t(patient_id);
        RAISE NOTICE 'Index idx_patient_timeline_patient_id created successfully';
    END IF;

    -- Index on tenant_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_timeline_t'
        AND indexname = 'idx_patient_timeline_tenant_id'
    ) THEN
        CREATE INDEX idx_patient_timeline_tenant_id ON nexent.patient_timeline_t(tenant_id);
        RAISE NOTICE 'Index idx_patient_timeline_tenant_id created successfully';
    END IF;

    -- Index on display_order
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_timeline_t'
        AND indexname = 'idx_patient_timeline_display_order'
    ) THEN
        CREATE INDEX idx_patient_timeline_display_order ON nexent.patient_timeline_t(display_order);
        RAISE NOTICE 'Index idx_patient_timeline_display_order created successfully';
    END IF;
END $$;

-- Indexes for patient_timeline_detail_t
DO $$
BEGIN
    -- Index on timeline_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_timeline_detail_t'
        AND indexname = 'idx_patient_timeline_detail_timeline_id'
    ) THEN
        CREATE INDEX idx_patient_timeline_detail_timeline_id ON nexent.patient_timeline_detail_t(timeline_id);
        RAISE NOTICE 'Index idx_patient_timeline_detail_timeline_id created successfully';
    END IF;
END $$;

-- Indexes for patient_medical_image_t
DO $$
BEGIN
    -- Index on timeline_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_medical_image_t'
        AND indexname = 'idx_patient_medical_image_timeline_id'
    ) THEN
        CREATE INDEX idx_patient_medical_image_timeline_id ON nexent.patient_medical_image_t(timeline_id);
        RAISE NOTICE 'Index idx_patient_medical_image_timeline_id created successfully';
    END IF;

    -- Index on display_order
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_medical_image_t'
        AND indexname = 'idx_patient_medical_image_display_order'
    ) THEN
        CREATE INDEX idx_patient_medical_image_display_order ON nexent.patient_medical_image_t(display_order);
        RAISE NOTICE 'Index idx_patient_medical_image_display_order created successfully';
    END IF;
END $$;

-- Indexes for patient_metrics_t
DO $$
BEGIN
    -- Index on timeline_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_metrics_t'
        AND indexname = 'idx_patient_metrics_timeline_id'
    ) THEN
        CREATE INDEX idx_patient_metrics_timeline_id ON nexent.patient_metrics_t(timeline_id);
        RAISE NOTICE 'Index idx_patient_metrics_timeline_id created successfully';
    END IF;
END $$;

-- Indexes for patient_attachment_t
DO $$
BEGIN
    -- Index on timeline_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_attachment_t'
        AND indexname = 'idx_patient_attachment_timeline_id'
    ) THEN
        CREATE INDEX idx_patient_attachment_timeline_id ON nexent.patient_attachment_t(timeline_id);
        RAISE NOTICE 'Index idx_patient_attachment_timeline_id created successfully';
    END IF;
END $$;

-- Indexes for patient_todo_t
DO $$
BEGIN
    -- Index on patient_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_todo_t'
        AND indexname = 'idx_patient_todo_patient_id'
    ) THEN
        CREATE INDEX idx_patient_todo_patient_id ON nexent.patient_todo_t(patient_id);
        RAISE NOTICE 'Index idx_patient_todo_patient_id created successfully';
    END IF;

    -- Index on tenant_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_todo_t'
        AND indexname = 'idx_patient_todo_tenant_id'
    ) THEN
        CREATE INDEX idx_patient_todo_tenant_id ON nexent.patient_todo_t(tenant_id);
        RAISE NOTICE 'Index idx_patient_todo_tenant_id created successfully';
    END IF;

    -- Index on status
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'patient_todo_t'
        AND indexname = 'idx_patient_todo_status'
    ) THEN
        CREATE INDEX idx_patient_todo_status ON nexent.patient_todo_t(status);
        RAISE NOTICE 'Index idx_patient_todo_status created successfully';
    END IF;
END $$;

-- ============================================================================
-- Step 4: Create triggers for update_time
-- ============================================================================

-- Trigger for patient_info_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_patient_info_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_patient_info_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_patient_info_t_timestamp
        BEFORE UPDATE ON nexent.patient_info_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_patient_info_t_timestamp();

        RAISE NOTICE 'Trigger update_patient_info_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for patient_timeline_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_patient_timeline_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_patient_timeline_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_patient_timeline_t_timestamp
        BEFORE UPDATE ON nexent.patient_timeline_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_patient_timeline_t_timestamp();

        RAISE NOTICE 'Trigger update_patient_timeline_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for patient_timeline_detail_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_patient_timeline_detail_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_patient_timeline_detail_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_patient_timeline_detail_t_timestamp
        BEFORE UPDATE ON nexent.patient_timeline_detail_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_patient_timeline_detail_t_timestamp();

        RAISE NOTICE 'Trigger update_patient_timeline_detail_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for patient_medical_image_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_patient_medical_image_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_patient_medical_image_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_patient_medical_image_t_timestamp
        BEFORE UPDATE ON nexent.patient_medical_image_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_patient_medical_image_t_timestamp();

        RAISE NOTICE 'Trigger update_patient_medical_image_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for patient_metrics_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_patient_metrics_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_patient_metrics_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_patient_metrics_t_timestamp
        BEFORE UPDATE ON nexent.patient_metrics_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_patient_metrics_t_timestamp();

        RAISE NOTICE 'Trigger update_patient_metrics_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for patient_attachment_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_patient_attachment_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_patient_attachment_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_patient_attachment_t_timestamp
        BEFORE UPDATE ON nexent.patient_attachment_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_patient_attachment_t_timestamp();

        RAISE NOTICE 'Trigger update_patient_attachment_t_timestamp created successfully';
    END IF;
END $$;

-- Trigger for patient_todo_t
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_patient_todo_t_timestamp'
    ) THEN
        CREATE OR REPLACE FUNCTION nexent.update_patient_todo_t_timestamp()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.update_time = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;

        CREATE TRIGGER update_patient_todo_t_timestamp
        BEFORE UPDATE ON nexent.patient_todo_t
        FOR EACH ROW
        EXECUTE FUNCTION nexent.update_patient_todo_t_timestamp();

        RAISE NOTICE 'Trigger update_patient_todo_t_timestamp created successfully';
    END IF;
END $$;

-- ============================================================================
-- Step 5: Verify the migration
-- ============================================================================
SELECT
    'patient_info_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'patient_info_t'
UNION ALL
SELECT
    'patient_timeline_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'patient_timeline_t'
UNION ALL
SELECT
    'patient_timeline_detail_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'patient_timeline_detail_t'
UNION ALL
SELECT
    'patient_medical_image_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'patient_medical_image_t'
UNION ALL
SELECT
    'patient_metrics_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'patient_metrics_t'
UNION ALL
SELECT
    'patient_attachment_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'patient_attachment_t'
UNION ALL
SELECT
    'patient_todo_t' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'patient_todo_t';

