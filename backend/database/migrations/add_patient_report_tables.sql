-- ============================================================================
-- Patient Report Tables Migration
-- Date: 2025-01-28
-- Purpose: Add tables for lab reports and imaging reports
-- ============================================================================

-- ============================================================================
-- 1. Lab Report Main Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS nexent.patient_lab_report_t (
  report_id SERIAL PRIMARY KEY,
  timeline_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,

  report_type VARCHAR(100),
  report_date VARCHAR(20),
  report_institution VARCHAR(200),
  report_number VARCHAR(100),

  report_image_url VARCHAR(500),
  ai_summary TEXT,

  tenant_id VARCHAR(100),
  create_time TIMESTAMP DEFAULT NOW(),
  update_time TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  delete_flag VARCHAR(1) DEFAULT 'N'
);

COMMENT ON TABLE nexent.patient_lab_report_t IS 'Lab report main table';
COMMENT ON COLUMN nexent.patient_lab_report_t.report_id IS 'Lab report ID, primary key';
COMMENT ON COLUMN nexent.patient_lab_report_t.timeline_id IS 'Associated timeline ID';
COMMENT ON COLUMN nexent.patient_lab_report_t.patient_id IS 'Patient ID for quick reference';
COMMENT ON COLUMN nexent.patient_lab_report_t.report_type IS 'Report type (e.g., liver function, kidney function, blood routine)';
COMMENT ON COLUMN nexent.patient_lab_report_t.report_date IS 'Report date (YYYY-MM-DD)';
COMMENT ON COLUMN nexent.patient_lab_report_t.report_institution IS 'Testing institution/hospital';
COMMENT ON COLUMN nexent.patient_lab_report_t.report_number IS 'Report number';
COMMENT ON COLUMN nexent.patient_lab_report_t.report_image_url IS 'Report image URL';
COMMENT ON COLUMN nexent.patient_lab_report_t.ai_summary IS 'AI-generated summary';

-- ============================================================================
-- 2. Lab Report Item Detail Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS nexent.patient_lab_report_item_t (
  item_id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL,

  test_item_name VARCHAR(200),
  test_result VARCHAR(100),
  test_unit VARCHAR(50),
  reference_range VARCHAR(100),
  test_method VARCHAR(200),

  abnormal_flag VARCHAR(10),
  result_hint VARCHAR(100),

  display_order INTEGER DEFAULT 0,

  tenant_id VARCHAR(100),
  create_time TIMESTAMP DEFAULT NOW(),
  update_time TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  delete_flag VARCHAR(1) DEFAULT 'N'
);

COMMENT ON TABLE nexent.patient_lab_report_item_t IS 'Lab report item detail table';
COMMENT ON COLUMN nexent.patient_lab_report_item_t.item_id IS 'Lab report item ID, primary key';
COMMENT ON COLUMN nexent.patient_lab_report_item_t.report_id IS 'Associated lab report ID';
COMMENT ON COLUMN nexent.patient_lab_report_item_t.test_item_name IS 'Test item name';
COMMENT ON COLUMN nexent.patient_lab_report_item_t.test_result IS 'Test result value';
COMMENT ON COLUMN nexent.patient_lab_report_item_t.test_unit IS 'Unit of measurement';
COMMENT ON COLUMN nexent.patient_lab_report_item_t.reference_range IS 'Normal reference range';
COMMENT ON COLUMN nexent.patient_lab_report_item_t.test_method IS 'Testing method';
COMMENT ON COLUMN nexent.patient_lab_report_item_t.abnormal_flag IS 'Abnormal indicator (↑/↓/正常)';
COMMENT ON COLUMN nexent.patient_lab_report_item_t.result_hint IS 'Result hint (high/low/normal/critical)';
COMMENT ON COLUMN nexent.patient_lab_report_item_t.display_order IS 'Display order';

-- ============================================================================
-- 3. Imaging Report Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS nexent.patient_imaging_report_t (
  report_id SERIAL PRIMARY KEY,
  timeline_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,

  imaging_type VARCHAR(100),
  imaging_date VARCHAR(20),
  imaging_institution VARCHAR(200),
  report_number VARCHAR(100),

  examination_site VARCHAR(200),
  imaging_findings TEXT,
  diagnostic_impression TEXT,
  recommendations TEXT,

  report_image_url VARCHAR(500),
  ai_summary TEXT,

  tenant_id VARCHAR(100),
  create_time TIMESTAMP DEFAULT NOW(),
  update_time TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  delete_flag VARCHAR(1) DEFAULT 'N'
);

