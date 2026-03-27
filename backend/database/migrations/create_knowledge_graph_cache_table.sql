-- Migration: Create knowledge graph cache table
-- Date: 2026-03-22
-- Description: Creates table for caching LLM-generated knowledge subgraphs

-- ============================================================================
-- Step 1: Create table
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'nexent'
        AND table_name = 'knowledge_graph_cache_t'
    ) THEN
        CREATE TABLE nexent.knowledge_graph_cache_t (
            cache_id VARCHAR(32) NOT NULL,
            query TEXT NOT NULL,
            subgraph_json JSONB,
            node_count INTEGER DEFAULT 0,
            edge_count INTEGER DEFAULT 0,
            tenant_id VARCHAR(100),
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(100),
            updated_by VARCHAR(100),
            delete_flag VARCHAR(1) DEFAULT 'N',
            CONSTRAINT knowledge_graph_cache_t_pkey PRIMARY KEY (cache_id)
        );
        RAISE NOTICE 'Table knowledge_graph_cache_t created successfully';
    ELSE
        RAISE NOTICE 'Table knowledge_graph_cache_t already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Create indexes
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'knowledge_graph_cache_t'
        AND indexname = 'idx_kg_cache_tenant_id'
    ) THEN
        CREATE INDEX idx_kg_cache_tenant_id ON nexent.knowledge_graph_cache_t(tenant_id);
        RAISE NOTICE 'Index idx_kg_cache_tenant_id created successfully';
    ELSE
        RAISE NOTICE 'Index idx_kg_cache_tenant_id already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'nexent'
        AND tablename = 'knowledge_graph_cache_t'
        AND indexname = 'idx_kg_cache_create_time'
    ) THEN
        CREATE INDEX idx_kg_cache_create_time ON nexent.knowledge_graph_cache_t(create_time DESC);
        RAISE NOTICE 'Index idx_kg_cache_create_time created successfully';
    ELSE
        RAISE NOTICE 'Index idx_kg_cache_create_time already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 3: Add table comment
-- ============================================================================

COMMENT ON TABLE nexent.knowledge_graph_cache_t IS 'Knowledge graph subgraph cache - stores LLM-generated knowledge subgraphs for reuse and history browsing';

-- ============================================================================
-- Step 4: Verification
-- ============================================================================

SELECT
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'nexent'
    AND table_name = 'knowledge_graph_cache_t'
GROUP BY table_name
ORDER BY table_name;
