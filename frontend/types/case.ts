/**
 * Case library type definitions
 */

// ============================================================================
// Case Basic Info Types
// ============================================================================

export interface CaseRecord {
  case_id: number;
  case_no: string;
  diagnosis: string;
  patient_age: number;
  patient_gender: string;
  chief_complaint?: string;
  symptoms: string[];
  similarity_score?: number;
  tenant_id: string;
  create_time: string;
  update_time: string;
  created_by: string;
  updated_by: string;
  delete_flag: string;
}

export interface CaseDetail {
  case_id: number;
  case_no: string;
  diagnosis: string;
  patient_age: number;
  patient_gender: string;
  chief_complaint?: string;
  present_illness?: string;
  past_medical_history?: string;
  physical_examination?: string;
  laboratory_tests?: LaboratoryTest[];
  imaging_findings?: string;
  treatment_plan?: string;
  prognosis?: string;
  symptoms: string[];
  tenant_id: string;
  create_time: string;
  update_time: string;
}

export interface LaboratoryTest {
  test_id?: number;
  case_id: number;
  test_name: string;
  test_value: string;
  test_unit?: string;
  normal_range?: string;
  is_abnormal: boolean;
  tenant_id: string;
}

export interface CreateCaseRequest {
  case_no: string;
  diagnosis: string;
  patient_age: number;
  patient_gender: string;
  chief_complaint?: string;
  present_illness?: string;
  past_medical_history?: string;
  physical_examination?: string;
  imaging_findings?: string;
  treatment_plan?: string;
  prognosis?: string;
  symptoms: string[];
  laboratory_tests?: Omit<LaboratoryTest, 'case_id' | 'test_id' | 'tenant_id'>[];
}

// ============================================================================
// Case Search and Filter Types
// ============================================================================

export interface CaseSearchRequest {
  query?: string;
  disease_types?: string[];
  age_ranges?: string[];
  gender?: string;
  time_filter?: string;
  page?: number;
  page_size?: number;
}

export interface CaseSimilarityRequest {
  symptoms: string[];
  diagnosis?: string;
  age?: number;
  gender?: string;
  limit?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface CaseListResponse {
  cases: CaseRecord[];
  total: number;
}

export interface CaseDetailResponse {
  case: CaseDetail;
  similar_cases?: CaseRecord[];
}

export interface CreateCaseResponse {
  success: boolean;
  case_id: number;
  message: string;
}
