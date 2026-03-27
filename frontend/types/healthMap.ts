/**
 * Patient Health Map types.
 * Built directly from patient timeline data, NOT from knowledge graph entities.
 */

export interface HealthMapEvent {
  event_id: string;
  date: string;
  stage_type: string; // 初诊/检查/确诊/治疗/随访
  title: string;
  diagnosis: string | null;
  status: "completed" | "current" | "pending";
  is_current: boolean;
  summary: string | null; // from patient_summary
  suggestions: string[];
  medications: { name: string; dosage?: string }[];
  metrics: {
    name: string;
    value: string;
    unit?: string;
    trend: string;
    status: string;
  }[];
  has_reports: boolean;
}

export interface HealthMapPrediction {
  description: string;
  likelihood: string; // "较大可能" / "有一定可能" / "可能性较小"
  timeframe: string;
  reasoning: string;
}

export interface HealthMapAlert {
  message: string;
  severity: "info" | "attention" | "important";
  action: string | null;
}

export interface PatientHealthMapData {
  card_type: "patient_health_map";
  patient_name: string | null;
  primary_diagnosis: string | null;
  current_stage: string | null;
  journey_progress: number;
  events: HealthMapEvent[];
  predictions: HealthMapPrediction[];
  alerts: HealthMapAlert[];
  overall_summary: string | null;
  generated_at: string;
  cache_id: string | null;
}
