"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Phone, Calendar, MapPin, Heart, Stethoscope, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import patientService from "@/services/patientService";
import { Patient } from "@/types/patient";
import { App } from "antd";

export function BasicInfoTab() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPatientProfile = async () => {
      if (!user?.email) {
        message.warning("请先登录");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await patientService.getPatientByEmail(user.email);
        setPatient(data);
      } catch (error: any) {
        console.error("Failed to load patient profile:", error);
        message.error(error?.message || "加载患者档案失败");
      } finally {
        setLoading(false);
      }
    };

    loadPatientProfile();
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
              <div className="text-base font-semibold text-gray-900">{patient.name}</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-500">性别 / 年龄</div>
              <div className="text-base font-semibold text-gray-900">{patient.gender} · {patient.age}岁</div>
            </div>

            {patient.date_of_birth && (
              <div className="space-y-2 flex items-start gap-2">
                <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">出生日期</div>
                  <div className="text-base font-semibold text-gray-900">{patient.date_of_birth}</div>
                </div>
              </div>
            )}

            {patient.phone && (
              <div className="space-y-2 flex items-start gap-2">
                <Phone className="h-4 w-4 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">联系电话</div>
                  <div className="text-base font-semibold text-gray-900">{patient.phone}</div>
                </div>
              </div>
            )}

            {patient.address && (
              <div className="space-y-2 flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">居住地址</div>
                  <div className="text-base font-semibold text-gray-900">{patient.address}</div>
                </div>
              </div>
            )}

            {patient.allergies && patient.allergies.length > 0 && (
              <div className="space-y-2 flex items-start gap-2 md:col-span-2">
                <Heart className="h-4 w-4 text-red-500 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">过敏史</div>
                  <div className="text-base font-semibold text-gray-900">{patient.allergies.join(", ")}</div>
                </div>
              </div>
            )}
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
            {patient.diagnosis ? (
              <>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-bold text-gray-900">{patient.diagnosis}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {patient.create_time?.split('T')[0]}
                    </div>
                  </div>
                </div>

                {(patient.family_history || patient.past_medical_history) && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-gray-700">病史信息</div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 leading-relaxed space-y-2">
                      {patient.family_history && (
                        <div>
                          <span className="font-semibold">家族史: </span>
                          {patient.family_history}
                        </div>
                      )}
                      {patient.past_medical_history && patient.past_medical_history.length > 0 && (
                        <div>
                          <span className="font-semibold">既往病史: </span>
                          {patient.past_medical_history.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Button className="w-full bg-[#10B981] hover:bg-[#059669] text-white">
                  向AI了解我的病情
                </Button>
              </>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500">
                暂无诊断信息
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
