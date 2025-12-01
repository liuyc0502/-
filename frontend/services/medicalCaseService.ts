import { API_ENDPOINTS, ApiError } from './api';
import { getAuthHeaders, fetchWithAuth } from '@/lib/auth';
// @ts-ignore
const fetch = fetchWithAuth;

import { MedicalCase, MedicalCaseDetail, MedicalCaseListResponse, MedicalCaseSearchParams } from '@/types/medicalcase';



  /**
   * Get medical case detail by ID
   */
 export async function getDetail(caseId: number): Promise<MedicalCaseDetail> {
    const response = await fetch(API_ENDPOINTS.medicalCase.detail(caseId), {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch case detail: ${caseId}`);
    }

    return await response.json();
  }

  /**
   * Get medical case by case number
   */
 export async function getByCaseNo(caseNo: string): Promise<MedicalCaseDetail> {
    const response = await fetch(API_ENDPOINTS.medicalCase.byCaseNo(caseNo), {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch case: ${caseNo}`);
    }

    return await response.json();
  }

  /**
   * Get medical case list with optional filters
   */
 export async function getList(params: MedicalCaseSearchParams = {}): Promise<MedicalCaseListResponse> {
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
  }
 
  /**
   * Search medical cases by natural language query
   */
 export async function search(query: string, limit: number = 10): Promise<MedicalCaseListResponse> {
    const queryParams = new URLSearchParams({
      query,
      limit: limit.toString(),
    });
 
    const url = `${API_ENDPOINTS.medicalCase.search}?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to search medical cases');
    }

    return await response.json();
  }
 
  /**
   * Create a new medical case
   */
 export async function create(caseData: Partial<MedicalCase>): Promise<{ success: boolean; case_id: number; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.create, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(caseData),
    });
 
    if (!response.ok) {
      throw new Error('Failed to create medical case');
    }

    return await response.json();
  }
 
  /**
   * Update medical case
   */
 export async function update(caseId: number, caseData: Partial<MedicalCase>): Promise<{ success: boolean; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.update(caseId), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(caseData),
    });

 
    if (!response.ok) {
      throw new Error(`Failed to update case: ${caseId}`);
    }

    return await response.json();
  }
 
  /**
   * Delete medical case
   */
 export async function deleteCase(caseId: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.delete(caseId), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete case: ${caseId}`);
    }
 
    return await response.json();
 }

  /**
   * Toggle favorite (add or remove)
   */
 export async function toggleFavorite(caseId: number, action: 'add' | 'remove'): Promise<{ success: boolean; favorited: boolean; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.favorite.toggle, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ case_id: caseId, action }),
    });

 
    if (!response.ok) {
      throw new Error('Failed to toggle favorite');
    }
 
    return await response.json();
  }

 
  /**
   * Get user's favorite cases
   */
 export async function getFavorites(limit: number = 100, offset: number = 0): Promise<MedicalCaseListResponse> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

 
    const url = `${API_ENDPOINTS.medicalCase.favorite.list}?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch favorites');
    }
 
    return await response.json();
  }

 
  /**
   * Get recently viewed cases
   */
 export async function getRecentCases(limit: number = 50): Promise<MedicalCaseListResponse> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
    });

 
    const url = `${API_ENDPOINTS.medicalCase.recent.list}?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

 
    if (!response.ok) {
      throw new Error('Failed to fetch recent cases');
    }

    return await response.json();
  }
 
  /**
   * Create or update case detail
   */
 export async function createDetail(detailData: any): Promise<{ success: boolean; detail_id: number; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.detailCreate, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(detailData),
    });
  
    if (!response.ok) {
      throw new Error('Failed to create case detail');
    } 

    return await response.json();
  }
 
  /**
   * Add images to a case
   */
 export async function addImages(caseId: number, images: Array<{
    image_type?: string;
    image_description?: string;
    image_url: string;
    thumbnail_url?: string;
    display_order?: number;
  }>): Promise<{ success: boolean; created_count: number; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.images.add(caseId), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ case_id: caseId, images }),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to add images to case: ${caseId}`);
    }
 
    return await response.json();
  }
 
  /**
   * Delete all images for a case
   */
 export async function deleteImages(caseId: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.images.delete(caseId), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to delete images for case: ${caseId}`);
    }
 
    return await response.json();
  }
 
  /**
   * Add symptoms to a case
   */
 export async function addSymptoms(caseId: number, symptoms: Array<{
    symptom_name: string;
    symptom_description?: string;
    is_key_symptom?: boolean;
  }>): Promise<{ success: boolean; created_count: number; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.symptoms.add(caseId), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ case_id: caseId, symptoms }),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to add symptoms to case: ${caseId}`);
    }
 
    return await response.json();
  }
 
  /**
   * Delete all symptoms for a case
   */
 export async function deleteSymptoms(caseId: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.symptoms.delete(caseId), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to delete symptoms for case: ${caseId}`);
    }
 
    return await response.json();
  }
 
  /**
   * Add lab results to a case
   */
 export async function addLabResults(caseId: number, labResults: Array<{
    test_name: string;
    test_full_name?: string;
    test_value: string;
    test_unit?: string;
    normal_range?: string;
    is_abnormal?: boolean;
    abnormal_indicator?: string;
  }>): Promise<{ success: boolean; created_count: number; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.labResults.add(caseId), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ case_id: caseId, lab_results: labResults }),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to add lab results to case: ${caseId}`);
    }
 
    return await response.json();
  }
 
  /**
   * Delete all lab results for a case
   */
 export async function deleteLabResults(caseId: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.labResults.delete(caseId), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to delete lab results for case: ${caseId}`);
    }


    return await response.json();
  }

  /**
   * Create a medical case from AI-parsed document data
   */
 export async function createFromParsed(caseData: Partial<MedicalCase> & {
    symptoms?: string[] | string;
    physical_examination?: string;
    lab_results?: string;
    imaging_findings?: string;
    pathology_findings?: string;
    diagnosis_result?: string;
    treatment_plan?: string;
    clinical_outcome?: string;
    case_discussion?: string;
  }): Promise<{ success: boolean; case_id: number; case_no: string; message: string }> {
    const response = await fetch(API_ENDPOINTS.medicalCase.createFromParsed, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(caseData),
    });

    if (!response.ok) {
      throw new Error('Failed to create medical case from parsed data');
    }

    return await response.json();
  }


  const medicalCaseService = {
    getDetail,
    getByCaseNo,
    getList,
    search,
    create,
    update,
    delete: deleteCase,
    deleteCase,
    toggleFavorite,
    getFavorites,
    getRecentCases,
    createDetail,
    addImages,
    deleteImages,
    addSymptoms,
    deleteSymptoms,
    addLabResults,
    deleteLabResults,
    createFromParsed,
  };

export default medicalCaseService;
