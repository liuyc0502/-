/**
 * OCR Service - Frontend API client for OCR operations
 */
import { API_ENDPOINTS, ApiError } from "./api";
import { getAuthHeaders, fetchWithAuth } from "@/lib/auth";
import {
  DocumentType,
  TemplateType,
  ExtractedFields,
  DocumentTypeDetection,
  ExtractionResult,
} from "@/types/ocrTemplates";
import { Annotation } from "@/components/image-annotation/ImageAnnotator";

// @ts-ignore
const fetch = fetchWithAuth;

// API response types
interface OcrImageResponse {
  text: string;
  blocks: any[];
  tables: any[];
  confidence: number;
  pipeline: string;
  image_url: string;
}

interface OcrServiceStatus {
  available: boolean;
  url: string;
  tools: string[];
  message: string;
}

interface SaveToCaseLibraryRequest {
  case_title: string;
  diagnosis: string;
  disease_type?: string;
  chief_complaint?: string;
  age?: number;
  gender?: string;
  category?: string;
  tags?: string[];
  images?: {
    image_url: string;
    thumbnail_url?: string;
    image_type?: string;
    image_description?: string;
    annotations_data?: Annotation[];
    ocr_text?: string;
  }[];
  detail?: {
    present_illness_history?: string;
    past_medical_history?: string;
    physical_examination?: any;
    imaging_results?: any;
    diagnosis_basis?: string;
    treatment_plan?: string;
    clinical_notes?: string;
  };
}

interface SaveToPatientArchiveRequest {
  patient_id?: number;
  patient_name?: string;
  gender?: string;
  age?: number;
  diagnosis?: string;
  timeline?: {
    stage: string;
    stage_title: string;
    stage_date?: string;
    diagnosis?: string;
    detail?: {
      doctor_notes?: string;
      pathology_findings?: string;
      medications?: any;
      patient_summary?: string;
    };
    images?: {
      image_url: string;
      thumbnail_url?: string;
      image_type?: string;
      image_label?: string;
      annotations_data?: Annotation[];
      ocr_text?: string;
    }[];
  };
}

/**
 * OCR Service class for handling OCR operations
 */
class OcrService {
  /**
   * Check OCR service availability
   */
  async checkServiceStatus(): Promise<OcrServiceStatus> {
    try {
      const response = await fetch(`${API_ENDPOINTS.ocr}/status`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to check OCR service status");
      }

      const data = await response.json();
      return data.code === 0 ? data.data : data;
    } catch (error) {
      console.error("Error checking OCR status:", error);
      return {
        available: false,
        url: "",
        tools: [],
        message: "Service unavailable",
      };
    }
  }

