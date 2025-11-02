"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getRoleRoute, UserRole } from "@/roleRouter";
import { Settings, Database, Brain, Shield } from "lucide-react";

export default function SetupPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation("common");
  const role = (params?.role as UserRole) || 'doctor';

  const setupSections = [
    {
      title: "模型配置",
      description: "配置AI模型和提供商",
      icon: Brain,
      href: "/setup/models",
      allowedRoles: ['admin', 'doctor'] as UserRole[],
    },
    {
      title: "知识库管理", 
      description: "管理和配置知识库内容",
      icon: Database,
      href: "/setup/knowledges",
      allowedRoles: ['admin', 'doctor', 'student'] as UserRole[],
    },
    {
      title: "权限设置",
      description: "用户权限和访问控制",
      icon: Shield,
      href: "/setup/permissions",
      allowedRoles: ['admin'] as UserRole[],
    },
    {
      title: "通用设置",
      description: "系统偏好和个人设置",
      icon: Settings,
      href: "/setup/general",
      allowedRoles: ['doctor', 'student', 'admin', 'patient'] as UserRole[],
    },
  ];

  // 根据角色过滤可见的设置项
  const visibleSections = setupSections.filter(section => 
    section.allowedRoles.includes(role)
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">系统设置</h1>
        <p className="text-gray-600 dark:text-gray-400">
          配置和管理系统功能
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.href} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {section.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(getRoleRoute(section.href))}
                  >
                    进入设置
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 角色专属提示 */}
      {role === 'patient' && (
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ℹ️ 患者账户仅可修改个人偏好设置，如需更多权限请联系管理员。
          </p>
        </div>
      )}
    </div>
  );
}