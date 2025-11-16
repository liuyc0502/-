// Doctor portal knowledge base service

import { getAuthHeaders, fetchWithAuth } from "@/lib/auth";
import log from "@/lib/logger";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010/api";

// @ts-ignore
const fetch: typeof fetchWithAuth = fetchWithAuth;

export interface DoctorKnowledgeBase {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface DoctorKnowledgeFile {
  id: string;
  name: string;
  full_path: string;
  size: number;
  created_at: string;
}

export interface FileContent {
  content: string;
  content_type: string;
}

export interface KnowledgeCard {
  card_id: number;
  file_path: string;
  knowledge_id: number;
  card_title: string;
  card_summary: string;
  category: string;
  tags: string[];
  view_count: number;
  create_time: string;
  update_time: string;
}

export interface CardCreateParams {
  file_path: string;
  knowledge_id: number;
  card_title: string;
  card_summary?: string;
  category?: string;
  tags?: string[];
}

class DoctorKnowledgeService {
  /**
   * Get all knowledge bases for doctor portal
   */
  async getKnowledgeBases(): Promise<DoctorKnowledgeBase[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/doctor/knowledge/bases/list`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch knowledge bases: ${response.statusText}`);
      }

      const data = await response.json();
      return data.knowledge_bases || [];
    } catch (error) {
      log.error("Failed to get knowledge bases:", error);
      throw error;
    }
  }

  /**
   * Get files for a specific knowledge base
   */
  async getKnowledgeBaseFiles(kbId: number): Promise<DoctorKnowledgeFile[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/doctor/knowledge/bases/${kbId}/files`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch knowledge base files: ${response.statusText}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      log.error(`Failed to get files for knowledge base ${kbId}:`, error);
      throw error;
    }
  }

  /**
   * Get markdown file content
   */
  async getFileContent(filePath: string): Promise<FileContent> {
    try {
      const encodedPath = encodeURIComponent(filePath);
      const response = await fetch(
        `${API_BASE_URL}/doctor/knowledge/files/${encodedPath}/content`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      log.error(`Failed to get file content for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Save or update a knowledge file card
   */
  async saveCard(cardData: CardCreateParams): Promise<number> {
    try {
      const response = await fetch(`${API_BASE_URL}/doctor/knowledge/card/save`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cardData),
      });

      if (!response.ok) {
        throw new Error(`Failed to save card: ${response.statusText}`);
      }

      const data = await response.json();
      return data.card_id;
    } catch (error) {
      log.error("Failed to save card:", error);
      throw error;
    }
  }

  /**
   * Get card information for a file
   */
  async getCard(filePath: string): Promise<KnowledgeCard | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/doctor/knowledge/card/get?file_path=${encodeURIComponent(filePath)}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get card: ${response.statusText}`);
      }

      const data = await response.json();
      return data.card || null;
    } catch (error) {
      log.error(`Failed to get card for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get all cards, optionally filtered by category
   */
  async getAllCards(category?: string): Promise<KnowledgeCard[]> {
    try {
      const url = category
        ? `${API_BASE_URL}/doctor/knowledge/cards/list?category=${encodeURIComponent(category)}`
        : `${API_BASE_URL}/doctor/knowledge/cards/list`;

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get cards: ${response.statusText}`);
      }

      const data = await response.json();
      return data.cards || [];
    } catch (error) {
      log.error("Failed to get cards:", error);
      throw error;
    }
  }

  /**
   * Delete a card
   */
  async deleteCard(filePath: string): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/doctor/knowledge/card/delete?file_path=${encodeURIComponent(filePath)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete card: ${response.statusText}`);
      }
    } catch (error) {
      log.error(`Failed to delete card for ${filePath}:`, error);
      throw error;
    }
  }
}

export const doctorKnowledgeService = new DoctorKnowledgeService();
