// Multi-agent consultation types

export interface ConsultationSpecialist {
  name: string;
  specialty: string;
  agent_id?: number;
}

export interface ConsultationStartData {
  consultation_id: string;
  question: string;
  specialists: ConsultationSpecialist[];
  max_rounds: number;
}

export interface ConsultationAgentStepData {
  consultation_id: string;
  agent_name: string;
  round: number;
  step: string;
  type: "thinking" | "tool_use" | "conclusion";
}

export interface ConsultationAgentOpinionData {
  consultation_id: string;
  agent_name: string;
  round: number;
  conclusion: string;
  confidence: number;
  agrees_with: string[];
  disagrees_with: string[];
}

export interface ConsultationRoundCompleteData {
  consultation_id: string;
  round: number;
  summary: string;
  consensus_level: "full" | "partial" | "divergent";
}

export interface ConsultationWaitingDoctorData {
  consultation_id: string;
  round: number;
}

export interface ConsultationReportData {
  card_type: "consultation_report";
  consultation_id: string;
  question: string;
  total_rounds: number;
  specialists: {
    name: string;
    specialty: string;
    final_opinion: string;
  }[];
  agreements: string[];
  disagreements: string[];
  final_recommendation: string;
  confidence: number;
}

// Accumulated state for a live consultation in the chat stream
export interface ConsultationState {
  consultation_id: string;
  question: string;
  specialists: ConsultationSpecialist[];
  max_rounds: number;
  current_round: number;
  // Per-agent steps accumulated during streaming
  agentSteps: Record<string, ConsultationAgentStepData[]>;
  // Per-agent opinions per round
  agentOpinions: Record<number, Record<string, ConsultationAgentOpinionData>>;
  // Round summaries
  roundSummaries: Record<number, { summary: string; consensus_level: string }>;
  // Whether waiting for doctor decision
  waitingForDoctor: boolean;
  waitingRound: number;
  // Final status
  isComplete: boolean;
}
