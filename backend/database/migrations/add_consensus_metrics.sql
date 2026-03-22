-- Migration: Add consensus_metrics column to consultation_record_t
-- Date: 2026-03-21
-- Description: Stores per-round CWEC algorithm metrics (CCS, AGS, CWE, CV, clusters)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'nexent'
        AND table_name = 'consultation_record_t'
        AND column_name = 'consensus_metrics'
    ) THEN
        ALTER TABLE nexent.consultation_record_t
            ADD COLUMN consensus_metrics JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Column consensus_metrics added to consultation_record_t';
    ELSE
        RAISE NOTICE 'Column consensus_metrics already exists, skipping';
    END IF;
END $$;
