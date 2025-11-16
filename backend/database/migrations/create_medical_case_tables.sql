-- Migration: Create medical case library tables
-- Date: 2025-11-16
-- Description: Creates medical case library tables for storing case information, details, symptoms, lab results, etc.

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
            case_id INTEGER PRIMARY KEY DEFAULT nextval('nexent.medical_case_t_case_id_seq'),
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
            create_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            update_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N'
        );

        -- Create indexes
        CREATE INDEX idx_medical_case_case_no ON nexent.medical_case_t(case_no);
        CREATE INDEX idx_medical_case_disease_type ON nexent.medical_case_t(disease_type);
        CREATE INDEX idx_medical_case_tenant_id ON nexent.medical_case_t(tenant_id);
        CREATE INDEX idx_medical_case_delete_flag ON nexent.medical_case_t(delete_flag);

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
            detail_id INTEGER PRIMARY KEY DEFAULT nextval('nexent.medical_case_detail_t_detail_id_seq'),
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
            create_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            update_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N'
        );

        -- Create indexes
        CREATE INDEX idx_medical_case_detail_case_id ON nexent.medical_case_detail_t(case_id);
        CREATE INDEX idx_medical_case_detail_tenant_id ON nexent.medical_case_detail_t(tenant_id);

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
            symptom_id INTEGER PRIMARY KEY DEFAULT nextval('nexent.medical_case_symptom_t_symptom_id_seq'),
            case_id INTEGER NOT NULL,
            symptom_name VARCHAR(200),
            symptom_description VARCHAR(500),
            is_key_symptom BOOLEAN DEFAULT FALSE,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            update_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N'
        );

        -- Create indexes
        CREATE INDEX idx_medical_case_symptom_case_id ON nexent.medical_case_symptom_t(case_id);
        CREATE INDEX idx_medical_case_symptom_tenant_id ON nexent.medical_case_symptom_t(tenant_id);

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
            lab_result_id INTEGER PRIMARY KEY DEFAULT nextval('nexent.medical_case_lab_result_t_lab_result_id_seq'),
            case_id INTEGER NOT NULL,
            test_name VARCHAR(200),
            test_full_name VARCHAR(500),
            test_value VARCHAR(100),
            test_unit VARCHAR(50),
            normal_range VARCHAR(100),
            is_abnormal BOOLEAN DEFAULT FALSE,
            abnormal_indicator VARCHAR(10),
            tenant_id VARCHAR(100),
            create_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            update_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N'
        );

        -- Create indexes
        CREATE INDEX idx_medical_case_lab_result_case_id ON nexent.medical_case_lab_result_t(case_id);
        CREATE INDEX idx_medical_case_lab_result_tenant_id ON nexent.medical_case_lab_result_t(tenant_id);

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
            image_id INTEGER PRIMARY KEY DEFAULT nextval('nexent.medical_case_image_t_image_id_seq'),
            case_id INTEGER NOT NULL,
            image_type VARCHAR(50),
            image_description VARCHAR(500),
            image_url VARCHAR(500),
            thumbnail_url VARCHAR(500),
            display_order INTEGER,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            update_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N'
        );

        -- Create indexes
        CREATE INDEX idx_medical_case_image_case_id ON nexent.medical_case_image_t(case_id);
        CREATE INDEX idx_medical_case_image_tenant_id ON nexent.medical_case_image_t(tenant_id);

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
            favorite_id INTEGER PRIMARY KEY DEFAULT nextval('nexent.medical_case_favorite_t_favorite_id_seq'),
            case_id INTEGER NOT NULL,
            user_id VARCHAR(100) NOT NULL,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            update_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            UNIQUE(case_id, user_id, tenant_id)
        );

        -- Create indexes
        CREATE INDEX idx_medical_case_favorite_case_id ON nexent.medical_case_favorite_t(case_id);
        CREATE INDEX idx_medical_case_favorite_user_id ON nexent.medical_case_favorite_t(user_id);
        CREATE INDEX idx_medical_case_favorite_tenant_id ON nexent.medical_case_favorite_t(tenant_id);

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
            history_id INTEGER PRIMARY KEY DEFAULT nextval('nexent.medical_case_view_history_t_history_id_seq'),
            case_id INTEGER NOT NULL,
            user_id VARCHAR(100) NOT NULL,
            view_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            tenant_id VARCHAR(100),
            create_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            update_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N'
        );

        -- Create indexes
        CREATE INDEX idx_medical_case_view_history_case_id ON nexent.medical_case_view_history_t(case_id);
        CREATE INDEX idx_medical_case_view_history_user_id ON nexent.medical_case_view_history_t(user_id);
        CREATE INDEX idx_medical_case_view_history_tenant_id ON nexent.medical_case_view_history_t(tenant_id);
        CREATE INDEX idx_medical_case_view_history_view_time ON nexent.medical_case_view_history_t(view_time DESC);

        RAISE NOTICE 'Table medical_case_view_history_t created successfully';
    ELSE
        RAISE NOTICE 'Table medical_case_view_history_t already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 3: Insert sample data
