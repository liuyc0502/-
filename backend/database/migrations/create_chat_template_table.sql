-- Migration: Create chat template table
-- Date: 2026-03-10
-- Description: Creates the chat_template_t table for doctor quick command templates

-- Step 1: Create sequence
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'nexent'
        AND sequencename = 'chat_template_t_template_id_seq'
    ) THEN
        CREATE SEQUENCE nexent.chat_template_t_template_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
    END IF;
END $$;

-- Step 2: Create table
CREATE TABLE IF NOT EXISTS nexent.chat_template_t (
    template_id     INTEGER NOT NULL DEFAULT nextval('nexent.chat_template_t_template_id_seq'),
    template_name   VARCHAR(200) NOT NULL,
    slash_command   VARCHAR(100) NOT NULL,
    prompt_template TEXT NOT NULL,
    fields          JSONB,
    sort_order      INTEGER DEFAULT 0,
    user_id         VARCHAR(100),
    tenant_id       VARCHAR(100),
    create_time     TIMESTAMP DEFAULT now(),
    update_time     TIMESTAMP DEFAULT now(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    delete_flag     VARCHAR(1) DEFAULT 'N',
    PRIMARY KEY (template_id)
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_template_user_tenant
    ON nexent.chat_template_t(user_id, tenant_id)
    WHERE delete_flag = 'N';

CREATE INDEX IF NOT EXISTS idx_chat_template_slash_command
    ON nexent.chat_template_t(tenant_id, slash_command)
    WHERE delete_flag = 'N';

-- Step 4: Verify
SELECT table_name, count(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent' AND table_name = 'chat_template_t'
GROUP BY table_name;
