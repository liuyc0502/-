"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Activity, FileText, Stethoscope } from "lucide-react";

// Mock data
const mockTimelineEvents = [
  {
    id: "1",
    date: "2025-11-15",
    type: "复查",
    title: "术后复查",
    description: "恢复情况良好，肿瘤标志物指标正常",
    icon: "checkup",
    color: "green"
  },
  {
    id: "2",
    date: "2025-11-10",
    type: "检查",
    title: "血液检查",
    description: "血常规检查，各项指标正常",
    icon: "test",
    color: "blue"
  },
  {
    id: "3",
    date: "2025-11-05",
    type: "治疗",
    title: "手术治疗",
    description: "结肠腺癌切除手术，手术顺利",
    icon: "treatment",
    color: "purple"
  },
  {
    id: "4",
    date: "2025-11-03",
    type: "检查",
    title: "术前检查",
    description: "完成术前各项检查，准备手术",
    icon: "test",
    color: "blue"
  },
  {
    id: "5",
    date: "2025-11-01",
    type: "诊断",
    title: "初次诊断",
    description: "确诊为结肠腺癌，制定治疗方案",
    icon: "diagnosis",
    color: "red"
  }
];

const getIconComponent = (iconType: string) => {
  switch (iconType) {
    case "checkup":
      return Stethoscope;
    case "test":
      return FileText;
    case "treatment":
      return Activity;
    case "diagnosis":
      return Activity;
    default:
      return Calendar;
  }
};

const getColorClasses = (color: string) => {
  const colors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    "green": {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      dot: "bg-green-500"
    },
    "blue": {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      dot: "bg-blue-500"
    },
    "purple": {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-700",
      dot: "bg-purple-500"
    },
    "red": {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      dot: "bg-red-500"
    }
  };
  return colors[color] || colors["blue"];
};

export function TimelineTab() {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-6">
        共 {mockTimelineEvents.length} 条就诊记录
      </div>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline Events */}
        <div className="space-y-8">
          {mockTimelineEvents.map((event, index) => {
            const Icon = getIconComponent(event.icon);
            const colors = getColorClasses(event.color);

            return (
              <div key={event.id} className="relative pl-16">
                {/* Timeline Dot */}
                <div className={`absolute left-4 top-2 w-5 h-5 rounded-full ${colors.dot} border-4 border-white shadow-md z-10`}></div>

                {/* Event Card */}
                <Card className={`${colors.bg} border ${colors.border} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
                          <div className={`text-xs font-medium ${colors.text} mt-1`}>
                            {event.type}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {event.date}
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed pl-8">
                      {event.description}
                    </p>

                    {/* Additional Details */}
                    {index === 0 && (
                      <div className="pl-8 pt-2 border-t border-gray-200 mt-3">
                        <div className="text-xs text-gray-500 mb-1">下次复查</div>
                        <div className="text-sm font-semibold text-gray-900">2025-12-15</div>
                      </div>
                    )}
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
