import { API_ENDPOINTS } from "./api";
import { getAuthHeaders } from "@/lib/auth";
import log from "@/lib/logger";

/**
 * Portal Agent Assignment Service
 * Handles API calls for assigning agents to portals (doctor, student, patient)
 */

export type PortalType = "doctor" | "student" | "patient";

/**
 * Get list of agent IDs assigned to a portal
 * @param portalType Portal type (doctor, student, patient)
 * @returns List of agent IDs
 */
export const getPortalAgents = async (portalType: PortalType): Promise<number[]> => {
  try {
    const response = await fetch(API_ENDPOINTS.portalAgentAssignment.getAgents(portalType), {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get portal agents: ${response.status}`);
    }

    const data = await response.json();
    return data.agent_ids || [];
  } catch (error) {
    log.error("Error getting portal agents:", error);
    throw error;
  }
};

/**
 * Assign an agent to a portal
 * @param portalType Portal type (doctor, student, patient)
 * @param agentId Agent ID to assign
 */
export const assignAgentToPortal = async (
  portalType: PortalType,
  agentId: number
): Promise<void> => {
  try {
    const response = await fetch(API_ENDPOINTS.portalAgentAssignment.assign, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        portal_type: portalType,
        agent_id: agentId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to assign agent: ${response.status}`);
    }
  } catch (error) {
    log.error("Error assigning agent to portal:", error);
    throw error;
  }
};

/**
 * Remove an agent from a portal
 * @param portalType Portal type (doctor, student, patient)
 * @param agentId Agent ID to remove
 */
export const removeAgentFromPortal = async (
  portalType: PortalType,
  agentId: number
): Promise<void> => {
  try {
    const response = await fetch(API_ENDPOINTS.portalAgentAssignment.remove, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        portal_type: portalType,
        agent_id: agentId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to remove agent: ${response.status}`);
    }
  } catch (error) {
    log.error("Error removing agent from portal:", error);
    throw error;
  }
};

/**
 * Set complete list of agents for a portal (replaces existing)
 * @param portalType Portal type (doctor, student, patient)
 * @param agentIds List of agent IDs
 */
export const setPortalAgents = async (
  portalType: PortalType,
  agentIds: number[]
): Promise<void> => {
  try {
    const response = await fetch(API_ENDPOINTS.portalAgentAssignment.setAgents, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        portal_type: portalType,
        agent_ids: agentIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set portal agents: ${response.status}`);
    }
  } catch (error) {
    log.error("Error setting portal agents:", error);
    throw error;
  }
};