  /**
   * Perform OCR on an image
   */
  async ocrImage(
    imageUrl: string,
    pipeline: "OCR" | "PP-StructureV3" = "OCR"
  ): Promise<OcrImageResponse> {
    const response = await fetch(`${API_ENDPOINTS.ocr}/image`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        image_url: imageUrl,
        pipeline,
      }),
    });

    if (!response.ok) {
      throw new ApiError(response.status, "Failed to perform OCR on image");
    }

    const data = await response.json();
    if (data.code === 0) {
      return data.data;
    }
    throw new ApiError(data.code, data.message || "OCR failed");
  }

  /**
   * Perform OCR on a PDF
   */
  async ocrPdf(
    pdfUrl: string,
    pages?: number[],
    pipeline: string = "PP-StructureV3"
  ): Promise<any> {
    const response = await fetch(`${API_ENDPOINTS.ocr}/pdf`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        pdf_url: pdfUrl,
        pages,
        pipeline,
      }),
    });

    if (!response.ok) {
      throw new ApiError(response.status, "Failed to perform OCR on PDF");
    }

    const data = await response.json();
    if (data.code === 0) {
      return data.data;
    }
    throw new ApiError(data.code, data.message || "PDF OCR failed");
  }

  /**
   * Detect document type from OCR text
   */
  async detectDocumentType(ocrText: string): Promise<DocumentTypeDetection> {
    const response = await fetch(`${API_ENDPOINTS.ocr}/detect_type`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ocr_text: ocrText,
      }),
    });

    if (!response.ok) {
      throw new ApiError(response.status, "Failed to detect document type");
    }

    const data = await response.json();
    if (data.code === 0) {
      return data.data;
    }
    throw new ApiError(data.code, data.message || "Type detection failed");
  }

  /**
   * Extract fields from OCR text using template
   */
  async extractFields(
    ocrText: string,
    templateType: TemplateType,
    annotations?: Annotation[]
  ): Promise<ExtractionResult> {
    const response = await fetch(`${API_ENDPOINTS.ocr}/extract_fields`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ocr_text: ocrText,
        template_type: templateType,
        image_annotations: annotations,
      }),
    });

    if (!response.ok) {
      throw new ApiError(response.status, "Failed to extract fields");
    }

    const data = await response.json();
    if (data.code === 0) {
      return data.data;
    }
    throw new ApiError(data.code, data.message || "Field extraction failed");
  }

  /**
   * Save OCR result to case library
   * NOTE: This is a simplified version. Full implementation should:
   * 1. Create case via POST /medical_case/create
   * 2. Create case detail via POST /medical_case/detail/create
   * 3. Add images via POST /medical_case/{case_id}/images
   */
  async saveToCaseLibrary(data: {
    fields: ExtractedFields;
    templateType: TemplateType;
    imageUrl: string;
    thumbnailUrl?: string;
    annotations?: Annotation[];
    ocrText?: string;
  }): Promise<{ case_id: number; case_no: string }> {
    const { fields, templateType, imageUrl, thumbnailUrl, annotations, ocrText } = data;

    // Step 1: Create basic case
    const caseRequest = {
      case_no: `#${Date.now()}`, // Generate temporary case number
      case_title: (fields.case_title as string) || "OCR 导入病例",
      diagnosis: (fields.diagnosis as string) || "待补充",
      disease_type: (fields.disease_type as string) || "其他",
      age: (fields.age as number) || 0,
      gender: (fields.gender as string) || "未知",
      chief_complaint: fields.chief_complaint as string,
      category: templateType,
      tags: [],
    };

    const caseResponse = await fetch(`${API_ENDPOINTS.medicalCase.create}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(caseRequest),
    });

    if (!caseResponse.ok) {
      throw new ApiError(caseResponse.status, "Failed to create case");
    }

    const caseData = await caseResponse.json();
    if (caseData.code !== 0) {
      throw new ApiError(caseData.code, caseData.message || "Failed to create case");
    }

    const caseId = caseData.data.case_id;
    const caseNo = caseData.data.case_no;

    // Step 2: Create case detail
    try {
      const detailRequest = {
        case_id: caseId,
        present_illness_history: fields.present_illness as string,
        past_medical_history: fields.past_history as string,
        diagnosis_basis: (fields.pathology_findings as string) || (fields.imaging_findings as string),
        treatment_plan: fields.treatment_plan as string,
        clinical_notes: fields.clinical_notes as string,
      };

      await fetch(`${API_ENDPOINTS.medicalCase.detailCreate}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(detailRequest),
      });
    } catch (error) {
      console.error("Failed to create case detail:", error);
    }

    // Step 3: Add images
    try {
      const imageRequest = {
        case_id: caseId,
        images: [
          {
            image_url: imageUrl,
            thumbnail_url: thumbnailUrl,
            image_type: getImageTypeFromTemplate(templateType),
            image_description: (fields.imaging_findings as string) || (fields.pathology_findings as string),
            display_order: 0,
          },
        ],
      };

      await fetch(API_ENDPOINTS.medicalCase.images.add(caseId), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(imageRequest),
      });
    } catch (error) {
      console.error("Failed to add case images:", error);
    }

    return { case_id: caseId, case_no: caseNo };
  }

  /**
   * Save OCR result to patient archive
   * NOTE: This is a simplified version. Full implementation should:
   * 1. Create or update patient via POST /patient/create
   * 2. Create timeline via POST /patient/timeline/create
   * 3. Create timeline detail via POST /patient/timeline/detail/save
   * 4. Add images via POST /patient/timeline/image/create
   */
  async saveToPatientArchive(data: {
    fields: ExtractedFields;
    templateType: TemplateType;
    imageUrl: string;
    thumbnailUrl?: string;
    annotations?: Annotation[];
    ocrText?: string;
    patientId?: number;
  }): Promise<{ patient_id: number; timeline_id?: number }> {
    const { fields, templateType, imageUrl, thumbnailUrl, annotations, ocrText, patientId } = data;

    // Determine stage from template type
    const stageMap: Record<string, string> = {
      admission_record: "初诊",
      progress_note: "治疗",
      discharge_summary: "随访",
      examination_report: "检查",
    };

    let actualPatientId = patientId;

    // Step 1: Create patient if not exists
    if (!actualPatientId) {
      const patientRequest = {
        name: (fields.patient_name as string) || "OCR 导入患者",
        gender: (fields.gender as string) || "未知",
        age: (fields.age as number) || 0,
        medical_record_no: `MR${Date.now()}`, // Generate temporary medical record number
        email: `temp_${Date.now()}@example.com`, // Temporary email
        allergies: [],
        past_medical_history: fields.past_history ? [fields.past_history as string] : [],
      };

      const patientResponse = await fetch(`${API_ENDPOINTS.patient.create}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(patientRequest),
      });

      if (!patientResponse.ok) {
        throw new ApiError(patientResponse.status, "Failed to create patient");
      }

      const patientData = await patientResponse.json();
      if (patientData.code !== 0) {
        throw new ApiError(patientData.code, patientData.message || "Failed to create patient");
      }

      actualPatientId = patientData.data.patient_id;
    }

    // Step 2: Create timeline
    const timelineRequest = {
      patient_id: actualPatientId,
      stage_type: stageMap[templateType] || "检查",
      stage_date: (fields.record_date as string) || (fields.admission_date as string) || new Date().toISOString().split("T")[0],
      stage_title: (fields.stage_title as string) || TEMPLATE_FIELDS_NAMES[templateType],
      diagnosis: (fields.preliminary_diagnosis as string) || (fields.discharge_diagnosis as string),
      status: "completed",
      display_order: 0,
    };

    const timelineResponse = await fetch(`${API_ENDPOINTS.patient.timeline.create}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(timelineRequest),
    });

    if (!timelineResponse.ok) {
      throw new ApiError(timelineResponse.status, "Failed to create timeline");
    }

    const timelineData = await timelineResponse.json();
    if (timelineData.code !== 0) {
      throw new ApiError(timelineData.code, timelineData.message || "Failed to create timeline");
    }

    const timelineId = timelineData.data.timeline_id;

    // Step 3: Create timeline detail
    try {
      const detailRequest = {
        timeline_id: timelineId,
        doctor_notes: fields.doctor_notes as string,
        pathology_findings: fields.findings as string,
        patient_summary: fields.patient_condition as string,
        medications: [],
        patient_suggestions: [],
      };

      await fetch(`${API_ENDPOINTS.patient.timeline.createDetail}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(detailRequest),
      });
    } catch (error) {
      console.error("Failed to create timeline detail:", error);
    }

    // Step 4: Add images
    try {
      const imageRequest = {
        timeline_id: timelineId,
        image_type: getImageTypeFromTemplate(templateType),
        image_label: (fields.stage_title as string) || templateType,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        display_order: 0,
      };

      await fetch(`${API_ENDPOINTS.patient.image.create}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(imageRequest),
      });
    } catch (error) {
      console.error("Failed to add patient images:", error);
    }

    return { patient_id: actualPatientId, timeline_id: timelineId };
  }
}

// Helper: Template name mapping
const TEMPLATE_FIELDS_NAMES: Record<string, string> = {
  pathology_report: "病理报告",
  imaging_report: "影像报告",
  clinical_record: "临床记录",
  admission_record: "入院记录",
  progress_note: "病程记录",
  discharge_summary: "出院小结",
  examination_report: "检查报告",
};

// Helper: Get image type from template
function getImageTypeFromTemplate(templateType: TemplateType): string {
  const typeMap: Record<string, string> = {
    pathology_report: "病理切片",
    imaging_report: "影像检查",
    clinical_record: "临床照片",
    admission_record: "入院资料",
    progress_note: "病程资料",
    discharge_summary: "出院资料",
    examination_report: "检查报告",
  };
  return typeMap[templateType] || "其他";
}

// Export singleton instance
export const ocrService = new OcrService();
export default ocrService;
