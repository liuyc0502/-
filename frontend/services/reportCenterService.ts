import { API_ENDPOINTS } from "./api";
import { getAuthHeaders } from "@/lib/auth";
import log from "@/lib/logger";
import type {
  ReportListItem,
  PatientReportInterpretation,
  MetricTrend,
} from "@/types/reportCenter";

async function getReportList(patientId: number): Promise<ReportListItem[]> {
  try {
    const response = await fetch(API_ENDPOINTS.reportCenter.list(patientId), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to get report list: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    log.error("Failed to get report list:", error);
    throw error;
  }
}

async function getInterpretation(
  patientId: number,
  reportId: string
): Promise<PatientReportInterpretation> {
  try {
    const response = await fetch(
      API_ENDPOINTS.reportCenter.interpretation(patientId, reportId),
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      throw new Error(`Failed to get interpretation: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    log.error("Failed to get interpretation:", error);
    throw error;
  }
}

async function requestInterpretation(
  patientId: number,
  reportId: string
): Promise<PatientReportInterpretation> {
  try {
    const response = await fetch(
      API_ENDPOINTS.reportCenter.interpret(patientId, reportId),
      {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to interpret report: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    log.error("Failed to interpret report:", error);
    throw error;
  }
}

async function reinterpret(
  patientId: number,
  reportId: string
): Promise<PatientReportInterpretation> {
  try {
    const response = await fetch(
      API_ENDPOINTS.reportCenter.reinterpret(patientId, reportId),
      {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to reinterpret report: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    log.error("Failed to reinterpret report:", error);
    throw error;
  }
}

async function getMetricTrends(patientId: number): Promise<MetricTrend[]> {
  try {
    const response = await fetch(
      API_ENDPOINTS.reportCenter.trends(patientId),
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to get metric trends: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    log.error("Failed to get metric trends:", error);
    throw error;
  }
}

const reportCenterService = {
  getReportList,
  getInterpretation,
  requestInterpretation,
  reinterpret,
  getMetricTrends,
};

export default reportCenterService;
