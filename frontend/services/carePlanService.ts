import { API_ENDPOINTS } from "./api";
import { getAuthHeaders } from "@/lib/auth";
import log from "@/lib/logger";
import type {
  CarePlan,
  CarePlanWithDetails,
  CreateCarePlanRequest,
  UpdateCarePlanRequest,
  AddMedicationRequest,
  AddTaskRequest,
  AddPrecautionRequest,
  RecordCompletionRequest,
  CreateCarePlanResponse,
  ApiSuccessResponse,
  CarePlanListResponse,
  TodayPlanResponse,
  WeeklyProgressResponse,
} from "@/types/carePlan";
// ============================================================================
// Care Plan Services
// ============================================================================
/**
 * Create a new care plan
 */
export async function createCarePlan(
  planData: CreateCarePlanRequest
): Promise<CreateCarePlanResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.carePlan.create, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(planData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create care plan: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to create care plan:", error);
    throw error;
  }
}
/**
 * Get care plan by ID with all details
 */
export async function getCarePlan(planId: number): Promise<CarePlanWithDetails> {
  try {
    const response = await fetch(API_ENDPOINTS.carePlan.detail(planId), {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to get care plan: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to get care plan:", error);
    throw error;
  }
}
/**
 * List care plans for a patient
 */
export async function listCarePlans(
  patientId: number,
  status?: string
): Promise<CarePlan[]> {
  try {
    const url = new URL(API_ENDPOINTS.carePlan.list(patientId), window.location.origin);
    if (status) {
      url.searchParams.append("status", status);
    }
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to list care plans: ${response.statusText}`);
    }
    const data: CarePlanListResponse = await response.json();
    return data.plans;
  } catch (error) {
    log.error("Failed to list care plans:", error);
    throw error;
  }
}
/**
 * Update care plan
 */
export async function updateCarePlan(
  planId: number,
  planData: UpdateCarePlanRequest
): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.carePlan.update(planId), {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(planData),
    });
    if (!response.ok) {
      throw new Error(`Failed to update care plan: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to update care plan:", error);
    throw error;
  }
}
/**
 * Delete care plan
 */
export async function deleteCarePlan(planId: number): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.carePlan.delete(planId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete care plan: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to delete care plan:", error);
    throw error;
  }
}
// ============================================================================
// Medication Services
// ============================================================================
/**
 * Add medication to a care plan
 */
export async function addMedication(
  medicationData: AddMedicationRequest
): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.carePlan.medication.add, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(medicationData),
    });
    if (!response.ok) {
      throw new Error(`Failed to add medication: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to add medication:", error);
    throw error;
  }
}
/**
 * Delete medication
 */
export async function deleteMedication(medicationId: number): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.carePlan.medication.delete(medicationId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete medication: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to delete medication:", error);
    throw error;
  }
}
// ============================================================================
// Task Services
// ============================================================================
/**
 * Add task to a care plan
 */
export async function addTask(taskData: AddTaskRequest): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.carePlan.task.add, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskData),
    });
    if (!response.ok) {
      throw new Error(`Failed to add task: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to add task:", error);
    throw error;
  }
}
/**
 * Delete task
 */
export async function deleteTask(taskId: number): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.carePlan.task.delete(taskId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete task: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to delete task:", error);
    throw error;
  }
}
// ============================================================================
// Precaution Services
// ============================================================================
/**
 * Add precaution to a care plan
 */
export async function addPrecaution(
  precautionData: AddPrecautionRequest
): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.carePlan.precaution.add, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(precautionData),
    });
    if (!response.ok) {
      throw new Error(`Failed to add precaution: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to add precaution:", error);
    throw error;
  }
}
/**
 * Delete precaution
 */
export async function deletePrecaution(precautionId: number): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.carePlan.precaution.delete(precautionId), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete precaution: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to delete precaution:", error);
    throw error;
  }
}
// ============================================================================
// Completion Services (for Patient Portal)
// ============================================================================
/**
 * Record completion status for a medication or task
 */
export async function recordCompletion(
  completionData: RecordCompletionRequest
): Promise<ApiSuccessResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.carePlan.completion.record, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(completionData),
    });
    if (!response.ok) {
      throw new Error(`Failed to record completion: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to record completion:", error);
    throw error;
  }
}
/**
 * Get today's care plan for a patient
 */
export async function getTodayPlan(
  patientId: number,
  recordDate?: string
): Promise<TodayPlanResponse> {
  try {
    const url = new URL(API_ENDPOINTS.carePlan.today(patientId), window.location.origin);
    if (recordDate) {
      url.searchParams.append("record_date", recordDate);
    }
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to get today's plan: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to get today's plan:", error);
    throw error;
  }
}
/**
 * Get weekly progress statistics
 */
export async function getWeeklyProgress(
  patientId: number,
  endDate?: string
): Promise<WeeklyProgressResponse> {
  try {
    const url = new URL(API_ENDPOINTS.carePlan.weeklyProgress(patientId), window.location.origin);
    if (endDate) {
      url.searchParams.append("end_date", endDate);
    }
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to get weekly progress: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log.error("Failed to get weekly progress:", error);
    throw error;
  }
}
// Export as default object for convenient importing
const carePlanService = {
  createCarePlan,
  getCarePlan,
  listCarePlans,
  updateCarePlan,
  deleteCarePlan,
  addMedication,
  deleteMedication,
  addTask,
  deleteTask,
  addPrecaution,
  deletePrecaution,
  recordCompletion,
  getTodayPlan,
  getWeeklyProgress,
};
export default carePlanService;