-- ============================================================================

-- Insert sample case 1: Rheumatoid Arthritis
DO $$
DECLARE
    v_case_id INTEGER;
BEGIN
    -- Check if sample data already exists
    IF NOT EXISTS (SELECT 1 FROM nexent.medical_case_t WHERE case_no = '#0234') THEN
        -- Insert case
        INSERT INTO nexent.medical_case_t (
            case_no, case_title, diagnosis, disease_type, age, gender,
            chief_complaint, category, is_classic, tenant_id, delete_flag
        ) VALUES (
            '#0234', '类风湿关节炎典型病例', '类风湿关节炎', '类风湿',
            58, '女', '双膝关节肿痛3个月，伴晨僵', 'classic', TRUE,
            'default_tenant', 'N'
        ) RETURNING case_id INTO v_case_id;

        -- Insert case detail
        INSERT INTO nexent.medical_case_detail_t (
            case_id, present_illness_history, past_medical_history,
            physical_examination, diagnosis_basis, treatment_plan,
            prognosis, tenant_id, delete_flag
        ) VALUES (
            v_case_id,
            '患者3个月前无明显诱因出现双膝关节肿痛，以晨起明显，伴晨僵约1小时，活动后可缓解。关节肿胀逐渐加重，影响日常活动。无发热、皮疹等症状。',
            '曾在当地医院就诊，诊断为"骨关节炎"，给予非甾体抗炎药治疗，效果不佳。',
            '{"general": "神志清楚，精神可，营养中等", "joint": "双膝关节肿胀明显，局部皮温升高，压痛(+)，浮髌试验(+)，活动受限", "hand": "掌指关节轻度肿胀，无晨僵"}'::jsonb,
            '根据2010 ACR/EULAR类风湿关节炎分类标准，患者符合诊断标准（评分≥6分）',
            '1. 甲氨蝶呤 (Methotrexate) 15mg 口服，每周一次\n2. 叶酸 5mg 口服，每日一次（避开甲氨蝶呤当天）\n3. 塞来昔布 200mg 口服，每日两次',
            '患者接受规范化治疗后，症状明显改善。3个月后复查，关节肿痛基本消失，晨僵时间缩短至15分钟，RF、ESR、CRP均明显下降。继续维持治疗，定期随访，预后良好。',
            'default_tenant', 'N'
        );

        -- Insert symptoms
        INSERT INTO nexent.medical_case_symptom_t (case_id, symptom_name, is_key_symptom, tenant_id, delete_flag)
        VALUES
            (v_case_id, '双膝肿痛', TRUE, 'default_tenant', 'N'),
            (v_case_id, '晨僵', TRUE, 'default_tenant', 'N'),
            (v_case_id, 'RF阳性', TRUE, 'default_tenant', 'N');

        -- Insert lab results
        INSERT INTO nexent.medical_case_lab_result_t (
            case_id, test_name, test_full_name, test_value, test_unit,
            normal_range, is_abnormal, abnormal_indicator, tenant_id, delete_flag
        ) VALUES
            (v_case_id, 'RF', '类风湿因子', '126', 'IU/mL', '<20', TRUE, '↑', 'default_tenant', 'N'),
            (v_case_id, '抗CCP抗体', '抗环瓜氨酸肽抗体', '158', 'U/mL', '<20', TRUE, '↑', 'default_tenant', 'N'),
            (v_case_id, 'ESR', '血沉', '45', 'mm/h', '<20', TRUE, '↑', 'default_tenant', 'N'),
            (v_case_id, 'CRP', 'C反应蛋白', '28', 'mg/L', '<10', TRUE, '↑', 'default_tenant', 'N'),
            (v_case_id, 'ANA', '抗核抗体', '阴性', '', '阴性', FALSE, '', 'default_tenant', 'N');

        RAISE NOTICE 'Sample case #0234 inserted successfully';
    ELSE
        RAISE NOTICE 'Sample case #0234 already exists, skipping';
    END IF;
