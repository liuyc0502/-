/**
 * Case library service
 * Frontend API client for case records
 */

import { getAuthHeaders } from "@/lib/auth";
import log from "@/lib/logger";
import type {
  CaseRecord,
  CaseDetail,
  CreateCaseRequest,
  CaseSearchRequest,
  CaseSimilarityRequest,
  CaseListResponse,
  CaseDetailResponse,
  CreateCaseResponse,
  LaboratoryTest,
} from "@/types/case";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010/api";

// ============================================================================
// Case Basic Info Services
// ============================================================================

/**
 * Create a new case record
 */
export async function createCase(
  caseData: CreateCaseRequest
): Promise<CreateCaseResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/case/create`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(caseData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create case: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to create case:", error);
    throw error;
  }
}

/**
 * Get case by ID
 */
export async function getCase(caseId: number): Promise<CaseRecord> {
  try {
    const response = await fetch(`${API_BASE_URL}/case/${caseId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get case: ${response.statusText}`);
    }

    const data = await response.json();
    return data.case;
  } catch (error) {
    log.error(`Failed to get case ${caseId}:`, error);
    throw error;
  }
}

/**
 * Get case detail with laboratory tests and similar cases
 */
export async function getCaseDetail(caseId: number): Promise<CaseDetail> {
  try {
    const response = await fetch(`${API_BASE_URL}/case/${caseId}/detail`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get case detail: ${response.statusText}`);
    }

    const data: CaseDetailResponse = await response.json();
    return data.case;
  } catch (error) {
    log.error(`Failed to get case detail ${caseId}:`, error);
    throw error;
  }
}

/**
 * List cases with optional search and filters
 */
export async function listCases(params?: CaseSearchRequest): Promise<CaseListResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.append("search", params.query);
    if (params?.disease_types && params.disease_types.length > 0) {
      params.disease_types.forEach((type) => {
        queryParams.append("disease_types", type);
      });
    }
    if (params?.age_ranges && params.age_ranges.length > 0) {
      params.age_ranges.forEach((range) => {
        queryParams.append("age_ranges", range);
      });
    }
    if (params?.gender) queryParams.append("gender", params.gender);
    if (params?.page) queryParams.append("offset", ((params.page - 1) * (params.page_size || 100)).toString());
    if (params?.page_size) queryParams.append("limit", params.page_size.toString());

    const url = `${API_BASE_URL}/case/list${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to list cases: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to list cases:", error);
    throw error;
  }
}

/**
 * Search for similar cases
 */
export async function searchSimilarCases(
  params: CaseSimilarityRequest
): Promise<CaseListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/case/search/similar`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to search similar cases: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to search similar cases:", error);
    throw error;
  }
}

/**
 * Update case information
 */
export async function updateCase(
  caseId: number,
  caseData: Partial<CreateCaseRequest>
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/case/${caseId}/update`, {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(caseData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update case: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error(`Failed to update case ${caseId}:`, error);
    throw error;
  }
}

/**
 * Delete case (soft delete)
 */
export async function deleteCase(caseId: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/case/${caseId}/delete`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete case: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error(`Failed to delete case ${caseId}:`, error);
    throw error;
  }
}

// ============================================================================
// Laboratory Test Services
// ============================================================================

/**
 * Batch create laboratory tests for a case
 */
export async function batchCreateLabTests(
  caseId: number,
  labTests: Omit<LaboratoryTest, 'test_id' | 'case_id' | 'tenant_id'>[]
): Promise<{ success: boolean; created_count: number; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/case/lab_tests/batch`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ case_id: caseId, lab_tests: labTests }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create lab tests: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to batch create lab tests:", error);
    throw error;
  }
}

/**
 * Get laboratory tests for a case
 */
export async function getCaseLabTests(caseId: number): Promise<LaboratoryTest[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/case/${caseId}/lab_tests`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get lab tests: ${response.statusText}`);
    }

    const data = await response.json();
    return data.lab_tests;
  } catch (error) {
    log.error(`Failed to get lab tests for case ${caseId}:`, error);
    throw error;
  }
}

// ============================================================================
// Export all services
// ============================================================================

const caseService = {
  // Case
  createCase,
  getCase,
  getCaseDetail,
  listCases,
  searchSimilarCases,
  updateCase,
  deleteCase,

  // Laboratory Tests
  batchCreateLabTests,
  getCaseLabTests,
};

export default caseService;
