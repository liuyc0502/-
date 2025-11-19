// ============================================================================
// Care Plan Types
// ============================================================================

export interface CarePlan {
  plan_id: number;
  patient_id: number;
  plan_name: string;
  plan_description?: string;
  start_date?: string;
  end_date?: string;
  status: "active" | "completed" | "paused";
  doctor_id: string;
  tenant_id: string;
  create_time?: string;
  update_time?: string;
  created_by?: string;
  updated_by?: string;
  delete_flag?: string;
  // Enriched fields from backend
  medication_count?: number;
  task_count?: number;
  precaution_count?: number;
}

export interface CarePlanWithDetails extends CarePlan {
  medications: Medication[];
  tasks: Task[];
  precautions: Precaution[];
}

export interface Medication {
  medication_id: number;
  plan_id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  time_slots: string[];
  notes?: string;
  tenant_id?: string;
  create_time?: string;
  update_time?: string;
}

export interface Task {
  task_id: number;
  plan_id: number;
  task_title: string;
  task_description?: string;
  task_category: string;
  frequency?: string;
  duration?: string;
  tenant_id?: string;
  create_time?: string;
  update_time?: string;
}

export interface Precaution {
  precaution_id: number;
  plan_id: number;
  precaution_content: string;
  priority?: "high" | "medium" | "low";
  tenant_id?: string;
  create_time?: string;
  update_time?: string;
}

// Types with completion status for patient portal
export interface MedicationWithCompletion extends Medication {
  completed?: boolean;
}

export interface TaskWithCompletion extends Task {
  completed?: boolean;
}

// ============================================================================
// Request Types
// ============================================================================

export interface MedicationData {
  medication_name: string;
  dosage: string;
  frequency: string;
  time_slots: string[];
  notes?: string;
}

export interface TaskData {
  task_title: string;
  task_description?: string;
  task_category: string;
  frequency?: string;
  duration?: string;
}

export interface PrecautionData {
  precaution_content: string;
  priority?: "high" | "medium" | "low";
}

export interface CreateCarePlanRequest {
  patient_id: number;
  plan_name: string;
  plan_description?: string;
  start_date: string;
  end_date?: string;
  medications?: MedicationData[];
  tasks?: TaskData[];
  precautions?: PrecautionData[];
}

export interface UpdateCarePlanRequest {
  plan_name?: string;
  plan_description?: string;
  start_date?: string;
  end_date?: string;
  status?: "active" | "completed" | "paused";
}

export interface AddMedicationRequest {
  plan_id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  time_slots: string[];
  notes?: string;
}

export interface AddTaskRequest {
  plan_id: number;
  task_title: string;
  task_description?: string;
  task_category: string;
  frequency?: string;
  duration?: string;
}

export interface AddPrecautionRequest {
  plan_id: number;
  precaution_content: string;
  priority?: "high" | "medium" | "low";
}

export interface RecordCompletionRequest {
  plan_id: number;
  patient_id: number;
  record_date: string;
  item_type: "medication" | "task";
  item_id: number;
  completed: boolean;
  notes?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ApiSuccessResponse {
  success: boolean;
  message?: string;
}

export interface CreateCarePlanResponse extends ApiSuccessResponse {
  plan_id: number;
}

export interface CarePlanListResponse {
  plans: CarePlan[];
}

export interface TodayPlanResponse {
  plan_id: number;
  date: string;
  medications: MedicationWithCompletion[];
  tasks: TaskWithCompletion[];
  precautions: string[];
}

export interface DailyStats {
  date: string;
  total_items: number;
  completed_items: number;
  completion_rate: number;
  medication_total?: number;
  medication_completed?: number;
  task_total?: number;
  task_completed?: number;
}
 
export interface CompletionChart {
  date: string;
  completion_rate: number;
}
 
export interface WeeklyProgressResponse {
  overall_completion_rate: number;
  medication_compliance_rate: number;
  task_completion_rate: number;
  daily_stats: DailyStats[];
  completion_chart: CompletionChart[];
}
