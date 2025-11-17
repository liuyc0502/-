"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import patientService from "@/services/patientService";
import { TimelineStage, Patient } from "@/types/patient";
import { App } from "antd";

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    "初诊": "bg-blue-100 text-blue-700 border-blue-200",
    "检查": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "确诊": "bg-red-100 text-red-700 border-red-200",
    "治疗": "bg-purple-100 text-purple-700 border-purple-200",
    "随访": "bg-green-100 text-green-700 border-green-200",
  };
  return colors[type] || "bg-gray-100 text-gray-700 border-gray-200";
};

export function DiagnosisHistoryTab() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timelines, setTimelines] = useState<TimelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.email) {
        message.warning("请先登录");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // First get patient profile
        const patientData = await patientService.getPatientByEmail(user.email);
        setPatient(patientData);

        // Then get timeline data
        if (patientData?.patient_id) {
          const timelineData = await patientService.getPatientTimeline(patientData.patient_id);
          setTimelines(timelineData);
        }
      } catch (error: any) {
        console.error("Failed to load diagnosis history:", error);
        message.error(error?.message || "加载诊断记录失败");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.email, message]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-gray-500">未找到您的患者档案</div>
        <div className="text-sm text-gray-400">请联系您的医生为您创建档案</div>
      </div>
    );
  }

  if (timelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-gray-500">暂无诊断记录</div>
        <div className="text-sm text-gray-400">您的医生将会在就诊后添加诊断记录</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        共 {timelines.length} 条诊断记录
      </div>

      {timelines.map((timeline) => (
        <Card key={timeline.timeline_id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(timeline.stage_type)}`}>
                  {timeline.stage_type}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {timeline.stage_date}
                </div>
              </div>
              <div className={`text-sm font-medium ${
                timeline.status === 'completed' ? 'text-green-600' :
                timeline.status === 'current' ? 'text-blue-600' :
                'text-gray-500'
              }`}>
                {timeline.status === 'completed' ? '已完成' :
                 timeline.status === 'current' ? '进行中' :
                 '待处理'}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{timeline.stage_title}</h3>
              {timeline.diagnosis && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    诊断说明
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{timeline.diagnosis}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[#10B981] border-[#10B981] hover:bg-[#10B981] hover:text-white"
                onClick={() => {
                  // Navigate to detail page or open modal
                  message.info("查看详细功能即将上线");
                }}
              >
                查看详细
              </Button>
              <Button variant="outline" size="sm" className="text-gray-600 hover:bg-gray-100">
                向AI提问
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
