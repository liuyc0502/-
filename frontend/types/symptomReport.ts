// Body part type
export type BodyPart =
  | "head_neck"
  | "chest"
  | "abdomen"
  | "back"
  | "limbs"
  | "skin"
  | "whole_body"
  | "other";

// Symptom form submission data
export interface SymptomFormData {
  body_parts: BodyPart[];
  symptom_tags: string[];
  duration: string; // "today" | "days" | "1-2weeks" | "weeks" | "month+"
  severity: number; // 1-10
  description?: string;
}

// Body part → common symptoms mapping
export const BODY_PART_SYMPTOMS: Record<BodyPart, string[]> = {
  head_neck: ["头痛", "头晕", "视力模糊", "耳鸣", "咽痛", "颈部疼痛", "鼻塞"],
  chest: ["胸痛", "胸闷", "心悸", "气短", "咳嗽", "咯血"],
  abdomen: ["腹痛", "腹胀", "恶心", "呕吐", "反酸", "腹泻", "便秘", "食欲下降"],
  back: ["腰痛", "背痛", "活动受限", "晨僵"],
  limbs: ["关节痛", "肿胀", "麻木", "无力", "活动受限"],
  skin: ["皮疹", "瘙痒", "红肿", "溃疡", "色素变化"],
  whole_body: ["发热", "乏力", "体重变化", "盗汗", "失眠"],
  other: [],
};

// Symptom summary card data (SSE payload)
export interface SymptomSummaryData {
  card_type: "symptom_summary";
  patient_name: string;
  report_date: string;
  chief_complaint: string;
  symptoms: SymptomItem[];
  additional_info: {
    triggers?: string[];
    relieving_factors?: string[];
    medical_history?: string[];
    current_medications?: string[];
    allergies?: string[];
  };
}

export interface SymptomItem {
  id: string;
  label: string;
  body_part: string;
  description: string;
  duration: string;
  frequency?: string;
  severity: number; // 1-10
}

// Triage recommendation card data (SSE payload)
export interface TriageRecommendationData {
  card_type: "triage_recommendation";
  severity: "green" | "yellow" | "red";
  urgency: "emergency" | "urgent" | "scheduled" | "observation";
  urgency_label: string;
  recommended_departments: DepartmentRecommendation[];
  preparation_tips: string[];
  warning_signs: string[];
  disclaimer: string;
}

export interface DepartmentRecommendation {
  department: string;
  reason: string;
  priority: number;
}
