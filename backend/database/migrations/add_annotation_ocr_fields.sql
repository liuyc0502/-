-- Migration: Add annotation and OCR fields to medical image tables
-- Date: 2024-11-25
-- Description: Adds annotations_data, ocr_text, and ocr_metadata columns to support
--              image annotation and OCR functionality for medical cases and patient records

-- Add columns to patient_medical_image_t
ALTER TABLE nexent.patient_medical_image_t
ADD COLUMN IF NOT EXISTS annotations_data JSONB,
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS ocr_metadata JSONB;

-- Add columns to medical_case_image_t
ALTER TABLE nexent.medical_case_image_t
ADD COLUMN IF NOT EXISTS annotations_data JSONB,
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS ocr_metadata JSONB;

-- Add comments for documentation
COMMENT ON COLUMN nexent.patient_medical_image_t.annotations_data IS 'Annotation data (JSON array of annotation objects with id, type, coordinates, color, label, remark, regionNumber)';
COMMENT ON COLUMN nexent.patient_medical_image_t.ocr_text IS 'OCR extracted text from the image';
COMMENT ON COLUMN nexent.patient_medical_image_t.ocr_metadata IS 'OCR metadata including blocks, tables, confidence scores';

COMMENT ON COLUMN nexent.medical_case_image_t.annotations_data IS 'Annotation data (JSON array of annotation objects with id, type, coordinates, color, label, remark, regionNumber)';
COMMENT ON COLUMN nexent.medical_case_image_t.ocr_text IS 'OCR extracted text from the image';
COMMENT ON COLUMN nexent.medical_case_image_t.ocr_metadata IS 'OCR metadata including blocks, tables, confidence scores';

-- Create index for faster annotation queries
CREATE INDEX IF NOT EXISTS idx_patient_medical_image_annotations
ON nexent.patient_medical_image_t USING GIN (annotations_data);

CREATE INDEX IF NOT EXISTS idx_medical_case_image_annotations
ON nexent.medical_case_image_t USING GIN (annotations_data);

-- Example annotation data structure:
-- [
--   {
--     "id": "ann-1234567890",
--     "type": "rectangle",
--     "points": [{"x": 100, "y": 100}, {"x": 200, "y": 200}],
--     "color": "#FF4D4F",
--     "strokeWidth": 2,
--     "label": "病灶",
--     "remark": "User's note about this region",
--     "regionNumber": 1,
--     "createdAt": "2024-11-25T10:00:00Z"
--   }
-- ]
