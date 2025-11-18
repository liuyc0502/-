import { API_ENDPOINTS } from "./api";
import { getAuthHeaders } from "@/lib/auth";
import log from "@/lib/logger";

interface LearningRecord {
  record_id?: number;
  file_path: string;
  file_name: string;
  category?: string;
  view_count: number;
  total_time_spent: number; // in seconds
  last_viewed_at: string;
  first_viewed_at: string;
}

interface LearningStats {
  total_views_this_week: number;
  total_time_this_week: number; // in hours
  knowledge_mastery: number; // percentage
  recent_records: LearningRecord[];
  activity_heatmap: number[]; // 28 days of activity
}

class LearningRecordService {
  /**
   * Record a knowledge file view
   */
  async recordView(
    filePath: string,
    fileName: string,
    category?: string,
    timeSpentSeconds: number = 120
  ): Promise<void> {
    try {
      await fetch(API_ENDPOINTS.learningRecord.recordView, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_path: filePath,
          file_name: fileName,
          category,
          time_spent_seconds: timeSpentSeconds,
        }),
      });
    } catch (error) {
      log.error("Failed to record learning view:", error);
      // Don't throw error - fail silently for tracking
    }
  }

  /**
   * Get all learning records
   */
  async getAllRecords(limit: number = 100): Promise<LearningRecord[]> {
    try {
      const response = await fetch(`${API_ENDPOINTS.learningRecord.list}?limit=${limit}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch learning records");
      }

      const data = await response.json();
      return data.records || [];
    } catch (error) {
      log.error("Failed to get learning records:", error);
      return [];
    }
  }

  /**
   * Get learning statistics
   */
  async getStats(): Promise<LearningStats> {
    try {
      const response = await fetch(API_ENDPOINTS.learningRecord.stats, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch learning stats");
      }

      const data = await response.json();
      return {
        total_views_this_week: data.total_views_this_week || 0,
        total_time_this_week: data.total_time_this_week || 0,
        knowledge_mastery: data.knowledge_mastery || 0,
        recent_records: data.recent_records || [],
        activity_heatmap: data.activity_heatmap || new Array(28).fill(0),
      };
    } catch (error) {
      log.error("Failed to get learning stats:", error);
      return this.getDefaultStats();
    }
  }

  /**
   * Get default stats for error cases or SSR
   */
  private getDefaultStats(): LearningStats {
    return {
      total_views_this_week: 0,
      total_time_this_week: 0,
      knowledge_mastery: 0,
      recent_records: [],
      activity_heatmap: new Array(28).fill(0),
    };
  }

  /**
   * Delete a learning record
   */
  async deleteRecord(recordId: number): Promise<void> {
    try {
      await fetch(API_ENDPOINTS.learningRecord.delete(recordId), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      log.error("Failed to delete learning record:", error);
      throw error;
    }
  }

  /**
   * Clear all learning records
   */
  async clearAllRecords(): Promise<void> {
    try {
      await fetch(API_ENDPOINTS.learningRecord.clearAll, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      log.error("Failed to clear learning records:", error);
      throw error;
    }
  }
}

export const learningRecordService = new LearningRecordService();

export type { LearningRecord, LearningStats };
