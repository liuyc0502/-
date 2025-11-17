"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Phone, Calendar, MapPin, Heart, Stethoscope, Edit } from "lucide-react";

// Mock data - will be replaced with real API calls
const mockPatientInfo = {
  name: "张明",
  gender: "男",
  age: 52,
  phone: "138****5678",
  address: "北京市朝阳区",
  emergencyContact: "李红 (配偶) - 139****1234",
  primaryDiagnosis: "结肠腺癌",
  diagnosisDate: "2025-11-01",
  attendingDoctor: "李医生",
  medicalSummary: "您在2025年11月因腹部不适就诊，经检查确诊为结肠腺癌。已于11月5日完成手术治疗，目前处于术后恢复阶段。定期复查显示恢复良好，肿瘤标志物逐步下降。需要继续保持清淡饮食，适量运动，按时服药。"
};

export function BasicInfoTab() {
  return (
    <div className="space-y-5">
      {/* Personal Information Card */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5 text-[#10B981]" />
              个人信息
            </h2>
            <Button variant="outline" size="sm" className="text-[#10B981] border-[#10B981] hover:bg-[#10B981] hover:text-white">
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-sm text-gray-500">姓名</div>
              <div className="text-base font-semibold text-gray-900">{mockPatientInfo.name}</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-500">性别 / 年龄</div>
              <div className="text-base font-semibold text-gray-900">{mockPatientInfo.gender} · {mockPatientInfo.age}岁</div>
            </div>

            <div className="space-y-2 flex items-start gap-2">
              <Phone className="h-4 w-4 text-gray-400 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">联系电话</div>
                <div className="text-base font-semibold text-gray-900">{mockPatientInfo.phone}</div>
              </div>
            </div>

            <div className="space-y-2 flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">居住地址</div>
                <div className="text-base font-semibold text-gray-900">{mockPatientInfo.address}</div>
              </div>
            </div>

            <div className="space-y-2 flex items-start gap-2 md:col-span-2">
              <Heart className="h-4 w-4 text-red-500 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">紧急联系人</div>
                <div className="text-base font-semibold text-gray-900">{mockPatientInfo.emergencyContact}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Diagnosis Card */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-[#10B981]" />
            当前诊断
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold text-gray-900">{mockPatientInfo.primaryDiagnosis}</div>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {mockPatientInfo.diagnosisDate}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                主治医生: <span className="font-semibold text-gray-900">{mockPatientInfo.attendingDoctor}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700">病史摘要 (AI生成)</div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 leading-relaxed">
                {mockPatientInfo.medicalSummary}
              </div>
            </div>

            <Button className="w-full bg-[#10B981] hover:bg-[#059669] text-white">
              向AI了解我的病情
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
