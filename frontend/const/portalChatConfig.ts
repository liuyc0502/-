import type { ComponentType, SVGProps } from "react";

import {
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
  newChatLabel: string;
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
    brandName: "Claude",
    heroIcon: "✺",
    heroGreeting: "Good afternoon",
    heroSubheading: "How can I help you today?",
    inputPlaceholder: "How can I help you today?",
    newChatLabel: "New chat",
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
    brandName: "Claude",
    heroIcon: "✺",
    heroGreeting: "Good afternoon",
    heroSubheading: "How can I help you today?",
    inputPlaceholder: "How can I help you today?",
    newChatLabel: "新对话",
    newChatDescription: "快速开始一次病例讨论",
    navItems: [
      { id: "chats", label: "对话", icon: MessageSquare },
      { id: "patients", label: "病人档案", icon: FileText },
      { id: "cases", label: "病例库", icon: FolderKanban },
      { id: "reports", label: "诊断报告", icon: BookOpenCheck },
      { id: "knowledge", label: "知识速查", icon: Brain },
      { id: "research", label: "研究工具", icon: Microscope },
    ],
    quickActions: sharedQuickActions,
    searchPlaceholder: "搜索病历或对话",
    recentLabel: "Recents",
    quickActionHeading: "医生常用快捷提问",
    defaultUserName: "沅宸",
  },
  student: {
    accentColor: "#2563EB",
    backgroundColor: "#F5F9FF",
    brandName: "Claude",
    heroIcon: "✺",
    heroGreeting: "Good afternoon",
    heroSubheading: "Ready to learn together?",
    inputPlaceholder: "What do you want to study today?",
    newChatLabel: "新对话",
    newChatDescription: "规划一节随时开讲的课程",
    navItems: [
      { id: "chats", label: "对话", icon: MessageSquare },
      { id: "courses", label: "课程", icon: GraduationCap },
      { id: "notes", label: "课堂笔记", icon: Notebook },
      { id: "resources", label: "学习资料", icon: Lightbulb },
      { id: "assignments", label: "作业", icon: FileText },
    ],
    quickActions: sharedQuickActions,
    searchPlaceholder: "搜索课程或对话",
    recentLabel: "Recents",
    quickActionHeading: "学生常用快捷提问",
    defaultUserName: "沉宸",
  },
  patient: {
    accentColor: "#10B981",
    backgroundColor: "#F4FBF7",
    brandName: "Claude",
    heroIcon: "✺",
    heroGreeting: "Good afternoon",
    heroSubheading: "How can I support your care today?",
    inputPlaceholder: "我今天想了解的健康问题是...",
    newChatLabel: "新对话",
    newChatDescription: "获取贴心的健康建议",
    navItems: [
      { id: "chats", label: "对话", icon: MessageSquare },
      { id: "records", label: "健康档案", icon: FileText },
      { id: "guides", label: "护理指引", icon: LifeBuoy },
      { id: "insights", label: "康复贴士", icon: Lightbulb },
      { id: "reports", label: "检查报告", icon: BookOpenCheck },
    ],
    quickActions: sharedQuickActions,
    searchPlaceholder: "搜索健康话题或对话",
    recentLabel: "Recents",
    quickActionHeading: "患者常用快捷提问",
    defaultUserName: "沉宸",
  },
  admin: {
    accentColor: "#7C3AED",
    backgroundColor: "#F7F3FF",
    brandName: "Claude",
    heroIcon: "✺",
    heroGreeting: "Good afternoon",
    heroSubheading: "Let's keep the team aligned.",
    inputPlaceholder: "What would you like to coordinate?",
    newChatLabel: "新对话",
    newChatDescription: "指挥中心的即时沟通",
    navItems: [
      { id: "chats", label: "对话", icon: MessageSquare },
      { id: "operations", label: "运营面板", icon: FolderKanban },
      { id: "reports", label: "报表分析", icon: FileText },
      { id: "insights", label: "战略洞察", icon: Lightbulb },
      { id: "knowledge", label: "知识库", icon: Brain },
    ],
    quickActions: sharedQuickActions,
    searchPlaceholder: "搜索团队或对话",
    recentLabel: "Recents",
    quickActionHeading: "管理员常用快捷提问",
    defaultUserName: "沉宸",
  },
};
