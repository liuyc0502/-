import { API_ENDPOINTS } from "./api";
import { getAuthHeaders } from "@/lib/auth";
import log from "@/lib/logger";

export interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  type: "text" | "select" | "date" | "textarea";
  options?: string[];
}

export interface ChatTemplate {
  template_id: number;
  template_name: string;
  slash_command: string;
  prompt_template: string;
  fields: FieldDefinition[];
  sort_order: number;
  user_id: string;
  tenant_id: string;
  create_time?: string;
  update_time?: string;
}

export interface CreateTemplateRequest {
  template_name: string;
  slash_command: string;
  prompt_template: string;
  fields: FieldDefinition[];
  sort_order?: number;
}

export interface UpdateTemplateRequest {
  template_name?: string;
  slash_command?: string;
  prompt_template?: string;
  fields?: FieldDefinition[];
  sort_order?: number;
}

export async function listTemplates(): Promise<ChatTemplate[]> {
  try {
    const response = await fetch(API_ENDPOINTS.chatTemplate.list, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to list templates: ${response.statusText}`);
    const data = await response.json();
    return data.templates;
  } catch (error) {
    log.error("Failed to list templates:", error);
    throw error;
  }
}

export async function createTemplate(
  req: CreateTemplateRequest
): Promise<{ success: boolean; template_id: number }> {
  try {
    const response = await fetch(API_ENDPOINTS.chatTemplate.create, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!response.ok) throw new Error(`Failed to create template: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    log.error("Failed to create template:", error);
    throw error;
  }
}

export async function updateTemplate(
  id: number,
  req: UpdateTemplateRequest
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(API_ENDPOINTS.chatTemplate.update(id), {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!response.ok) throw new Error(`Failed to update template: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    log.error("Failed to update template:", error);
    throw error;
  }
}

export async function deleteTemplate(id: number): Promise<{ success: boolean }> {
  try {
    const response = await fetch(API_ENDPOINTS.chatTemplate.delete(id), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to delete template: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    log.error("Failed to delete template:", error);
    throw error;
  }
}
