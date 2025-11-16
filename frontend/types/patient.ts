/**
 * Patient management type definitions
 */

// ============================================================================
// Patient Basic Info Types
// ============================================================================

export interface Patient {
  patient_id: number;
  name: string;
  gender: string;
  age: number;
  date_of_birth?: string;
  medical_record_no: string;
  phone?: string;
  address?: string;
  diagnosis?: string;
  allergies?: string[];
  family_history?: string;
  past_medical_history?: string[];
  tenant_id: string;
  create_time: string;
  update_time: string;
  created_by: string;
  updated_by: string;
  delete_flag: string;
}

export interface CreatePatientRequest {
  name: string;
  gender: string;
  age: number;
  medical_record_no: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  allergies?: string[];
  family_history?: string;
  past_medical_history?: string[];
}

// ============================================================================
// Timeline Types
// ============================================================================

export interface TimelineStage {
  timeline_id: number;
  patient_id: number;
  stage_type: string;
  stage_date: string;
  stage_title: string;
  diagnosis: string;
  status: 'completed' | 'current' | 'pending';
  display_order: number;
  tenant_id: string;
  create_time: string;
  update_time: string;
}

export interface TimelineDetail {
  detail_id: number;
  timeline_id: number;
  doctor_notes: string;
  pathology_findings: string;
  medications: string[];
  tenant_id: string;
  create_time: string;
  update_time: string;
}

export interface MedicalImage {
  image_id: number;
  timeline_id: number;
  image_type: string;
  image_label: string;
  image_url: string;
  thumbnail_url?: string;
  display_order: number;
  tenant_id: string;
  create_time: string;
}

export interface Metric {
  metric_id: number;
  timeline_id: number;
  metric_name: string;
  metric_full_name: string;
  metric_value: string;
  metric_unit?: string;
  metric_trend?: string;
  metric_status?: string;
  normal_range_min?: number;
  normal_range_max?: number;
  percentage?: number;
  tenant_id: string;
  create_time: string;
}

export interface Attachment {
  attachment_id: number;
  timeline_id: number;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size: number;
  tenant_id: string;
  create_time: string;
}

export interface TimelineWithDetail {
  timeline_id: number;
  patient_id: number;
  stage_type: string;
  stage_date: string;
  stage_title: string;
  diagnosis: string;
  status: 'completed' | 'current' | 'pending';
  display_order: number;
  detail?: TimelineDetail;
  images: MedicalImage[];
  metrics: Metric[];
  attachments: Attachment[];
}

export interface CreateTimelineRequest {
  patient_id: number;
  stage_type: string;
  stage_date: string;
  stage_title: string;
  diagnosis?: string;
  status?: 'completed' | 'current' | 'pending';
  display_order?: number;
}

export interface CreateTimelineDetailRequest {
  timeline_id: number;
  doctor_notes?: string;
  pathology_findings?: string;
  medications?: string[];
}

// ============================================================================
// Medical Image Types
// ============================================================================

export interface CreateMedicalImageRequest {
  timeline_id: number;
  image_type: string;
  image_label: string;
  image_url: string;
  thumbnail_url?: string;
  display_order?: number;
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface CreateMetricRequest {
  timeline_id: number;
  metric_name: string;
  metric_full_name: string;
  metric_value: string;
  metric_unit?: string;
  metric_trend?: string;
  metric_status?: string;
  normal_range_min?: number;
  normal_range_max?: number;
  percentage?: number;
}

export interface BatchCreateMetricsRequest {
  metrics: CreateMetricRequest[];
}

// ============================================================================
// Todo Types
// ============================================================================

export interface PatientTodo {
  todo_id: number;
  patient_id: number;
  todo_title: string;
  todo_description?: string;
  todo_type: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'overdue';
  assigned_doctor: string;
  tenant_id: string;
  create_time: string;
  update_time: string;
}

export interface CreateTodoRequest {
  patient_id: number;
  todo_title: string;
  todo_description?: string;
  todo_type: string;
  due_date: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'completed' | 'overdue';
}

export interface UpdateTodoStatusRequest {
  status: 'pending' | 'completed' | 'overdue';
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PatientListResponse {
  patients: Patient[];
  total: number;
}

export interface TimelineListResponse {
  timelines: TimelineStage[];
}

export interface TimelineDetailResponse {
  timeline: TimelineWithDetail;
}

export interface TodoListResponse {
  todos: PatientTodo[];
}

export interface CreatePatientResponse {
  success: boolean;
  patient_id: number;
  message: string;
}

export interface CreateTimelineResponse {
  success: boolean;
  timeline_id: number;
  message: string;
}

export interface ApiSuccessResponse {
  success: boolean;
  message: string;
}
