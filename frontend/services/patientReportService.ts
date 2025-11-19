/**
 * Patient Report Service
 *
 * API service for patient examination reports
 */

import api from './api';
import type { PatientReport, ReportDetail } from '@/types/patientReport';

const patientReportService = {
  /**
   * Get all reports for a patient
   *
   * @param patientId - Patient ID
   * @returns List of report summaries
   */
  async getReportList(patientId: number): Promise<PatientReport[]> {
    const response = await api.get(`/patient/reports?patient_id=${patientId}`);
    return response.data.data;
  },

  /**
   * Get detailed report information
   *
   * @param timelineId - Timeline ID (serves as report ID)
   * @returns Detailed report data
   */
  async getReportDetail(timelineId: string): Promise<ReportDetail> {
    const response = await api.get(`/patient/reports/${timelineId}`);
    return response.data.data;
  },
};

export default patientReportService;
