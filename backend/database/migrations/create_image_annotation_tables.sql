-- Migration: Create image annotation and analysis tables
-- Date: 2025-01-27
-- Description: Add tables for medical image annotations and AI-powered analysis

-- Table 1: Patient Image Annotation
-- Stores user-created annotations (regions of interest) on medical images
CREATE TABLE IF NOT EXISTS nexent.patient_image_annotation_t (
    annotation_id SERIAL PRIMARY KEY,
    image_id INTEGER NOT NULL,  -- References patient_medical_image_t.image_id
    annotation_type VARCHAR(50) NOT NULL,  -- 'lesion', 'control', 'shadow', 'hemorrhage', 'artifact', 'other'
    annotation_shape VARCHAR(20) NOT NULL,  -- 'circle', 'rectangle', 'polygon'
    coordinates JSONB NOT NULL,  -- Shape coordinates: {"shape":"circle","x":100,"y":200,"radius":50}
    annotation_color VARCHAR(20) DEFAULT '#FF0000',  -- Color code for visualization
    annotation_label VARCHAR(200),  -- User-provided description/notes
    annotation_order INTEGER,  -- Sequential number for region identification (Region 1, Region 2...)
    cropped_image_url VARCHAR(500),  -- URL of cropped region image for AI analysis
    tenant_id VARCHAR(100) NOT NULL,

    -- Standard audit fields
    create_time TIMESTAMP DEFAULT NOW(),
    update_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    delete_flag VARCHAR(1) DEFAULT 'N'
);

-- Create indexes for performance
CREATE INDEX idx_annotation_image ON nexent.patient_image_annotation_t(image_id, delete_flag);
CREATE INDEX idx_annotation_tenant ON nexent.patient_image_annotation_t(tenant_id, delete_flag);

-- Add comments for documentation
COMMENT ON TABLE nexent.patient_image_annotation_t IS 'Stores annotations (regions of interest) on medical images for AI analysis and doctor review';
COMMENT ON COLUMN nexent.patient_image_annotation_t.annotation_type IS 'Predefined categories: lesion, control, shadow, hemorrhage, artifact, other';
COMMENT ON COLUMN nexent.patient_image_annotation_t.coordinates IS 'JSON object containing shape-specific coordinates';
COMMENT ON COLUMN nexent.patient_image_annotation_t.annotation_order IS 'Sequential region number displayed to user (Region 1, 2, 3...)';
COMMENT ON COLUMN nexent.patient_image_annotation_t.cropped_image_url IS 'MinIO URL of cropped region for efficient AI model input';


-- Table 2: Patient Image Analysis
-- Stores AI-powered analysis results for images and annotated regions
CREATE TABLE IF NOT EXISTS nexent.patient_image_analysis_t (
    analysis_id SERIAL PRIMARY KEY,
    image_id INTEGER NOT NULL,  -- References patient_medical_image_t.image_id
    annotation_id INTEGER,  -- Optional: references patient_image_annotation_t.annotation_id for region-specific analysis
    analysis_type VARCHAR(50) NOT NULL,  -- 'region_analysis', 'full_image_analysis', 'comparison', 'abnormality_detection'
    analysis_prompt TEXT NOT NULL,  -- User's question or analysis request
    analysis_result TEXT NOT NULL,  -- AI model's response/findings
    model_name VARCHAR(100),  -- Model used (e.g., 'gpt-4-vision', 'claude-3-5-sonnet')
    confidence_score NUMERIC(5,4),  -- Optional: model confidence (0.0000-1.0000)
    conversation_id INTEGER,  -- Optional: link to conversation_record_t for context
    tenant_id VARCHAR(100) NOT NULL,

    -- Standard audit fields
    create_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    delete_flag VARCHAR(1) DEFAULT 'N'
);

-- Create indexes for performance
CREATE INDEX idx_analysis_image ON nexent.patient_image_analysis_t(image_id, delete_flag);
CREATE INDEX idx_analysis_annotation ON nexent.patient_image_analysis_t(annotation_id, delete_flag);
CREATE INDEX idx_analysis_conversation ON nexent.patient_image_analysis_t(conversation_id, delete_flag);
CREATE INDEX idx_analysis_tenant ON nexent.patient_image_analysis_t(tenant_id, delete_flag);

-- Add comments for documentation
COMMENT ON TABLE nexent.patient_image_analysis_t IS 'Stores AI-powered analysis results for medical images and annotated regions';
COMMENT ON COLUMN nexent.patient_image_analysis_t.annotation_id IS 'NULL for full image analysis; links to specific annotation for region analysis';
COMMENT ON COLUMN nexent.patient_image_analysis_t.analysis_type IS 'Type of analysis performed: region_analysis, full_image_analysis, comparison, abnormality_detection';
COMMENT ON COLUMN nexent.patient_image_analysis_t.confidence_score IS 'Optional model confidence score (0.0-1.0)';
COMMENT ON COLUMN nexent.patient_image_analysis_t.conversation_id IS 'Links analysis to conversation for context tracking';
