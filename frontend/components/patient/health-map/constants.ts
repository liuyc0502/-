export const PATIENT_ACCENT = "#DA7756";
export const PATIENT_GREEN = "#6E977B";

/** @deprecated Use STAGE_TYPE_LABELS instead. Kept for backward compat with old cached data. */
export const FRIENDLY_TYPE_LABELS: Record<string, string> = {
  Disease: "诊断",
  Treatment: "治疗方案",
  ClinicalStage: "阶段",
  Biomarker: "检查指标",
  TestMethod: "检查项目",
  PathologicalFeature: "病理发现",
  Organ: "相关部位",
};

export const STAGE_TYPE_LABELS: Record<string, string> = {
  "初诊": "初次就诊",
  "检查": "检查",
  "确诊": "确诊",
  "治疗": "治疗",
  "随访": "随访复查",
};

export const STATUS_COLORS: Record<string, string> = {
  completed: PATIENT_GREEN,
  current: PATIENT_ACCENT,
  pending: "#9CA3AF",
};
