"use client";

import { useTranslation } from "react-i18next";
import { usePortalAuth } from "@/hooks/usePortalAuth";

export default function PatientPage() {
  const { t } = useTranslation("patient");
  const { isLoading } = usePortalAuth("patient");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {t("title", "患者端")}
          </h1>
          <p className="text-slate-300">
            {t("subtitle", "医学知识，触手可及")}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Patient features will go here */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-all">
            <h3 className="text-xl font-semibold text-white mb-2">
              {t("records.title", "我的报告")}
            </h3>
            <p className="text-slate-300">
              {t("records.description", "查看和管理您的病理报告")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

