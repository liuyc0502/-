import { getAuthHeaders } from "@/lib/auth";
import { API_ENDPOINTS } from "@/services/api";

export interface MedicalCase {
    case_id: number;
    case_no: string;
    case_title?: string;
    diagnosis: string;
    disease_type: string;
    age: number;
    gender: string;
    chief_complaint?: string;
    category?: string;
    is_classic?: boolean;
    tags?: string[];
    view_count?: number;
    create_time?: string;
    update_time?: string;
  }
  
  
  export interface MedicalCaseDetail extends MedicalCase{
    detail?: {
      present_illness_history?: string;
      past_medical_history?: string;
      family_history?: string;
      physical_examination?: any;
      imaging_results?: any;
      diagnosis_basis?: string;
      treatment_plan?: string;
      medications?: string[];
      prognosis?: string;
      clinical_notes?: string;
    };
    symptoms?: Array<{
      symptom_id: number;
      symptom_name: string;
      symptom_description?: string;
      is_key_symptom?: boolean;
    }>;
    lab_results?: Array<{
      lab_result_id: number;
      test_name: string;
      test_full_name?: string;
      test_value: string;
      test_unit?: string;
      normal_range?: string;
      is_abnormal?: boolean;
      abnormal_indicator?: string;
    }>;
    images?: Array<{
      image_id: number;
      image_type: string;
      image_description?: string;
      image_url: string;
      thumbnail_url?: string;
      display_order?: number;
    }>;
  }
  
  
  export interface MedicalCaseListResponse {
    cases: MedicalCase[];
    total: number;
  }
  
   
  export interface MedicalCaseSearchParams {
    search?: string;
    disease_types?: string[];
    age_range?: string;
    gender?: string;
    is_classic?: boolean;
    limit?: number;
    offset?: number;
  }
  
   
  export const medicalCaseService = {
    /**
     * Get medical case list with optional filters
     */
    async getList(params: MedicalCaseSearchParams = {}): Promise<MedicalCaseListResponse> {
      const queryParams = new URLSearchParams();
  
      if (params.search) {
        queryParams.append('search', params.search);
      }
      if (params.disease_types && params.disease_types.length > 0) {
        queryParams.append('disease_types', params.disease_types.join(','));
      }
      if (params.age_range) {
        queryParams.append('age_range', params.age_range);
      }
      if (params.gender) {
        queryParams.append('gender', params.gender);
      }
      if (params.is_classic !== undefined) {
        queryParams.append('is_classic', params.is_classic.toString());
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.offset) {
        queryParams.append('offset', params.offset.toString());
      }
  
      const url = `${API_ENDPOINTS.medicalCase.list}?${queryParams.toString()}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch medical cases');
      }
  
      return await response.json();
    },
}