// Report interpretation card types
export interface ReportInterpretationData {
    card_type: "report_interpretation";
    report_title: string;
    sections: ReportSection[];
    source_references?: SourceReference[];
  }
  
  export interface ReportSection {
    id: string;
    title: string;
    icon: string;
    content?: string;
    items?: ReportSectionItem[];
    highlight?: boolean;
  }
  
  export interface ReportSectionItem {
    term?: string;
    explanation?: string;
    text?: string;
  }
  
  export interface SourceReference {
    source: string;
    relevance: string;
  }
  
  // QC check card types
  export interface QCCheckData {
    card_type: "qc_check";
    report_title: string;
    summary: {
      total: number;
      pass: number;
      warning: number;
      missing: number;
    };
    fields: QCField[];
  }
  
  export interface QCField {
    field: string;
    status: "pass" | "missing" | "warning" | "not_applicable";
    value: string | null;
    suggestion?: string;
  }