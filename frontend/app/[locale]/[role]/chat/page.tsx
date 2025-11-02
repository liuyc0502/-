"use client";

import { useParams } from "next/navigation";
import { UserRole } from "@/roleRouter";
import { ChatInterface } from "@/chatInterface";
import { useTranslation } from "react-i18next";

const roleWelcomeMessages: Record<UserRole, string> = {
  doctor: "您好医生，我是您的病理诊断助手，有什么可以帮到您？",
  student: "欢迎学习！我会用简单的方式帮你理解复杂的病理知识。",
  admin: "管理员您好，有什么需要协助的吗？",
  patient: "您好！我会用简单的话帮您理解检查结果和健康问题。"
};

export default function RoleChatPage() {
  const params = useParams();
  const { t } = useTranslation("common");
  const role = (params?.role as UserRole) || 'doctor';
  
  const welcomeMessage = roleWelcomeMessages[role];

  return (
    <div className="h-full flex flex-col">
      {/* 角色专属的欢迎提示 */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 {welcomeMessage}
        </p>
      </div>

      {/* 聊天界面 */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}