COMMENT ON TABLE nexent.patient_imaging_report_t IS 'Imaging report table';
COMMENT ON COLUMN nexent.patient_imaging_report_t.report_id IS 'Imaging report ID, primary key';
COMMENT ON COLUMN nexent.patient_imaging_report_t.timeline_id IS 'Associated timeline ID';
COMMENT ON COLUMN nexent.patient_imaging_report_t.patient_id IS 'Patient ID for quick reference';
COMMENT ON COLUMN nexent.patient_imaging_report_t.imaging_type IS 'Imaging type (chest X-ray, CT, MRI, ultrasound)';
COMMENT ON COLUMN nexent.patient_imaging_report_t.imaging_date IS 'Imaging date (YYYY-MM-DD)';
COMMENT ON COLUMN nexent.patient_imaging_report_t.imaging_institution IS 'Imaging institution';
COMMENT ON COLUMN nexent.patient_imaging_report_t.report_number IS 'Report number';
COMMENT ON COLUMN nexent.patient_imaging_report_t.examination_site IS 'Examination site';
COMMENT ON COLUMN nexent.patient_imaging_report_t.imaging_findings IS 'Imaging findings (detailed description)';
COMMENT ON COLUMN nexent.patient_imaging_report_t.diagnostic_impression IS 'Diagnostic impression';
COMMENT ON COLUMN nexent.patient_imaging_report_t.recommendations IS 'Recommendations';
COMMENT ON COLUMN nexent.patient_imaging_report_t.report_image_url IS 'Report image URL';
COMMENT ON COLUMN nexent.patient_imaging_report_t.ai_summary IS 'AI-generated summary';

-- ============================================================================
-- Create Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lab_report_timeline ON nexent.patient_lab_report_t(timeline_id);
CREATE INDEX IF NOT EXISTS idx_lab_report_patient ON nexent.patient_lab_report_t(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_report_date ON nexent.patient_lab_report_t(report_date);
CREATE INDEX IF NOT EXISTS idx_lab_report_tenant ON nexent.patient_lab_report_t(tenant_id);

CREATE INDEX IF NOT EXISTS idx_lab_item_report ON nexent.patient_lab_report_item_t(report_id);
CREATE INDEX IF NOT EXISTS idx_lab_item_tenant ON nexent.patient_lab_report_item_t(tenant_id);

CREATE INDEX IF NOT EXISTS idx_imaging_report_timeline ON nexent.patient_imaging_report_t(timeline_id);
CREATE INDEX IF NOT EXISTS idx_imaging_report_patient ON nexent.patient_imaging_report_t(patient_id);
CREATE INDEX IF NOT EXISTS idx_imaging_report_date ON nexent.patient_imaging_report_t(imaging_date);
CREATE INDEX IF NOT EXISTS idx_imaging_report_tenant ON nexent.patient_imaging_report_t(tenant_id);

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================
-- DROP INDEX IF EXISTS nexent.idx_imaging_report_tenant;
-- DROP INDEX IF EXISTS nexent.idx_imaging_report_date;
-- DROP INDEX IF EXISTS nexent.idx_imaging_report_patient;
-- DROP INDEX IF EXISTS nexent.idx_imaging_report_timeline;
-- DROP INDEX IF EXISTS nexent.idx_lab_item_tenant;
-- DROP INDEX IF EXISTS nexent.idx_lab_item_report;
-- DROP INDEX IF EXISTS nexent.idx_lab_report_tenant;
-- DROP INDEX IF EXISTS nexent.idx_lab_report_date;
-- DROP INDEX IF EXISTS nexent.idx_lab_report_patient;
-- DROP INDEX IF EXISTS nexent.idx_lab_report_timeline;
-- DROP TABLE IF EXISTS nexent.patient_imaging_report_t;
-- DROP TABLE IF EXISTS nexent.patient_lab_report_item_t;
-- DROP TABLE IF EXISTS nexent.patient_lab_report_t;
