// Reasoning chain card types
export interface ReasoningChainData {
  card_type: "reasoning_chain";
  question: string;
  conclusion: string;
  confidence: number; // 0-1
  steps: ReasoningStep[];
}

export interface ReasoningStep {
  step_number: number;
  type: "evidence" | "reasoning" | "exclusion";
  title: string;
  content: string;
  knowledge_source?: {
    cite_index: number;
    source_name: string;
    excerpt: string;
  };
}
