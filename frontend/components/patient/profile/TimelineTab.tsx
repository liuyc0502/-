"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Activity, FileText, Stethoscope } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import patientService from "@/services/patientService";
import { TimelineStage, Patient } from "@/types/patient";
import { App } from "antd";

const getIconComponent = (stageType: string) => {
  const iconMap: Record<string, typeof Calendar> = {
    "初诊": Activity,
    "检查": FileText,
    "确诊": Activity,
    "治疗": Stethoscope,
    "随访": Stethoscope,
  };
  return iconMap[stageType] || Calendar;
};

const getColorClasses = (stageType: string) => {
  const colors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    "初诊": {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      dot: "bg-blue-500"
    },
    "检查": {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
      dot: "bg-yellow-500"
    },
    "确诊": {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      dot: "bg-red-500"
    },
    "治疗": {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-700",
      dot: "bg-purple-500"
    },
    "随访": {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      dot: "bg-green-500"
    }
  };
  return colors[stageType] || {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    dot: "bg-gray-500"
  };
};

export function TimelineTab() {
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
          // Sort by date descending (newest first)
          const sortedTimelines = timelineData.sort((a, b) => {
            return new Date(b.stage_date).getTime() - new Date(a.stage_date).getTime();
          });
          setTimelines(sortedTimelines);
        }
      } catch (error: any) {
        console.error("Failed to load timeline:", error);
        message.error(error?.message || "加载就诊时间线失败");
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
        <div className="text-gray-500">暂无就诊记录</div>
        <div className="text-sm text-gray-400">您的医生将会在就诊后添加就诊记录</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-6">
        共 {timelines.length} 条就诊记录
      </div>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline Events */}
        <div className="space-y-8">
          {timelines.map((timeline) => {
            const Icon = getIconComponent(timeline.stage_type);
            const colors = getColorClasses(timeline.stage_type);

            return (
              <div key={timeline.timeline_id} className="relative pl-16">
                {/* Timeline Dot */}
                <div className={`absolute left-4 top-2 w-5 h-5 rounded-full ${colors.dot} border-4 border-white shadow-md z-10`}></div>

                {/* Event Card */}
                <Card className={`${colors.bg} border ${colors.border} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{timeline.stage_title}</h3>
                          <div className={`text-xs font-medium ${colors.text} mt-1`}>
                            {timeline.stage_type}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {timeline.stage_date}
                      </div>
                    </div>

                    {timeline.diagnosis && (
                      <p className="text-sm text-gray-700 leading-relaxed pl-8">
                        {timeline.diagnosis}
                      </p>
                    )}

                    {/* Status Badge */}
                    <div className="pl-8 flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        timeline.status === 'completed' ? 'bg-green-100 text-green-700' :
                        timeline.status === 'current' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {timeline.status === 'completed' ? '已完成' :
                         timeline.status === 'current' ? '进行中' :
                         '待处理'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Timeline Start Marker */}
        <div className="relative pl-16 mt-8">
          <div className="absolute left-4 top-2 w-5 h-5 rounded-full bg-gray-300 border-4 border-white shadow-md"></div>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            就诊历史开始
          </div>
        </div>
      </div>
    </div>
  );
}