END $$;

-- Insert sample case 2: Systemic Lupus Erythematosus
DO $$
DECLARE
    v_case_id INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM nexent.medical_case_t WHERE case_no = '#0156') THEN
        INSERT INTO nexent.medical_case_t (
            case_no, case_title, diagnosis, disease_type, age, gender,
            chief_complaint, category, is_classic, tenant_id, delete_flag
        ) VALUES (
            '#0156', '系统性红斑狼疮典型病例', '系统性红斑狼疮', '红斑狼疮',
            45, '女', '面部红斑伴关节痛2个月', 'classic', TRUE,
            'default_tenant', 'N'
        ) RETURNING case_id INTO v_case_id;

        INSERT INTO nexent.medical_case_detail_t (
            case_id, present_illness_history, treatment_plan, tenant_id, delete_flag
        ) VALUES (
            v_case_id,
            '患者2个月前出现面部红斑，呈蝶形分布，伴双手小关节疼痛，晨僵约30分钟。近1周出现乏力、发热。',
            '1. 泼尼松 30mg 口服，每日一次\n2. 羟氯喹 200mg 口服，每日两次\n3. 防晒，避免日晒',
            'default_tenant', 'N'
        );

        INSERT INTO nexent.medical_case_symptom_t (case_id, symptom_name, is_key_symptom, tenant_id, delete_flag)
        VALUES
            (v_case_id, '面部红斑', TRUE, 'default_tenant', 'N'),
            (v_case_id, '关节痛', TRUE, 'default_tenant', 'N'),
            (v_case_id, 'ANA阳性', TRUE, 'default_tenant', 'N');

        INSERT INTO nexent.medical_case_lab_result_t (
            case_id, test_name, test_value, test_unit, is_abnormal, abnormal_indicator, tenant_id, delete_flag
        ) VALUES
            (v_case_id, 'ANA', '1:320', '', TRUE, '↑', 'default_tenant', 'N'),
            (v_case_id, '抗dsDNA', '阳性', '', TRUE, '↑', 'default_tenant', 'N'),
            (v_case_id, 'ESR', '52', 'mm/h', TRUE, '↑', 'default_tenant', 'N');

        RAISE NOTICE 'Sample case #0156 inserted successfully';
    END IF;
END $$;

-- Insert sample case 3: Ankylosing Spondylitis
DO $$
DECLARE
    v_case_id INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM nexent.medical_case_t WHERE case_no = '#0189') THEN
        INSERT INTO nexent.medical_case_t (
            case_no, case_title, diagnosis, disease_type, age, gender,
            chief_complaint, category, tenant_id, delete_flag
        ) VALUES (
            '#0189', '强直性脊柱炎病例', '强直性脊柱炎', '强直性脊柱炎',
            35, '男', '腰背痛伴晨僵半年', 'common', 'default_tenant', 'N'
        ) RETURNING case_id INTO v_case_id;

        INSERT INTO nexent.medical_case_detail_t (
            case_id, present_illness_history, treatment_plan, tenant_id, delete_flag
        ) VALUES (
            v_case_id,
            '患者半年前开始出现腰背部疼痛，以夜间和晨起明显，伴晨僵约1小时，活动后缓解。',
            '1. 美洛昔康 15mg 口服，每日一次\n2. 柳氮磺吡啶 1g 口服，每日两次\n3. 功能锻炼',
            'default_tenant', 'N'
        );

        INSERT INTO nexent.medical_case_symptom_t (case_id, symptom_name, is_key_symptom, tenant_id, delete_flag)
        VALUES
            (v_case_id, '腰背痛', TRUE, 'default_tenant', 'N'),
            (v_case_id, '晨僵', TRUE, 'default_tenant', 'N'),
            (v_case_id, 'HLA-B27阳性', TRUE, 'default_tenant', 'N');

        INSERT INTO nexent.medical_case_lab_result_t (
            case_id, test_name, test_value, is_abnormal, tenant_id, delete_flag
        ) VALUES
            (v_case_id, 'HLA-B27', '阳性', TRUE, 'default_tenant', 'N'),
            (v_case_id, 'ESR', '38', TRUE, 'default_tenant', 'N');

        RAISE NOTICE 'Sample case #0189 inserted successfully';
    END IF;
END $$;

-- ============================================================================
-- Migration completed
-- ============================================================================
RAISE NOTICE '========================================';
RAISE NOTICE 'Medical case library tables migration completed successfully';
RAISE NOTICE '========================================';
