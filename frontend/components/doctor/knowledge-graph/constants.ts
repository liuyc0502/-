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
    surface: "#F8E5DF",
    accent: "#C76556",
    icon: HeartPulse,
    label: "疾病",
    badgeClass: "bg-[#F7E4DE] text-[#A74C40]",
  },
  PathologicalFeature: {
    surface: "#F8EDCF",
    accent: "#B78535",
    icon: Microscope,
    label: "病理特征",
    badgeClass: "bg-[#F6E9C8] text-[#91691F]",
  },
  Biomarker: {
    surface: "#E3ECF6",
    accent: "#5A7EAB",
    icon: FlaskConical,
    label: "生物标志物",
    badgeClass: "bg-[#DDE8F4] text-[#476A95]",
  },
  Treatment: {
    surface: "#E1ECDD",
    accent: "#66875E",
    icon: Pill,
    label: "治疗方案",
    badgeClass: "bg-[#DCE8D8] text-[#54724F]",
  },
  TestMethod: {
    surface: "#DCEBE7",
    accent: "#4F8678",
    icon: TestTubeDiagonal,
    label: "检测方法",
    badgeClass: "bg-[#D6E7E2] text-[#417468]",
  },
  Organ: {
    surface: "#DEEDEF",
    accent: "#5A8790",
    icon: Bone,
    label: "器官",
    badgeClass: "bg-[#D8E8EA] text-[#4A757E]",
  },
  ClinicalStage: {
    surface: "#F7E4D7",
    accent: "#C37D4B",
    icon: Layers,
    label: "临床分期",
    badgeClass: "bg-[#F4DFD1] text-[#A86635]",
  },
};

export interface EdgeTypeConfig {
  color: string;
  label: string;
}

export const EDGE_TYPE_CONFIG: Record<KGEdgeType, EdgeTypeConfig> = {
  indicates: { color: "#5D8FE6", label: "表明" },
  causes: { color: "#D86C63", label: "导致" },
  differentiates_from: { color: "#D9AB55", label: "鉴别" },
  progresses_to: { color: "#DA7756", label: "进展为" },
  treats: { color: "#78A989", label: "治疗" },
  detected_by: { color: "#56A7A1", label: "检测于" },
  associated_with: { color: "#A4B3C6", label: "相关" },
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
