import type { ComponentType, SVGProps } from "react";

import {
  BookOpen,
  BookOpenCheck,
  Brain,
  Code,
  FileText,
  FolderKanban,
  GraduationCap,
  LifeBuoy,
  Lightbulb,
  MessageSquare,
  Microscope,
  Notebook,
  Sparkles,
  Users,
} from "lucide-react";

import type { PortalType } from "@/types/portal";

export type PortalChatVariant = PortalType | "general";

export interface PortalNavItemConfig {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description?: string;
}

export interface PortalQuickActionConfig {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  prefill?: string;
}

export interface PortalChatConfig {
  accentColor: string;
  backgroundColor: string;
  brandName: string;
  heroIcon?: string;
  heroGreeting?: string;
  heroSubheading?: string;
  inputPlaceholder?: string;
  newChatDescription?: string;
  navItems: PortalNavItemConfig[];
  quickActions: PortalQuickActionConfig[];
  searchPlaceholder: string;
  recentLabel: string;
  quickActionHeading?: string;
  defaultUserName?: string;
}

const sharedQuickActions: PortalQuickActionConfig[] = [
  {
    id: "code",
    label: "Code",
    icon: Code,
    prefill: "Write a concise TypeScript utility for me.",
  },
  {
    id: "write",
    label: "Write",
    icon: Notebook,
    prefill: "Draft a patient-friendly explanation for today's diagnosis.",
  },
  {
    id: "learn",
    label: "Learn",
    icon: GraduationCap,
    prefill: "Summarize the latest findings on colorectal pathology.",
  },
  {
    id: "life",
    label: "Life stuff",
    icon: LifeBuoy,
    prefill: "Help me craft a caring follow-up message for my patient.",
  },
  {
    id: "claude",
    label: "Claude's choice",
    icon: Sparkles,
    prefill: "Surprise me with an insight that could help today's rounds.",
  },
];

export const portalChatConfigs: Record<PortalChatVariant, PortalChatConfig> = {
  general: {
    accentColor: "#D94527",
    backgroundColor: "#FAFAFA",
    brandName: "安语",
    heroSubheading: "How can I help you today?",
    inputPlaceholder: "How can I help you today?",
    newChatDescription: "Start a fresh conversation",
    navItems: [
      { id: "chats", label: "Chats", icon: MessageSquare },
      { id: "patients", label: "病人档案", icon: FileText },
      { id: "cases", label: "病例库", icon: FolderKanban },
      { id: "reports", label: "诊断报告", icon: BookOpenCheck },
      { id: "knowledge", label: "知识速查", icon: Brain },
      { id: "research", label: "研究工具", icon: Microscope },
    ],
    quickActions: sharedQuickActions,
    searchPlaceholder: "搜索对话",
    recentLabel: "Recents",
    quickActionHeading: "Try asking about",
    defaultUserName: "沉宸",
  },
  doctor: {
    accentColor: "#D94527",
    backgroundColor: "#FAFAFA",
    brandName: "安语",
    heroSubheading: "How can I help you today?",
    inputPlaceholder: "How can I help you today?",
    newChatDescription: "快速开始一次病例讨论",
    navItems: [
      { id: "chats", label: "对话", icon: MessageSquare },
      { id: "patients", label: "患者档案", icon: Users },
      { id: "cases", label: "病例库", icon: FolderKanban },
      { id: "knowledge", label: "病理知识库", icon: BookOpen },
    ],
    quickActions: sharedQuickActions,
    searchPlaceholder: "搜索病历或对话",
    recentLabel: "Recents",
    quickActionHeading: "医生常用快捷提问",
    defaultUserName: "沅宸",
  },
  patient: {
    accentColor: "#10B981",
    backgroundColor: "#F4FBF7",
    brandName: "安语",
    heroSubheading: "How can I support your care today?",
    inputPlaceholder: "我今天想了解的健康问题是...",
    newChatDescription: "获取贴心的健康建议",
    navItems: [
      { id: "chats", label: "对话", icon: MessageSquare },
      { id: "profile", label: "我的档案", icon: Users },
      { id: "care-plan", label: "康复计划", icon: LifeBuoy },
      { id: "knowledge", label: "疾病百科", icon: BookOpen },
    ],
    quickActions: sharedQuickActions,
    searchPlaceholder: "搜索健康话题或对话",
    recentLabel: "Recents",
    quickActionHeading: "患者常用快捷提问",
    defaultUserName: "沅宸",
  },
  admin: {
    accentColor: "#7C3AED",
    backgroundColor: "#F7F3FF",
    brandName: "安语",
    heroSubheading: "System configuration and management",
    inputPlaceholder: "What would you like to configure?",
    newChatDescription: "管理系统配置",
    navItems: [
      { id: "chats", label: "对话", icon: MessageSquare },
      { id: "agents", label: "智能体配置", icon: Sparkles },
      { id: "agent-assignment", label: "智能体分配", icon: Users },
      { id: "models", label: "模型管理", icon: Code },
      { id: "knowledge", label: "知识库管理", icon: Brain },
      { id: "system", label: "系统设置", icon: FolderKanban },
    ],
    quickActions: sharedQuickActions,
    searchPlaceholder: "搜索配置或对话",
    recentLabel: "Recents",
    quickActionHeading: "管理员常用快捷提问",
    defaultUserName: "沅宸",
  },
};
