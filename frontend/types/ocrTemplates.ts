/**
 * OCR Template Types and Definitions
 * Matches backend field_extraction_tools.py TEMPLATE_FIELDS
 */

export type DocumentType = "case" | "patient_record";

export type CaseTemplateType = "pathology_report" | "imaging_report" | "clinical_record";
export type PatientTemplateType = "admission_record" | "progress_note" | "discharge_summary" | "examination_report";
export type TemplateType = CaseTemplateType | PatientTemplateType;

export type FieldType = "text" | "textarea" | "number" | "date" | "select";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  description?: string;
}

export interface DocumentTemplate {
  name: string;
  documentType: DocumentType;
  fields: TemplateField[];
}

export interface ExtractedFields {
  [key: string]: string | number | null;
}

export interface ExtractionResult {
  templateType: TemplateType;
  templateName: string;
  documentType: DocumentType;
  fields: ExtractedFields;
  confidence: number;
  uncertainFields: string[];
  annotationContext?: AnnotationContext[];
  fieldDefinitions: TemplateField[];
}

export interface AnnotationContext {
  region: number | string;
  label: string;
  remark: string;
}

export interface DocumentTypeDetection {
  type: DocumentType;
  subtype: TemplateType;
  confidence: number;
  availableTemplates: { key: string; name: string }[];
  typeName: string;
  subtypeName: string;
}

