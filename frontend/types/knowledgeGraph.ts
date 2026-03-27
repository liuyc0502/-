// Knowledge Graph entity node types
export type KGNodeType =
  | "Disease"
  | "PathologicalFeature"
  | "Biomarker"
  | "Treatment"
  | "TestMethod"
  | "Organ"
  | "ClinicalStage";

// Knowledge Graph relationship types
export type KGEdgeType =
  | "indicates"
  | "causes"
  | "differentiates_from"
  | "progresses_to"
  | "treats"
  | "detected_by"
  | "associated_with";

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: KGNodeType;
  properties?: Record<string, any>;
  isPatientPosition?: boolean;
  isAnomaly?: boolean;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  type: KGEdgeType;
  weight: number;
  isPredicted?: boolean;
  confidence?: number;
}

export interface PredictionPath {
  target_node: KnowledgeGraphNode;
  probability: number;
  reasoning: string;
  timeframe: string;
}

export interface TrajectoryAnomaly {
  node_id: string;
  expected_path: string;
  actual_path: string;
  anomaly_score: number;
  clinical_significance: string;
}

export interface PatientPosition {
  current_nodes: string[];
  visit_history: { date: string; node_ids: string[] }[];
}

export interface KnowledgeGraphData {
  card_type: "knowledge_graph";
  query: string;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  patient_position?: PatientPosition;
  predictions?: PredictionPath[];
  anomalies?: TrajectoryAnomaly[];
  confidence: number;
}

// History record for the explorer page
export interface KnowledgeGraphHistoryItem {
  id: string;
  query: string;
  node_count: number;
  edge_count: number;
  has_patient: boolean;
  created_at: string;
}
