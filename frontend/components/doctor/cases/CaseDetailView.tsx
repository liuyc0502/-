"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Star, Share2, GitCompare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { medicalCaseService, type MedicalCaseDetail } from "@/services/medicalCaseService";
import { message, Spin } from "antd";

interface CaseDetailViewProps {
  caseId: string;
  onBack: () => void;
}

export function CaseDetailView({ caseId, onBack }: CaseDetailViewProps) {
  const [caseDetail, setCaseDetail] = useState<MedicalCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadCaseDetail();
  }, [caseId]);

  const loadCaseDetail = async () => {
    try {
      setLoading(true);
      const data = await medicalCaseService.getDetail(parseInt(caseId));
      setCaseDetail(data);
    } catch (error) {
      message.error("加载病例详情失败");
      console.error("Failed to load case detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await medicalCaseService.toggleFavorite(parseInt(caseId));
      setIsFavorite(!isFavorite);
      message.success(isFavorite ? "已取消收藏" : "已收藏");
    } catch (error) {
      message.error("操作失败");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!caseDetail) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">病例不存在</p>
          <Button onClick={onBack} className="mt-4">返回病例库</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 px-8 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                返回病例库
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                {caseDetail.case_title || `病例 ${caseDetail.case_no} - ${caseDetail.diagnosis}`}
              </h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleToggleFavorite}>
                <Star className={`h-4 w-4 mr-2 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                {isFavorite ? "已收藏" : "收藏"}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                分享
              </Button>
              <Button variant="outline" size="sm">
                <GitCompare className="h-4 w-4 mr-2" />
                对比
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          <div className="grid grid-cols-12 gap-4">
          {/* Left Column - Case Information */}
          <div className="col-span-12 lg:col-span-8 space-y-5">
            {/* Patient Information */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold">患者信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">性别:</span>
                    <span className="ml-2 font-medium">{caseDetail.gender}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">年龄:</span>
                    <span className="ml-2 font-medium">{caseDetail.age}岁</span>
                  </div>
                  <div>
                    <span className="text-gray-500">病例编号:</span>
                    <span className="ml-2 font-medium">{caseDetail.case_no}</span>
                  </div>
                </div>
                {caseDetail.chief_complaint && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-sm">
                      <span className="font-semibold text-gray-700">主诉:</span>
                      <span className="ml-2 text-gray-600">{caseDetail.chief_complaint}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medical History */}
            {caseDetail.detail?.present_illness_history && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">现病史</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 leading-relaxed">
                  <p className="whitespace-pre-wrap">{caseDetail.detail.present_illness_history}</p>
                </CardContent>
              </Card>
            )}

            {/* Past Medical History */}
            {caseDetail.detail?.past_medical_history && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">既往史</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 leading-relaxed">
                  <p className="whitespace-pre-wrap">{caseDetail.detail.past_medical_history}</p>
                </CardContent>
              </Card>
            )}

            {/* Physical Examination */}
            {caseDetail.detail?.physical_examination && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">体格检查</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700">
                  <p className="whitespace-pre-wrap">{caseDetail.detail.physical_examination}</p>
                </CardContent>
              </Card>
            )}

            {/* Laboratory Tests */}
            {caseDetail.lab_results && caseDetail.lab_results.length > 0 && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">实验室检查</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {caseDetail.lab_results.map((lab, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-600">{lab.test_name}</span>
                        <span className={`font-semibold ${lab.is_abnormal ? "text-red-600" : "text-gray-900"}`}>
                          {lab.test_value} {lab.test_unit} {lab.abnormal_indicator || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Imaging */}
            {caseDetail.detail?.imaging_results && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">影像学检查</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700">
                  <p className="whitespace-pre-wrap">{caseDetail.detail.imaging_results}</p>
                </CardContent>
              </Card>
            )}

            {/* Images */}
            {caseDetail.images && caseDetail.images.length > 0 && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">影像资料</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {caseDetail.images.map((img, index) => (
                      <div key={index} className="space-y-2">
                        <img
                          src={img.image_url}
                          alt={img.image_description || img.image_type}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <p className="text-xs text-gray-600">{img.image_description || img.image_type}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Diagnosis */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-blue-900">诊断</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700">
                <p className="font-semibold">{caseDetail.diagnosis}</p>
                {caseDetail.detail?.diagnosis_basis && (
                  <p className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                    {caseDetail.detail.diagnosis_basis}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Treatment Plan */}
            {caseDetail.detail?.treatment_plan && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">治疗方案</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="whitespace-pre-wrap text-gray-700">
                    {caseDetail.detail.treatment_plan}
                  </div>
                  {caseDetail.detail.medications && caseDetail.detail.medications.length > 0 && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="font-semibold text-gray-900 mb-2">药物治疗:</p>
                      <ul className="space-y-1 text-gray-700 pl-5 list-disc">
                        {caseDetail.detail.medications.map((med, index) => (
                          <li key={index}>{med}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Prognosis */}
            {caseDetail.detail?.prognosis && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">预后</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 leading-relaxed">
                  <p className="whitespace-pre-wrap">{caseDetail.detail.prognosis}</p>
                </CardContent>
              </Card>
            )}

            {/* Clinical Notes */}
            {caseDetail.detail?.clinical_notes && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">临床笔记</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 leading-relaxed">
                  <p className="whitespace-pre-wrap">{caseDetail.detail.clinical_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Related Info */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Case Stats */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-sm font-bold">病例信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">疾病类型</span>
                  <span className="font-medium">{caseDetail.disease_type}</span>
                </div>
                {caseDetail.category && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">分类</span>
                    <span className="font-medium">{caseDetail.category}</span>
                  </div>
                )}
                {caseDetail.is_classic && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">标记</span>
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">经典病例</span>
                  </div>
                )}
                {caseDetail.view_count !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">浏览次数</span>
                    <span className="font-medium">{caseDetail.view_count}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Symptoms */}
            {caseDetail.symptoms && caseDetail.symptoms.length > 0 && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">关键症状</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {caseDetail.symptoms.map((symptom) => (
                    <div
                      key={symptom.symptom_id}
                      className={`p-2 rounded-lg ${symptom.is_key_symptom ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}
                    >
                      <p className="text-sm font-medium text-gray-900">{symptom.symptom_name}</p>
                      {symptom.symptom_description && (
                        <p className="text-xs text-gray-600 mt-1">{symptom.symptom_description}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {caseDetail.tags && caseDetail.tags.length > 0 && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">标签</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {caseDetail.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button className="w-full bg-[#D94527] hover:bg-[#C23E21] text-white">应用到当前患者</Button>
              <Button variant="outline" className="w-full">
                加入对比列表
              </Button>
              <Button variant="outline" className="w-full">
                导出病例
              </Button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