// Template field definitions (matching backend)
export const TEMPLATE_FIELDS: Record<TemplateType, DocumentTemplate> = {
  // Case templates
  pathology_report: {
    name: "病理报告",
    documentType: "case",
    fields: [
      { key: "case_title", label: "病例标题", type: "text", required: true },
      { key: "diagnosis", label: "诊断结果", type: "textarea", required: true },
      { key: "disease_type", label: "疾病类型", type: "select",
        options: ["肿瘤", "炎症", "感染", "退行性病变", "先天性疾病", "其他"] },
      { key: "chief_complaint", label: "主诉", type: "textarea" },
      { key: "pathology_findings", label: "病理所见", type: "textarea" },
      { key: "gross_description", label: "大体描述", type: "textarea" },
      { key: "microscopic_description", label: "镜下描述", type: "textarea" },
      { key: "immunohistochemistry", label: "免疫组化结果", type: "textarea" },
      { key: "molecular_pathology", label: "分子病理", type: "textarea" },
      { key: "clinical_notes", label: "临床备注", type: "textarea" },
      { key: "age", label: "患者年龄", type: "number" },
      { key: "gender", label: "性别", type: "select", options: ["男", "女"] },
    ],
  },
  imaging_report: {
    name: "影像报告",
    documentType: "case",
    fields: [
      { key: "case_title", label: "病例标题", type: "text", required: true },
      { key: "imaging_type", label: "检查类型", type: "select",
        options: ["CT", "MRI", "X光", "超声", "PET-CT", "其他"] },
      { key: "examination_part", label: "检查部位", type: "text" },
      { key: "imaging_findings", label: "影像所见", type: "textarea", required: true },
      { key: "diagnosis", label: "诊断意见", type: "textarea", required: true },
      { key: "disease_type", label: "疾病类型", type: "select",
        options: ["肿瘤", "炎症", "感染", "外伤", "退行性病变", "其他"] },
      { key: "measurement", label: "测量数据", type: "textarea" },
      { key: "comparison", label: "对比意见", type: "textarea" },
      { key: "age", label: "患者年龄", type: "number" },
      { key: "gender", label: "性别", type: "select", options: ["男", "女"] },
    ],
  },
  clinical_record: {
    name: "临床记录",
    documentType: "case",
    fields: [
      { key: "case_title", label: "病例标题", type: "text", required: true },
      { key: "diagnosis", label: "诊断", type: "textarea", required: true },
      { key: "disease_type", label: "疾病类型", type: "select",
        options: ["肿瘤", "心血管", "呼吸系统", "消化系统", "神经系统", "内分泌", "其他"] },
      { key: "chief_complaint", label: "主诉", type: "textarea" },
      { key: "present_illness", label: "现病史", type: "textarea" },
      { key: "physical_examination", label: "体格检查", type: "textarea" },
      { key: "auxiliary_examination", label: "辅助检查", type: "textarea" },
      { key: "treatment_plan", label: "治疗方案", type: "textarea" },
      { key: "age", label: "患者年龄", type: "number" },
      { key: "gender", label: "性别", type: "select", options: ["男", "女"] },
    ],
  },
  // Patient record templates
  admission_record: {
    name: "入院记录",
    documentType: "patient_record",
    fields: [
      { key: "patient_name", label: "患者姓名", type: "text", required: true },
      { key: "gender", label: "性别", type: "select", options: ["男", "女"] },
      { key: "age", label: "年龄", type: "number" },
      { key: "admission_date", label: "入院日期", type: "date" },
      { key: "chief_complaint", label: "主诉", type: "textarea", required: true },
      { key: "present_illness", label: "现病史", type: "textarea" },
      { key: "past_history", label: "既往史", type: "textarea" },
      { key: "family_history", label: "家族史", type: "textarea" },
      { key: "allergy_history", label: "过敏史", type: "textarea" },
      { key: "physical_examination", label: "体格检查", type: "textarea" },
      { key: "preliminary_diagnosis", label: "初步诊断", type: "textarea", required: true },
      { key: "treatment_plan", label: "诊疗计划", type: "textarea" },
    ],
  },
  progress_note: {
    name: "病程记录",
    documentType: "patient_record",
    fields: [
      { key: "record_date", label: "记录日期", type: "date", required: true },
      { key: "stage_title", label: "阶段标题", type: "text" },
      { key: "patient_condition", label: "患者情况", type: "textarea" },
      { key: "doctor_notes", label: "医生记录", type: "textarea", required: true },
      { key: "examination_results", label: "检查结果", type: "textarea" },
      { key: "treatment_response", label: "治疗反应", type: "textarea" },
      { key: "treatment_plan", label: "治疗方案", type: "textarea" },
      { key: "medications", label: "用药情况", type: "textarea" },
      { key: "next_steps", label: "下一步计划", type: "textarea" },
    ],
  },
  discharge_summary: {
    name: "出院小结",
    documentType: "patient_record",
    fields: [
      { key: "patient_name", label: "患者姓名", type: "text" },
      { key: "admission_date", label: "入院日期", type: "date" },
      { key: "discharge_date", label: "出院日期", type: "date" },
      { key: "admission_diagnosis", label: "入院诊断", type: "textarea" },
      { key: "discharge_diagnosis", label: "出院诊断", type: "textarea", required: true },
      { key: "treatment_summary", label: "治疗经过", type: "textarea" },
      { key: "discharge_condition", label: "出院情况", type: "textarea" },
      { key: "discharge_instructions", label: "出院医嘱", type: "textarea" },
      { key: "followup_plan", label: "随访计划", type: "textarea" },
      { key: "medications", label: "出院带药", type: "textarea" },
    ],
  },
  examination_report: {
    name: "检查报告",
    documentType: "patient_record",
    fields: [
      { key: "examination_type", label: "检查类型", type: "select",
        options: ["血常规", "生化", "凝血", "肿瘤标志物", "心电图", "其他"] },
      { key: "examination_date", label: "检查日期", type: "date" },
      { key: "findings", label: "检查结果", type: "textarea", required: true },
      { key: "abnormal_items", label: "异常项目", type: "textarea" },
      { key: "clinical_significance", label: "临床意义", type: "textarea" },
      { key: "recommendations", label: "建议", type: "textarea" },
    ],
  },
};

// Helper functions
export function getTemplatesByDocumentType(docType: DocumentType): { key: TemplateType; name: string }[] {
  return Object.entries(TEMPLATE_FIELDS)
    .filter(([_, template]) => template.documentType === docType)
    .map(([key, template]) => ({ key: key as TemplateType, name: template.name }));
}

export function getTemplateFields(templateType: TemplateType): TemplateField[] {
  return TEMPLATE_FIELDS[templateType]?.fields || [];
}

export function getRequiredFields(templateType: TemplateType): string[] {
  return getTemplateFields(templateType)
    .filter(f => f.required)
    .map(f => f.key);
}

export function validateExtractedFields(
  templateType: TemplateType,
  fields: ExtractedFields
): { valid: boolean; missingRequired: string[] } {
  const required = getRequiredFields(templateType);
  const missingRequired = required.filter(key => !fields[key]);
  return {
    valid: missingRequired.length === 0,
    missingRequired,
  };
}

// Document type display names
export const DOCUMENT_TYPE_NAMES: Record<DocumentType, string> = {
  case: "病例",
  patient_record: "患者病历",
};

// Get all case templates
export const CASE_TEMPLATES = getTemplatesByDocumentType("case");

// Get all patient record templates
export const PATIENT_TEMPLATES = getTemplatesByDocumentType("patient_record");
