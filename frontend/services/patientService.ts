import { API_ENDPOINTS } from "./api";
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
  LabReport,
  ImagingReport,
  CreateLabReportRequest,
  CreateImagingReportRequest,
} from "@/types/patient";
 
 
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
    const response = await fetch(API_ENDPOINTS.patient.create, {
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
    const response = await fetch(API_ENDPOINTS.patient.detail(patientId), {
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
 * Get patient by email address (for patient portal)
 */
export async function getPatientByEmail(email: string): Promise<Patient> {
  try {
    const response = await fetch(`${API_ENDPOINTS.patient.list.replace('/list', '/profile/by_email')}?email=${encodeURIComponent(email)}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get patient by email: ${response.statusText}`);
    }

    const data = await response.json();
    return data.patient;
  } catch (error) {
    log.error(`Failed to get patient by email ${email}:`, error);
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
 
    const url = `${API_ENDPOINTS.patient.list}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

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
    const response = await fetch(API_ENDPOINTS.patient.update(patientId), {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patientData),
    });
 
    if (!response.ok) {
      let errorMessage = `Failed to update patient: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = `Failed to update patient (${response.status}): ${errorData.detail}`;
        } else if (errorData.message) {
          errorMessage = `Failed to update patient (${response.status}): ${errorData.message}`;
        }
      } catch (e) {
        // If response is not JSON, use status text
        const text = await response.text().catch(() => "");
        if (text) {
          errorMessage = `Failed to update patient (${response.status}): ${text}`;
        }
      }
      throw new Error(errorMessage);
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
    const response = await fetch(API_ENDPOINTS.patient.delete(patientId), {
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
    const response = await fetch(API_ENDPOINTS.patient.timeline.create, {
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
    const response = await fetch(API_ENDPOINTS.patient.timeline.list(patientId), {
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
    const response = await fetch(API_ENDPOINTS.patient.timeline.detail(timelineId), {
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
    const response = await fetch(API_ENDPOINTS.patient.timeline.createDetail, {
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

 

/**
 * Delete a timeline stage
 */
export async function deleteTimeline(timelineId: number): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.patient.timeline.delete(timelineId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete timeline: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error(`Failed to delete timeline ${timelineId}:`, error);
    throw error;
  }
}

 
/**
 * Delete all images for a timeline
 */
export async function deleteTimelineImages(timelineId: number): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.patient.image.delete(timelineId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to delete timeline images: ${response.statusText}`);
    }
 
    const data = await response.json();
    return data;
  } catch (error) {
    log.error(`Failed to delete timeline images ${timelineId}:`, error);
    throw error;
  }
}
 
/**
 * Delete all metrics for a timeline
 */
export async function deleteTimelineMetrics(timelineId: number): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.patient.metrics.delete(timelineId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to delete timeline metrics: ${response.statusText}`);
    }
 
    const data = await response.json();
    return data;
  } catch (error) {
    log.error(`Failed to delete timeline metrics ${timelineId}:`, error);
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
    const response = await fetch(API_ENDPOINTS.patient.image.create, {
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
    const response = await fetch(API_ENDPOINTS.patient.metrics.batchCreate, {
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

// ============================================================================
// Helper Functions
// ============================================================================

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

// ============================================================================
// Todo Services
// ============================================================================

export async function createPatientTodo(
  todoData: CreateTodoRequest
): Promise<ApiSuccessResponse> {
  try {
    return await jsonRequest<ApiSuccessResponse>(
      API_ENDPOINTS.patient.todo.create,
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
      API_ENDPOINTS.patient.todo.list(patientId) + statusQuery,
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
      API_ENDPOINTS.patient.todo.updateStatus(todoId),
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

export async function deletePatientTodo(todoId: number): Promise<ApiSuccessResponse> {
  try {
    return await jsonRequest<ApiSuccessResponse>(
      API_ENDPOINTS.patient.todo.delete(todoId),
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
      "Failed to delete todo"
    );
  } catch (error) {
    log.error(`Failed to delete todo ${todoId}:`, error);
    throw error;
  }
}

// ============================================================================
// Attachment Services
// ============================================================================

export async function createTimelineAttachment(
  attachmentData: {
    timeline_id: number;
    file_name: string;
    file_type: string;
    file_url: string;
    file_size: number;
  }
): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.patient.attachment.create, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(attachmentData),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to create attachment: ${response.statusText}`);
    }
 
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to create attachment:", error);
    throw error;
  }
}

export async function deleteTimelineAttachments(timelineId: number): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.patient.attachment.delete(timelineId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
 
    if (!response.ok) {
      throw new Error(`Failed to delete timeline attachments: ${response.statusText}`);
    }
 
    const data = await response.json();
    return data;
  } catch (error) {
    log.error(`Failed to delete timeline attachments ${timelineId}:`, error);
    throw error;
  }
}
  

// ============================================================================
// Report Services (New)
// ============================================================================

/**
 * Create a lab report with test items
 */
export async function createLabReport(
  reportData: CreateLabReportRequest
): Promise<{ success: boolean; report_id: number }> {
  try {
    const response = await fetch(API_ENDPOINTS.patient.reports.lab.create, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reportData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create lab report: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to create lab report:", error);
    throw error;
  }
}

/**
 * Get all lab reports for a timeline
 */
export async function getLabReportsByTimeline(
  timelineId: number
): Promise<LabReport[]> {
  try {
    const response = await fetch(
      API_ENDPOINTS.patient.reports.lab.byTimeline(timelineId),
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    // If no reports found (404), return empty array instead of throwing error
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to get lab reports: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    // If error is not a network error and status is 404, return empty array
    if (error instanceof Error && error.message.includes('404')) {
      return [];
    }
    log.error(`Failed to get lab reports for timeline ${timelineId}:`, error);
    throw error;
  }
}

/**
 * Delete a lab report
 */
export async function deleteLabReport(
  reportId: number
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(API_ENDPOINTS.patient.reports.lab.delete(reportId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete lab report: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error(`Failed to delete lab report ${reportId}:`, error);
    throw error;
  }
}

/**
 * Create an imaging report
 */
export async function createImagingReport(
  reportData: CreateImagingReportRequest
): Promise<{ success: boolean; report_id: number }> {
  try {
    const response = await fetch(API_ENDPOINTS.patient.reports.imaging.create, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reportData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create imaging report: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to create imaging report:", error);
    throw error;
  }
}

/**
 * Get all imaging reports for a timeline
 */
export async function getImagingReportsByTimeline(
  timelineId: number
): Promise<ImagingReport[]> {
  try {
    const response = await fetch(
      API_ENDPOINTS.patient.reports.imaging.byTimeline(timelineId),
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    // If no reports found (404), return empty array instead of throwing error
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to get imaging reports: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    // If error is not a network error and status is 404, return empty array
    if (error instanceof Error && error.message.includes('404')) {
      return [];
    }
    log.error(`Failed to get imaging reports for timeline ${timelineId}:`, error);
    throw error;
  }
}

/**
 * Delete an imaging report
 */
export async function deleteImagingReport(
  reportId: number
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(API_ENDPOINTS.patient.reports.imaging.delete(reportId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete imaging report: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.error(`Failed to delete imaging report ${reportId}:`, error);
    throw error;
  }
}

// ============================================================================
// Export all services
/**
 * Check if patient with given name already exists (duplicate detection)
 */
async function checkDuplicatePatient(
  name: string,
  exactMatch: boolean = false
): Promise<{ found: boolean; count: number; patients: any[]; search_name: string; exact_match: boolean }> {
  try {
    const url = new URL(API_ENDPOINTS.patient.checkDuplicate, window.location.origin);
    url.searchParams.append("name", name);
    url.searchParams.append("exact_match", String(exactMatch));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to check duplicate patient: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    log.error("Failed to check duplicate patient:", error);
    throw error;
  }
}

// ============================================================================

const patientService = {
  // Patient
  createPatient,
  checkDuplicatePatient,
  getPatient,
  getPatientByEmail,
  listPatients,
  updatePatient,
  deletePatient,

  // Timeline
  createTimelineStage,
  getPatientTimeline,
  getTimelineDetail,
  saveTimelineDetail,
  deleteTimeline,

  // Medical Images
  createMedicalImage,
  deleteTimelineImages,
  // Metrics
  batchCreateMetrics,
  deleteTimelineMetrics,
  // Attachments
  createTimelineAttachment,
  deleteTimelineAttachments,
  // Todos
  createPatientTodo,
  getPatientTodos,
  updateTodoStatus,
  deletePatientTodo,

  // Reports 
  createLabReport,
  getLabReportsByTimeline,
  deleteLabReport,
  createImagingReport,
  getImagingReportsByTimeline,
  deleteImagingReport,
};

export default patientService;
