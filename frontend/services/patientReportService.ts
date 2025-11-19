/**
 * Patient Report Service
 *
 * API service for patient examination reports
 */

import { API_ENDPOINTS, fetchWithErrorHandling } from './api';
import { getAuthHeaders } from '@/lib/auth';
import log from '@/lib/logger';
import type { PatientReport, ReportDetail } from '@/types/patientReport';

const patientReportService = {
  /**
   * Get all reports for a patient
   *
   * @param patientId - Patient ID
   * @returns List of report summaries
   */
  async getReportList(patientId: number): Promise<PatientReport[]> {
    try {
      const response = await fetchWithErrorHandling(
        API_ENDPOINTS.patient.reports.list(patientId),
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );
      const data = await response.json();
      return data.data;
    } catch (error) {
      log.error(`Failed to get report list for patient ${patientId}:`, error);
      throw error;
    }
  },

  /**
   * Get detailed report information
   *
   * @param timelineId - Timeline ID (serves as report ID)
   * @returns Detailed report data
   */
  async getReportDetail(timelineId: number): Promise<ReportDetail> {
    try {
      const response = await fetchWithErrorHandling(
        API_ENDPOINTS.patient.reports.detail(timelineId),
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );
      const data = await response.json();
      return data.data;
    } catch (error) {
      log.error(`Failed to get report detail for timeline ${timelineId}:`, error);
      throw error;
    }
  },
};

export default patientReportService;