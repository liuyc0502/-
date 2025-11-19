/**
 * Patient Report Types
 *
 * Types for patient examination reports
 * Reports are derived from timeline data
 */

import type { MedicalImage, Metric, Attachment } from './patient';

// Key finding in report (subset of metric data)
export interface KeyFinding {
  indicator: string;
  value: string;
  status: 'normal' | 'slightly_high' | 'high' | 'low';
  trend: 'up' | 'down' | 'stable';
}

// Patient report summary (for list view)
export interface PatientReport {
  id: string;
  type: string;
  date: string;
  doctor: string;
  status: string;
  hasAI: boolean;
  keyFindings?: KeyFinding[];
}

// Detailed patient report (for detail view)
export interface ReportDetail extends PatientReport {
  diagnosis?: string;
  images?: MedicalImage[];
  metrics?: Metric[];
  attachments?: Attachment[];
  pathology_findings?: string;
  doctor_notes?: string;
  aiSummary?: string;
  suggestions?: string[];
}
