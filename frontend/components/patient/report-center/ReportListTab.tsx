"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { App } from "antd";
import reportCenterService from "@/services/reportCenterService";
import type { ReportListItem, PatientReportInterpretation } from "@/types/reportCenter";
import { ReportInterpretationDetail } from "./ReportInterpretationDetail";

interface ReportListTabProps {
  patientId: number;
}

const reportTypeConfig: Record<string, { label: string; color: string }> = {
  lab: { label: "检验", color: "bg-blue-100 text-blue-700 border-blue-200" },
  imaging: { label: "影像", color: "bg-purple-100 text-purple-700 border-purple-200" },
  pathology: { label: "病理", color: "bg-orange-100 text-orange-700 border-orange-200" },
};

const severityDotColor: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

export function ReportListTab({ patientId }: ReportListTabProps) {
  const { message } = App.useApp();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interpretations, setInterpretations] = useState<Record<string, PatientReportInterpretation>>({});
  const [interpretingId, setInterpretingId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [patientId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await reportCenterService.getReportList(patientId);
      setReports(data);
    } catch (error) {
      console.error("Failed to load reports:", error);
      message.error("加载报告列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = async (report: ReportListItem) => {
    if (expandedId === report.report_id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(report.report_id);

    // If already have interpretation cached locally, don't fetch again
    if (interpretations[report.report_id]) return;

    // If already interpreted on server, fetch it
    if (report.interpretation_status === "ready") {
      try {
        const interp = await reportCenterService.getInterpretation(patientId, report.report_id);
        setInterpretations((prev) => ({ ...prev, [report.report_id]: interp }));
      } catch {
        message.error("获取解读失败");
      }
      return;
    }

    // Trigger AI interpretation
    setInterpretingId(report.report_id);
    try {
      const interp = await reportCenterService.requestInterpretation(patientId, report.report_id);
      setInterpretations((prev) => ({ ...prev, [report.report_id]: interp }));
      // Update report status locally
      setReports((prev) =>
        prev.map((r) =>
          r.report_id === report.report_id
            ? { ...r, interpretation_status: "ready" as const, severity: interp.severity, summary: interp.plain_summary }
            : r
        )
      );
    } catch {
      message.error("AI解读失败，请稍后重试");
    } finally {
      setInterpretingId(null);
    }
  };

  const handleReinterpret = async (reportId: string) => {
    setInterpretingId(reportId);
    try {
      const interp = await reportCenterService.reinterpret(patientId, reportId);
      setInterpretations((prev) => ({ ...prev, [reportId]: interp }));
      setReports((prev) =>
        prev.map((r) =>
          r.report_id === reportId
            ? { ...r, severity: interp.severity, summary: interp.plain_summary }
            : r
        )
      );
      message.success("重新解读完成");
    } catch {
      message.error("重新解读失败");
    } finally {
      setInterpretingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        加载报告列表...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        暂无报告数据
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const typeConf = reportTypeConfig[report.report_type] || reportTypeConfig.lab;
        const isExpanded = expandedId === report.report_id;
        const isInterpreting = interpretingId === report.report_id;
        const interp = interpretations[report.report_id];

        return (
          <Card key={report.report_id} className="overflow-hidden">
            {/* Report card header */}
            <button
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              onClick={() => handleReportClick(report)}
            >
              {/* Type badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${typeConf.color}`}>
                {typeConf.label}
              </span>

              {/* Title + date + summary */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {report.report_title}
                  </span>
                  <span className="text-sm text-gray-400 flex-shrink-0">
                    {report.report_date}
                  </span>
                </div>
                {report.summary && (
                  <p className="text-sm text-gray-500 mt-1 truncate">
                    {report.summary}
                  </p>
                )}
              </div>

              {/* Severity dot */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {report.severity ? (
                  <span className={`w-3 h-3 rounded-full ${severityDotColor[report.severity]}`} />
                ) : (
                  <span className="w-3 h-3 rounded-full bg-gray-300" />
                )}
                {report.interpretation_status === "pending" && (
                  <span className="text-xs text-gray-400">待解读</span>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-5 py-4">
                {isInterpreting ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    AI 正在解读中，请稍候...
                  </div>
                ) : interp ? (
                  <ReportInterpretationDetail
                    interpretation={interp}
                    onReinterpret={() => handleReinterpret(report.report_id)}
                    isReinterpreting={isInterpreting}
                  />
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Button
                      variant="outline"
                      onClick={() => handleReportClick(report)}
                    >
                      开始 AI 解读
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
