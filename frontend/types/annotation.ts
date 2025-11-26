/**
 * TypeScript type definitions for medical image annotation feature
 */

export type AnnotationType = 'lesion' | 'control' | 'shadow' | 'hemorrhage' | 'artifact' | 'other';
export type AnnotationShape = 'circle' | 'rectangle' | 'polygon';

export interface AnnotationCoordinates {
  shape: AnnotationShape;
  // Circle coordinates
  x?: number;
  y?: number;
  radius?: number;
  // Rectangle coordinates
  width?: number;
  height?: number;
  // Polygon coordinates
  points?: Array<{ x: number; y: number }>;
}

export interface Annotation {
  annotation_id: number;
  image_id: number;
  annotation_type: AnnotationType;
  annotation_shape: AnnotationShape;
  coordinates: AnnotationCoordinates;
  annotation_color: string;
  annotation_label: string;
  annotation_order: number;
  region_name: string;  // "Region 1", "Region 2", etc.
  create_time?: string;
  created_by?: string;
}

export interface ImageAnalysis {
  analysis_id: number;
  image_id: number;
  annotation_id?: number;
  analysis_type: string;
  analysis_prompt: string;
  analysis_result: string;
  model_name?: string;
  confidence_score?: number;
  conversation_id?: number;
  create_time: string;
}

export type UploadPurpose = 'analysis' | 'patient_record' | 'case_record';

export interface CreateAnnotationRequest {
  image_id: number;
  annotation_type: AnnotationType;
  annotation_shape: AnnotationShape;
  coordinates: AnnotationCoordinates;
  annotation_label?: string;
  annotation_color?: string;
}

export interface AnalyzeRegionRequest {
  annotation_id: number;
  question: string;
  conversation_id?: number;
}

// Annotation colors for different types
export const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  lesion: '#FF4D4F',        // Red - for lesions
  control: '#52C41A',       // Green - for normal control areas
  shadow: '#FAAD14',        // Orange/Yellow - for shadow regions
  hemorrhage: '#A0522D',    // Dark red/brown - for hemorrhage
  artifact: '#8C8C8C',      // Gray - for artifacts
  other: '#1890FF',         // Blue - for other marked areas
};

// Annotation type labels (Chinese)
export const ANNOTATION_TYPE_LABELS: Record<AnnotationType, string> = {
  lesion: '病灶',
  control: '正常对照',
  shadow: '阴影/疑似',
  hemorrhage: '出血',
  artifact: '伪影',
  other: '其他',
};
