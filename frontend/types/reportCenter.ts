// 报告解读状态
export type InterpretationStatus = "pending" | "ready" | "error";

// 严重程度
export type SeverityLevel = "green" | "yellow" | "red";

// 报告列表项（聚合展示）
export interface ReportListItem {
  report_id: string;
  report_type: "lab" | "imaging" | "pathology";
  report_title: string;
  report_date: string;
  source_timeline_id?: number;
  interpretation_status: InterpretationStatus;
  severity?: SeverityLevel;
  summary?: string; // AI 一句话摘要
}

// 患者端通俗解读数据
export interface PatientReportInterpretation {
  report_id: string;
  report_type: "lab" | "imaging" | "pathology";
  report_title: string;
  report_date: string;
  severity: SeverityLevel;
  severity_label: string; // "情况正常" / "需要关注" / "建议尽快就医"
  plain_summary: string; // 一段大白话总结
  sections: PatientInterpretationSection[];
  next_steps: string[]; // 下一步建议
  disclaimer: string; // 免责声明
  generated_at: string;
}

export interface PatientInterpretationSection {
  id: string;
  title: string; // "核心结论" / "关键发现" / "术语解释" / "需要关注"
  icon: string;
  content?: string;
  items?: PatientInterpretationItem[];
  highlight?: boolean;
}

export interface PatientInterpretationItem {
  label: string;
  value?: string;
  explanation?: string;
  status?: "normal" | "abnormal" | "warning";
}

// 指标趋势数据
export interface MetricTrend {
  metric_name: string;
  metric_unit: string;
  normal_range?: string;
  data_points: MetricDataPoint[];
  current_status: "normal" | "abnormal" | "warning";
}

export interface MetricDataPoint {
  date: string;
  value: number;
  report_title: string;
  is_abnormal: boolean;
}
