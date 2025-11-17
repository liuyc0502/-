"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, FileText } from "lucide-react";

// Mock data
const mockDiagnoses = [
  {
    id: "1",
    date: "2025-11-15",
    type: "复查",
    diagnosis: "结肠腺癌术后恢复良好",
    doctor: "李医生",
    notes: "术后恢复情况良好，肿瘤标志物CEA、CA199均在正常范围内。继续观察，保持健康饮食和适量运动。"
  },
  {
    id: "2",
    date: "2025-11-05",
    type: "治疗",
    diagnosis: "结肠腺癌手术治疗",
    doctor: "李医生",
    notes: "手术顺利完成，切除病灶组织，术后生命体征平稳。建议术后化疗并定期复查。"
  },
  {
    id: "3",
    date: "2025-11-01",
    type: "初诊",
    diagnosis: "结肠腺癌",
    doctor: "李医生",
    notes: "患者因腹部不适就诊，经肠镜检查发现结肠肿物，活检确诊为腺癌。建议尽快手术治疗。"
  }
];

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    "初诊": "bg-blue-100 text-blue-700 border-blue-200",
    "复查": "bg-green-100 text-green-700 border-green-200",
    "治疗": "bg-purple-100 text-purple-700 border-purple-200",
    "会诊": "bg-orange-100 text-orange-700 border-orange-200"
  };
  return colors[type] || "bg-gray-100 text-gray-700 border-gray-200";
};

export function DiagnosisHistoryTab() {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        共 {mockDiagnoses.length} 条诊断记录
      </div>

      {mockDiagnoses.map((record) => (
        <Card key={record.id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(record.type)}`}>
                  {record.type}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {record.date}
                </div>
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-1">
                <User className="h-4 w-4" />
                {record.doctor}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{record.diagnosis}</h3>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  诊断说明
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{record.notes}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-[#10B981] border-[#10B981] hover:bg-[#10B981] hover:text-white">
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
