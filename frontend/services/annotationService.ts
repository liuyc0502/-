/**
 * API service for medical image annotation operations
 */
import { API_ENDPOINTS, fetchWithErrorHandling } from './api';
import type {
  Annotation,
  CreateAnnotationRequest,
  AnalyzeRegionRequest,
} from '@/types/annotation';

export const annotationService = {
  /**
   * Create a new annotation on a medical image
   */
  async createAnnotation(data: CreateAnnotationRequest): Promise<{
    success: boolean;
    annotation_id: number;
    message: string;
  }> {
    const response = await fetchWithErrorHandling(API_ENDPOINTS.annotation.create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Get all annotations for an image
   */
  async getAnnotations(imageId: number): Promise<Annotation[]> {
    const response = await fetchWithErrorHandling(API_ENDPOINTS.annotation.list(imageId));
    const data = await response.json();
    return data.annotations || [];
  },

  /**
   * Update annotation label or color
   */
  async updateAnnotation(
    annotationId: number,
    updates: {
      annotation_label?: string;
      annotation_color?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetchWithErrorHandling(
      API_ENDPOINTS.annotation.update(annotationId),
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }
    );
    return response.json();
  },

  /**
   * Delete an annotation
   */
  async deleteAnnotation(annotationId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetchWithErrorHandling(
      API_ENDPOINTS.annotation.delete(annotationId),
      { method: 'DELETE' }
    );
    return response.json();
  },

  /**
   * Analyze an annotated region using AI
   */
  async analyzeRegion(data: AnalyzeRegionRequest): Promise<{
    success: boolean;
    analysis_id: number;
    annotation_id: number;
    region_name: string;
    question: string;
    analysis: string;
  }> {
    const response = await fetchWithErrorHandling(API_ENDPOINTS.annotation.analyzeRegion, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Parse patient document with OCR
   */
  async parsePatientDocument(imageUrl: string): Promise<{
    success: boolean;
    ocr_text: string;
    parsed_data: Record<string, any>;
    message: string;
  }> {
    const response = await fetchWithErrorHandling(API_ENDPOINTS.annotation.parsePatient, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl }),
    });
    return response.json();
  },

  /**
   * Parse case document with OCR
   */
  async parseCaseDocument(imageUrl: string): Promise<{
    success: boolean;
    ocr_text: string;
    parsed_data: Record<string, any>;
    message: string;
  }> {
    const response = await fetchWithErrorHandling(API_ENDPOINTS.annotation.parseCase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl }),
    });
    return response.json();
  },
};
