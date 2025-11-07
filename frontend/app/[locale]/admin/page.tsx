"use client";

import { useTranslation } from "react-i18next";
import { usePortalAuth } from "@/hooks/usePortalAuth";

export default function AdminPage() {
  const { t } = useTranslation("admin");
  const { isLoading } = usePortalAuth("admin");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {t("title", "管理员端")}
          </h1>
          <p className="text-slate-300">
            {t("subtitle", "系统管理与配置")}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Admin features will go here */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-all">
            <h3 className="text-xl font-semibold text-white mb-2">
              {t("users.title", "用户管理")}
            </h3>
            <p className="text-slate-300">
              {t("users.description", "管理系统用户和权限")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

