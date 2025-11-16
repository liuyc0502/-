import { getAuthHeaders } from "@/lib/auth";
import log from "@/lib/logger";
import type {
  Patient,
  CreatePatientRequest,
  CreatePatientResponse,
  PatientListResponse,
  TimelineStage,
  TimelineWithDetail,
  CreateTimelineRequest,
  CreateTimelineResponse,
  CreateTimelineDetailRequest,
  CreateMedicalImageRequest,
  BatchCreateMetricsRequest,
  PatientTodo,
  CreateTodoRequest,
  UpdateTodoStatusRequest,
  ApiSuccessResponse,
  TimelineListResponse,
  TimelineDetailResponse,
  TodoListResponse,
} from "@/types/patient";
 
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010/api";
 
// ============================================================================
// Patient Basic Info Services
// ============================================================================
/**
 * Create a new patient record
 */
export async function createPatient(
  patientData: CreatePatientRequest
): Promise<CreatePatientResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/patient/create`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patientData),
    });


    if (!response.ok) {
      throw new Error(`Failed to create patient: ${response.statusText}`);
    }
 
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to create patient:", error);
    throw error;
  }
}
 
/**
 * Get patient by ID
 */
export async function getPatient(patientId: number): Promise<Patient> {
  try {
    const response = await fetch(`${API_BASE_URL}/patient/${patientId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get patient: ${response.statusText}`);
    }
 
    const data = await response.json();
    return data.patient;
  } catch (error) {
    log.error(`Failed to get patient ${patientId}:`, error);
    throw error;
  }
}
 
/**
 * List patients with optional search and filters
 */
export async function listPatients(params?: {
  search?: string;
  filter_type?: string;
  limit?: number;
  offset?: number;
}): Promise<PatientListResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append("search", params.search);
    if (params?.filter_type) queryParams.append("filter_type", params.filter_type);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());
 
    const url = `${API_BASE_URL}/patient/list${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `Failed to list patients: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = `Failed to list patients (${response.status}): ${errorData.detail}`;
        } else if (errorData.message) {
          errorMessage = `Failed to list patients (${response.status}): ${errorData.message}`;
        } else {
          errorMessage = `Failed to list patients (${response.status}): ${JSON.stringify(errorData)}`;
        }
      } catch (e) {
        // If response is not JSON, use status text
        const text = await response.text().catch(() => "");
        if (text) {
          errorMessage = `Failed to list patients (${response.status}): ${text}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to list patients:", error);
    // Ensure error message is a string
    if (error instanceof Error) {
      // Check for network errors
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        throw new Error("无法连接到服务器，请检查后端服务是否正在运行");
      }
      throw error;
    } else if (typeof error === "string") {
      throw new Error(error);
    } else {
      throw new Error(`Failed to list patients: ${JSON.stringify(error)}`);
    }
  }
}
 
/**
 * Update patient information
 */
export async function updatePatient(
  patientId: number,
  patientData: Partial<CreatePatientRequest>
): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/patient/${patientId}/update`, {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patientData),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to update patient: ${response.statusText}`);
    }
 
    const data = await response.json();
    return data;
  } catch (error) {
    log.error(`Failed to update patient ${patientId}:`, error);
    throw error;
  }
}
 
/**
 * Delete patient (soft delete)
 */
export async function deletePatient(patientId: number): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/patient/${patientId}/delete`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to delete patient: ${response.statusText}`);
    }
 
    const data = await response.json();
    return data;
  } catch (error) {
    log.error(`Failed to delete patient ${patientId}:`, error);
    throw error;
  }
}
 
// ============================================================================
// Timeline Services
// ============================================================================
 
/**
 * Create a new timeline stage
 */
export async function createTimelineStage(
  timelineData: CreateTimelineRequest
): Promise<CreateTimelineResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/patient/timeline/create`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(timelineData),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to create timeline: ${response.statusText}`);
    }
 
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to create timeline:", error);
    throw error;
  }
}
 
/**
 * Get patient timeline
 */
