import {
  HeartPulse,
  Microscope,
  FlaskConical,
  Pill,
  TestTubeDiagonal,
  Bone,
  Layers,
  type LucideIcon,
} from "lucide-react";
import type { KGNodeType, KGEdgeType } from "@/types/knowledgeGraph";

export const PATIENT_ACCENT = "#DA7756";
export const PATIENT_GREEN = "#6E977B";

export interface NodeTypeConfig {
  surface: string;
  accent: string;
  icon: LucideIcon;
  label: string;
  badgeClass: string; // bg + text tailwind classes for pills
}

export const NODE_TYPE_CONFIG: Record<KGNodeType, NodeTypeConfig> = {
  Disease: {
    surface: "#F0D4CA",
    accent: "#AD4C3D",
    icon: HeartPulse,
    label: "疾病",
    badgeClass: "bg-[#E8C3B8] text-[#83382D]",
  },
  PathologicalFeature: {
    surface: "#F0E0BB",
    accent: "#A77724",
    icon: Microscope,
    label: "病理特征",
    badgeClass: "bg-[#E8D19B] text-[#7D5815]",
  },
  Biomarker: {
    surface: "#D4E0EE",
    accent: "#476B96",
    icon: FlaskConical,
    label: "生物标志物",
    badgeClass: "bg-[#C1D2E4] text-[#34567C]",
  },
  Treatment: {
    surface: "#D3E2CF",
    accent: "#56784D",
    icon: Pill,
    label: "治疗方案",
    badgeClass: "bg-[#C3D8BE] text-[#42623C]",
  },
  TestMethod: {
    surface: "#CCE0D9",
    accent: "#3E7466",
    icon: TestTubeDiagonal,
    label: "检测方法",
    badgeClass: "bg-[#B8D2C8] text-[#2F6155]",
  },
  Organ: {
    surface: "#CFE1E4",
    accent: "#48767E",
    icon: Bone,
    label: "器官",
    badgeClass: "bg-[#BCD3D6] text-[#346168]",
  },
  ClinicalStage: {
    surface: "#EFD6C4",
    accent: "#AE6B37",
    icon: Layers,
    label: "临床分期",
    badgeClass: "bg-[#E7C8B0] text-[#874A20]",
  },
};

export interface EdgeTypeConfig {
  color: string;
  label: string;
}

export const EDGE_TYPE_CONFIG: Record<KGEdgeType, EdgeTypeConfig> = {
  indicates: { color: "#3B82F6", label: "表明" },
  causes: { color: "#EF4444", label: "导致" },
  differentiates_from: { color: "#F59E0B", label: "鉴别" },
  progresses_to: { color: "#DA7756", label: "进展为" },
  treats: { color: "#6E977B", label: "治疗" },
  detected_by: { color: "#0F766E", label: "检测于" },
  associated_with: { color: "#94A3B8", label: "相关" },
};

// Friendly labels for patient-facing views
export const FRIENDLY_TYPE_LABELS: Record<string, string> = {
  Disease: "诊断",
  Treatment: "治疗方案",
  ClinicalStage: "阶段",
  Biomarker: "检查指标",
  TestMethod: "检查项目",
  PathologicalFeature: "病理发现",
  Organ: "相关部位",
};
