/**
 * OCR Service - Frontend API client for OCR operations
 */
import api from "./api";
import {
  DocumentType,
  TemplateType,
  ExtractedFields,
  DocumentTypeDetection,
  ExtractionResult,
} from "@/types/ocrTemplates";
import { Annotation } from "@/components/image-annotation/ImageAnnotator";

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
      const response = await api.get("/ocr/status");
      return response.data;
    } catch (error) {
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
    const response = await api.post("/ocr/image", {
      image_url: imageUrl,
      pipeline,
    });
    return response.data;
  }

  /**
   * Perform OCR on a PDF
   */
  async ocrPdf(
    pdfUrl: string,
    pages?: number[],
    pipeline: string = "PP-StructureV3"
  ): Promise<any> {
    const response = await api.post("/ocr/pdf", {
      pdf_url: pdfUrl,
      pages,
      pipeline,
    });
    return response.data;
  }

  /**
   * Detect document type from OCR text
   */
  async detectDocumentType(ocrText: string): Promise<DocumentTypeDetection> {
    const response = await api.post("/ocr/detect_type", {
      ocr_text: ocrText,
    });
    return response.data;
  }

  /**
   * Extract fields from OCR text using template
   */
  async extractFields(
    ocrText: string,
    templateType: TemplateType,
    annotations?: Annotation[]
  ): Promise<ExtractionResult> {
    const response = await api.post("/ocr/extract_fields", {
      ocr_text: ocrText,
      template_type: templateType,
      image_annotations: annotations,
    });
    return response.data;
  }

  /**
   * Save OCR result to case library
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

    // Map extracted fields to case creation request
    const request: SaveToCaseLibraryRequest = {
      case_title: (fields.case_title as string) || "OCR 导入病例",
      diagnosis: (fields.diagnosis as string) || "",
      disease_type: fields.disease_type as string,
      chief_complaint: fields.chief_complaint as string,
      age: fields.age as number,
      gender: fields.gender as string,
      category: templateType,
      images: [
        {
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          image_type: getImageTypeFromTemplate(templateType),
          image_description: (fields.imaging_findings as string) || (fields.pathology_findings as string),
          annotations_data: annotations,
          ocr_text: ocrText,
        },
      ],
      detail: {
        present_illness_history: fields.present_illness as string,
        past_medical_history: fields.past_history as string,
        diagnosis_basis: fields.pathology_findings as string || fields.imaging_findings as string,
        treatment_plan: fields.treatment_plan as string,
        clinical_notes: fields.clinical_notes as string,
      },
    };

    const response = await api.post("/medical_case/create", request);
    return response.data;
  }

  /**
   * Save OCR result to patient archive
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

    const request: SaveToPatientArchiveRequest = {
      patient_id: patientId,
      patient_name: fields.patient_name as string,
      gender: fields.gender as string,
      age: fields.age as number,
      diagnosis: (fields.preliminary_diagnosis as string) || (fields.discharge_diagnosis as string),
      timeline: {
        stage: stageMap[templateType] || "检查",
        stage_title: (fields.stage_title as string) || TEMPLATE_FIELDS_NAMES[templateType],
        stage_date: fields.record_date as string || fields.admission_date as string || new Date().toISOString().split("T")[0],
        diagnosis: (fields.preliminary_diagnosis as string) || (fields.discharge_diagnosis as string),
        detail: {
          doctor_notes: fields.doctor_notes as string,
          pathology_findings: fields.findings as string,
          patient_summary: fields.patient_condition as string,
        },
        images: [
          {
            image_url: imageUrl,
            thumbnail_url: thumbnailUrl,
            image_type: getImageTypeFromTemplate(templateType),
            image_label: (fields.stage_title as string) || templateType,
            annotations_data: annotations,
            ocr_text: ocrText,
          },
        ],
      },
    };

    const response = await api.post("/patient/create_or_update_with_timeline", request);
    return response.data;
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