export async function getPatientTimeline(patientId: number): Promise<TimelineStage[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/patient/${patientId}/timeline`, {
      headers: getAuthHeaders(),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to get timeline: ${response.statusText}`);
    }
 
    const data: TimelineListResponse = await response.json();
    return data.timelines;
  } catch (error) {
    log.error(`Failed to get timeline for patient ${patientId}:`, error);
    throw error;
  }
}
 
/**
 * Get timeline detail for a specific stage
 */
export async function getTimelineDetail(timelineId: number): Promise<TimelineWithDetail> {
  try {
    const response = await fetch(`${API_BASE_URL}/patient/timeline/${timelineId}/detail`, {
      headers: getAuthHeaders(),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to get timeline detail: ${response.statusText}`);
    }
 
    const data: TimelineDetailResponse = await response.json();
    return data.timeline;
  } catch (error) {
    log.error(`Failed to get timeline detail ${timelineId}:`, error);
    throw error;
  }
}
 
/**
 * Save timeline detail (create or update)
 */
export async function saveTimelineDetail(
  detailData: CreateTimelineDetailRequest
): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/patient/timeline/detail/save`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(detailData),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to save timeline detail: ${response.statusText}`);
    }
 
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to save timeline detail:", error);
    throw error;
  }
}
 
// ============================================================================
// Medical Image Services
// ============================================================================
 
/**
 * Create a medical image record
 */
export async function createMedicalImage(
  imageData: CreateMedicalImageRequest
): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/patient/timeline/image/create`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(imageData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create medical image: ${response.statusText}`);
    }


    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to create medical image:", error);
    throw error;
  }
}


// ============================================================================
// Metrics Services
// ============================================================================

/**
 * Batch create patient metrics
 */
export async function batchCreateMetrics(
  metricsData: BatchCreateMetricsRequest
): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/patient/timeline/metrics/batch`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metricsData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create metrics: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to batch create metrics:", error);
    throw error;
  }
}
const getJsonAuthHeaders = () => ({
  ...getAuthHeaders(),
  "Content-Type": "application/json",
});

async function jsonRequest<T>(url: string, init: RequestInit, errorPrefix: string): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`${errorPrefix}: ${response.statusText}`);
  }

  return response.json();
}

export async function createPatientTodo(
  todoData: CreateTodoRequest
): Promise<ApiSuccessResponse> {
  try {
    return await jsonRequest<ApiSuccessResponse>(
      `${API_BASE_URL}/patient/todo/create`,
      {
        method: "POST",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify(todoData),
      },
      "Failed to create todo"
    );
  } catch (error) {
    log.error("Failed to create todo:", error);
    throw error;
  }
}

export async function getPatientTodos(
  patientId: number,
  status?: string
): Promise<PatientTodo[]> {
  try {
    const statusQuery = status ? `?status=${encodeURIComponent(status)}` : "";
    const data = await jsonRequest<TodoListResponse>(
      `${API_BASE_URL}/patient/${patientId}/todos${statusQuery}`,
      {
        headers: getAuthHeaders(),
      },
      "Failed to get todos"
    );

    return data.todos;
  } catch (error) {
    log.error(`Failed to get todos for patient ${patientId}:`, error);
    throw error;
  }
}

export async function updateTodoStatus(
  todoId: number,
  statusData: UpdateTodoStatusRequest
): Promise<ApiSuccessResponse> {
  try {
    return await jsonRequest<ApiSuccessResponse>(
      `${API_BASE_URL}/patient/todo/${todoId}/status`,
      {
        method: "PUT",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify(statusData),
      },
      "Failed to update todo status"
    );
  } catch (error) {
    log.error(`Failed to update todo status ${todoId}:`, error);
    throw error;
  }
}


// ============================================================================
// Export all services
// ============================================================================

const patientService = {
  // Patient
  createPatient,
  getPatient,
  listPatients,
  updatePatient,
  deletePatient,

  // Timeline
  createTimelineStage,
  getPatientTimeline,
  getTimelineDetail,
  saveTimelineDetail,

  // Medical Images
  createMedicalImage,

  // Metrics
  batchCreateMetrics,


  // Todos
  createPatientTodo,
  getPatientTodos,
  updateTodoStatus,
};


export default patientService;
