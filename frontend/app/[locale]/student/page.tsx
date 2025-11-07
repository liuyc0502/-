"use client";

import { useTranslation } from "react-i18next";
import { usePortalAuth } from "@/hooks/usePortalAuth";

export default function StudentPage() {
  const { t } = useTranslation("student");
  const { isLoading } = usePortalAuth("student");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {t("title", "医学生端")}
          </h1>
          <p className="text-slate-300">
            {t("subtitle", "智研病理，AI启蒙")}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Learning modules will go here */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-all">
            <h3 className="text-xl font-semibold text-white mb-2">
              {t("courses.title", "课程学习")}
            </h3>
            <p className="text-slate-300">
              {t("courses.description", "病理学习资源和AI辅助教学")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

