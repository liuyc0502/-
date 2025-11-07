"use client";

import { useTranslation } from "react-i18next";
import { usePortalAuth } from "@/hooks/usePortalAuth";

export default function DoctorPage() {
  const { t } = useTranslation("doctor");
  const { isLoading } = usePortalAuth("doctor");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {t("title", "病理医生端")}
          </h1>
          <p className="text-slate-300">
            {t("subtitle", "智能洞察，辅佐诊断")}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Dashboard cards will go here */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-all">
            <h3 className="text-xl font-semibold text-white mb-2">
              {t("dashboard.title", "诊断仪表盘")}
            </h3>
            <p className="text-slate-300">
              {t("dashboard.description", "查看患者病理报告和诊断数据")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

