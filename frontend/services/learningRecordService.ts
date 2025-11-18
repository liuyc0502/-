// Learning record service using localStorage
// This tracks knowledge base learning activities locally

interface LearningRecord {
  filePath: string;
  fileName: string;
  category?: string;
  viewCount: number;
  totalTimeSpent: number; // in seconds
  lastViewedAt: string;
  firstViewedAt: string;
}

interface LearningStats {
  totalViewsThisWeek: number;
  totalTimeThisWeek: number; // in hours
  knowledgeMastery: number; // percentage
  recentRecords: LearningRecord[];
  activityHeatmap: number[]; // 28 days of activity
}

const STORAGE_KEY = "nexent_learning_records";
const STATS_STORAGE_KEY = "nexent_learning_stats";

class LearningRecordService {
  /**
   * Record a knowledge file view
   */
  recordView(filePath: string, fileName: string, category?: string, timeSpentSeconds: number = 60): void {
    const records = this.getAllRecords();
    const existingRecord = records.find((r) => r.filePath === filePath);

    if (existingRecord) {
      existingRecord.viewCount += 1;
      existingRecord.totalTimeSpent += timeSpentSeconds;
      existingRecord.lastViewedAt = new Date().toISOString();
    } else {
      records.push({
        filePath,
        fileName,
        category,
        viewCount: 1,
        totalTimeSpent: timeSpentSeconds,
        lastViewedAt: new Date().toISOString(),
        firstViewedAt: new Date().toISOString(),
      });
    }

    this.saveRecords(records);
    this.updateStats();
  }

  /**
   * Get all learning records
   */
  getAllRecords(): LearningRecord[] {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Get learning statistics
   */
  getStats(): LearningStats {
    if (typeof window === "undefined") {
      return this.getDefaultStats();
    }

    const stored = localStorage.getItem(STATS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return this.calculateStats();
      }
    }

    return this.calculateStats();
  }

  /**
   * Calculate statistics from records
   */
  private calculateStats(): LearningStats {
    const records = this.getAllRecords();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter records from this week
    const thisWeekRecords = records.filter((r) => {
      const viewDate = new Date(r.lastViewedAt);
      return viewDate >= oneWeekAgo;
    });

    // Calculate total views and time this week
    const totalViewsThisWeek = thisWeekRecords.reduce((sum, r) => sum + r.viewCount, 0);
    const totalTimeThisWeek = thisWeekRecords.reduce((sum, r) => sum + r.totalTimeSpent, 0) / 3600; // Convert to hours

    // Calculate knowledge mastery (simplified: based on unique files viewed vs total available)
    // Assume 100 files in knowledge base for now
    const uniqueFilesViewed = records.length;
    const knowledgeMastery = Math.min(100, (uniqueFilesViewed / 50) * 100);

    // Get recent records (last 10)
    const recentRecords = [...records]
      .sort((a, b) => new Date(b.lastViewedAt).getTime() - new Date(a.lastViewedAt).getTime())
      .slice(0, 10);

    // Generate activity heatmap for last 28 days
    const activityHeatmap = this.generateActivityHeatmap(records);

    const stats: LearningStats = {
      totalViewsThisWeek,
      totalTimeThisWeek,
      knowledgeMastery,
      recentRecords,
      activityHeatmap,
    };

    this.saveStats(stats);
    return stats;
  }

  /**
   * Generate activity heatmap for the last 28 days
   */
  private generateActivityHeatmap(records: LearningRecord[]): number[] {
    const heatmap: number[] = new Array(28).fill(0);
    const now = new Date();

    records.forEach((record) => {
      const viewDate = new Date(record.lastViewedAt);
      const daysDiff = Math.floor((now.getTime() - viewDate.getTime()) / (24 * 60 * 60 * 1000));

      if (daysDiff >= 0 && daysDiff < 28) {
        heatmap[27 - daysDiff] += 1;
      }
    });

    return heatmap;
  }

  /**
   * Save records to localStorage
   */
  private saveRecords(records: LearningRecord[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  /**
   * Save stats to localStorage
   */
  private saveStats(stats: LearningStats): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.calculateStats();
  }

  /**
   * Get default stats for SSR
   */
  private getDefaultStats(): LearningStats {
    return {
      totalViewsThisWeek: 0,
      totalTimeThisWeek: 0,
      knowledgeMastery: 0,
      recentRecords: [],
      activityHeatmap: new Array(28).fill(0),
    };
  }

  /**
   * Clear all learning records (for testing or reset)
   */
  clearAllRecords(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STATS_STORAGE_KEY);
  }
}

export const learningRecordService = new LearningRecordService();
export type { LearningRecord, LearningStats };
