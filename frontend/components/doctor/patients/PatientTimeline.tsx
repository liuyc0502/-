"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TestTube, Pill, Filter, ArrowUpDown, ArrowDown, CheckCircle, AlertCircle, Image as ImageIcon, Download } from "lucide-react";

interface PatientTimelineProps {

  patientId: string;

}

 

// Timeline stages data

const timelineStages = [

  { id: 1, label: "初诊", date: "2024-10-01", status: "completed" },

  { id: 2, label: "检查", date: "2024-10-05", status: "completed" },

  { id: 3, label: "确诊", date: "2024-10-10", status: "completed" },

  { id: 4, label: "治疗中", date: "2024-11-14", status: "current" },

  { id: 5, label: "随访", date: "待定", status: "pending" },

];

 

// Detailed data for each timeline point

const timelineDetails: Record<number, any> = {

  1: {

    title: "初诊",

    date: "2024-10-01",

    diagnosis: "疑似类风湿关节炎",

    images: [

      { id: 1, type: "临床照片", label: "双膝关节红肿", url: "https://placehold.co/400x300/e0e7ff/4f46e5?text=Knee+Swelling" },

      { id: 2, type: "X光片", label: "双膝关节X光", url: "https://placehold.co/400x300/fef3c7/d97706?text=X-Ray" },

    ],

    metrics: [

      { name: "ESR", fullName: "血沉", value: 45, unit: "mm/h", trend: "high", percentage: 90, status: "warning" },

      { name: "CRP", fullName: "C反应蛋白", value: 18, unit: "mg/L", trend: "high", percentage: 85, status: "warning" },

      { name: "RF", fullName: "类风湿因子", value: "阳性", unit: "", trend: "abnormal", percentage: 100, status: "error" },

      { name: "抗CCP", fullName: "抗CCP抗体", value: "阳性", unit: "", trend: "abnormal", percentage: 100, status: "error" },

    ],

    medications: ["布洛芬 400mg 每日3次", "暂未启动DMARD治疗"],

    notes: "患者主诉双膝关节肿痛2周，晨僵明显，持续约2小时。查体：双膝关节肿胀、压痛，活动受限。建议进一步检查明确诊断。",

    pathologyFindings: "初诊阶段，尚未进行病理活检。影像学检查显示双膝关节软组织肿胀，关节间隙未见明显狭窄。",

    attachments: [

      { name: "初诊病历.pdf", type: "pdf" },

      { name: "X光片.dcm", type: "dicom" },

    ],

  },

  2: {

    title: "检查",

    date: "2024-10-05",

    diagnosis: "类风湿关节炎（待确诊）",

    images: [

      { id: 1, type: "病理切片", label: "滑膜组织HE染色", url: "https://placehold.co/400x300/ddd6fe/7c3aed?text=Pathology+Slide+1" },

      { id: 2, type: "病理切片", label: "滑膜增生×200", url: "https://placehold.co/400x300/fce7f3/be185d?text=Pathology+Slide+2" },

      { id: 3, type: "病理切片", label: "炎性细胞浸润×400", url: "https://placehold.co/400x300/cffafe/0891b2?text=Pathology+Slide+3" },

      { id: 4, type: "MRI", label: "双膝关节MRI", url: "https://placehold.co/400x300/e0f2fe/0369a1?text=MRI" },

    ],

    metrics: [

      { name: "ESR", fullName: "血沉", value: 38, unit: "mm/h", trend: "down", percentage: 75, status: "warning" },

      { name: "CRP", fullName: "C反应蛋白", value: 12, unit: "mg/L", trend: "down", percentage: 60, status: "warning" },

      { name: "RF", fullName: "类风湿因子", value: "阳性", unit: "", trend: "abnormal", percentage: 100, status: "error" },

      { name: "抗CCP", fullName: "抗CCP抗体", value: "强阳性", unit: "", trend: "abnormal", percentage: 100, status: "error" },

    ],

    medications: ["布洛芬 400mg 每日3次", "等待病理结果"],

    notes: "患者症状持续，完成滑膜组织活检及全面实验室检查。患者诉晨僵时间略有缩短至1.5小时，但关节肿痛无明显改善。",

    pathologyFindings: "滑膜组织病理学检查：滑膜明显增生，衬里细胞层增厚（3-5层），血管翳形成，大量淋巴细胞、浆细胞浸润，符合类风湿关节炎病理改变。",

    attachments: [

      { name: "病理报告.pdf", type: "pdf" },

      { name: "检查单汇总.xlsx", type: "excel" },

      { name: "MRI影像.zip", type: "zip" },

    ],

  },

  3: {

    title: "确诊",

    date: "2024-10-10",

    diagnosis: "类风湿关节炎（确诊）",

    images: [

      { id: 1, type: "病理切片", label: "滑膜血管翳", url: "https://placehold.co/400x300/f3e8ff/9333ea?text=Pannus" },

      { id: 2, type: "临床照片", label: "治疗前关节状态", url: "https://placehold.co/400x300/fef3c7/ca8a04?text=Before+Treatment" },

    ],

    metrics: [

      { name: "ESR", fullName: "血沉", value: 38, unit: "mm/h", trend: "stable", percentage: 75, status: "warning" },

      { name: "CRP", fullName: "C反应蛋白", value: 12, unit: "mg/L", trend: "stable", percentage: 60, status: "warning" },

      { name: "RF", fullName: "类风湿因子", value: "阳性", unit: "", trend: "abnormal", percentage: 100, status: "error" },

      { name: "肝功能", fullName: "肝功能", value: "正常", unit: "", trend: "normal", percentage: 0, status: "success" },

    ],

    medications: ["甲氨蝶呤 10mg 每周1次", "叶酸 5mg 每日1次", "布洛芬 400mg 按需"],

    notes: "综合病理结果及临床表现，明确诊断为类风湿关节炎。向患者及家属详细解释病情，制定治疗方案，启动甲氨蝶呤治疗。强调定期复查肝肾功能的重要性。",

    pathologyFindings: "综合病理诊断：类风湿关节炎。病理特征包括滑膜衬里细胞增生、血管翳形成、慢性炎性细胞浸润（以淋巴细胞和浆细胞为主）。免疫组化：CD3(+), CD20(+)，提示T细胞和B细胞共同参与。",

    attachments: [

      { name: "确诊报告.pdf", type: "pdf" },

      { name: "治疗方案.pdf", type: "pdf" },

      { name: "患者教育资料.pdf", type: "pdf" },

    ],

  },

  4: {

    title: "治疗中",

    date: "2024-11-14",

    diagnosis: "类风湿关节炎（治疗中）",

    images: [

      { id: 1, type: "临床照片", label: "治疗后关节改善", url: "https://placehold.co/400x300/d1fae5/10b981?text=Improved" },

      { id: 2, type: "超声", label: "关节超声", url: "https://placehold.co/400x300/dbeafe/3b82f6?text=Ultrasound" },

    ],

    metrics: [

      { name: "ESR", fullName: "血沉", value: 25, unit: "mm/h", trend: "down", percentage: 50, status: "improving" },

      { name: "CRP", fullName: "C反应蛋白", value: 8, unit: "mg/L", trend: "down", percentage: 40, status: "improving" },

      { name: "RF", fullName: "类风湿因子", value: "阳性", unit: "", trend: "stable", percentage: 100, status: "warning" },

      { name: "肝功能", fullName: "肝功能", value: "正常", unit: "", trend: "normal", percentage: 0, status: "success" },

    ],

    medications: ["甲氨蝶呤 15mg 每周1次（已调整）", "叶酸 5mg 每日1次", "布洛芬 400mg 按需"],

    notes: "患者治疗4周后复查，症状明显改善。晨僵时间缩短至30分钟，关节肿痛减轻。炎症指标下降显著。鉴于疗效良好但仍未达标，调整甲氨蝶呤剂量至15mg/周。",

    pathologyFindings: "本次复查未进行病理检查。影像学检查显示关节滑膜厚度较前减少，积液减少，提示炎症得到控制。",

    attachments: [

      { name: "复查报告.pdf", type: "pdf" },

      { name: "用药调整记录.pdf", type: "pdf" },

    ],

  },

  5: {

    title: "随访",

    date: "待定",

    diagnosis: "待随访",

    images: [],

    metrics: [],

    medications: [],

    notes: "尚未进行随访，请按时复诊。",

    pathologyFindings: "暂无",

    attachments: [],

  },

};

 

export function PatientTimeline({ patientId }: PatientTimelineProps) {

  const [selectedStageId, setSelectedStageId] = useState<number>(2); // Default to stage 2 (检查)

 

  const selectedDetail = timelineDetails[selectedStageId];

 

  const handleStageClick = (stageId: number) => {

    // Don't allow clicking on pending stages

    const stage = timelineStages.find((s) => s.id === stageId);

    if (stage?.status !== "pending") {

      setSelectedStageId(stageId);

    }

  };

 

  return (

    <div className="space-y-6">

      {/* Timeline Progress Bar - Always visible */}

      <Card className="bg-white border-gray-200">

        <CardContent className="p-6">

          <div className="flex items-center justify-between mb-6">

            <h2 className="text-xl font-bold text-gray-900">张三的就诊历程</h2>

            <Button variant="outline" size="sm" className="text-gray-600">

              <Filter className="h-4 w-4 mr-2" />

              筛选时间

            </Button>

          </div>

 

          <div className="relative flex items-center justify-between">

            {timelineStages.map((stage, index) => {

              const isSelected = selectedStageId === stage.id;

              const isClickable = stage.status !== "pending";

 

              return (

                <div key={stage.id} className="flex flex-col items-center relative z-10">

                  <button

                    onClick={() => handleStageClick(stage.id)}

                    disabled={!isClickable}

                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all ${

                      isSelected

                        ? "bg-[#D94527] text-white ring-4 ring-[#D94527]/30 scale-110"

                        : stage.status === "completed"

                        ? "bg-green-500 text-white hover:scale-105 cursor-pointer"

                        : stage.status === "current"

                        ? "bg-blue-500 text-white hover:scale-105 cursor-pointer"

                        : "bg-gray-200 text-gray-500 border-2 border-gray-300 cursor-not-allowed"

                    }`}

                  >

                    {stage.status === "completed" ? "✓" : stage.id}

                  </button>

                  <div className="mt-3 text-center">

                    <div className={`text-sm font-semibold ${isSelected ? "text-[#D94527]" : "text-gray-900"}`}>

                      {stage.label}

                    </div>

                    <div className="text-xs text-gray-500 mt-1">{stage.date}</div>

                  </div>

                  {index < timelineStages.length - 1 && (

                    <div

                      className={`absolute top-6 left-1/2 w-full h-0.5 ${

                        stage.status === "completed" ? "bg-green-500" : "bg-gray-200"

                      }`}

                      style={{ transform: "translateX(50%)" }}

                    />

                  )}

                </div>

              );

            })}

          </div>

        </CardContent>

      </Card>

 

      {/* Detail Content Area - Changes based on selected stage */}

      {selectedDetail.images.length > 0 || selectedDetail.metrics.length > 0 ? (

        <div className="space-y-6">

          {/* Header */}

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-2xl font-bold text-gray-900">{selectedDetail.title} 阶段详情</h3>

              <p className="text-sm text-gray-500 mt-1">{selectedDetail.date} | {selectedDetail.diagnosis}</p>

            </div>

          </div>

 

          {/* Top Section: Image Gallery (70%) + Key Info (30%) */}

          <div className="grid grid-cols-12 gap-6">

            {/* Left: Image Gallery */}

            <div className="col-span-12 lg:col-span-8">

              <Card className="bg-white border-gray-200 h-full">

                <CardHeader>

                  <CardTitle className="text-sm font-bold flex items-center gap-2">

                    <ImageIcon className="h-4 w-4 text-[#D94527]" />

                    影像资料

                  </CardTitle>

                </CardHeader>

                <CardContent>

                  <div className="flex gap-4 overflow-x-auto pb-2">

                    {selectedDetail.images.map((image: any) => (

                      <div

                        key={image.id}

                        className="flex-shrink-0 w-64 group cursor-pointer"

                      >

                        <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-[#D94527] transition-colors">

                          <img

                            src={image.url}

                            alt={image.label}

                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform"

                          />

                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">

                            <div className="text-xs text-white/90 font-medium">{image.type}</div>

                            <div className="text-sm text-white font-semibold">{image.label}</div>

                          </div>

                        </div>

                      </div>

                    ))}

                  </div>

                  <p className="text-xs text-gray-500 mt-3">点击图片可放大查看</p>

                </CardContent>

              </Card>

            </div>

 

            {/* Right: Key Info */}

            <div className="col-span-12 lg:col-span-4">

              <Card className="bg-white border-gray-200 h-full">

                <CardHeader>

                  <CardTitle className="text-sm font-bold">关键信息</CardTitle>

                </CardHeader>

                <CardContent className="space-y-4 text-sm">

                  <div>

                    <div className="flex items-center gap-2 mb-2">

                      <FileText className="h-4 w-4 text-gray-400" />

                      <span className="font-semibold text-gray-700">诊断:</span>

                    </div>

                    <p className="text-gray-900 ml-6">{selectedDetail.diagnosis}</p>

                  </div>

 

                  <div>

                    <div className="flex items-center gap-2 mb-2">

                      <Pill className="h-4 w-4 text-green-600" />

                      <span className="font-semibold text-gray-700">用药方案:</span>

                    </div>

                    <ul className="space-y-1 text-gray-600 ml-6">

                      {selectedDetail.medications.map((med: string, idx: number) => (

                        <li key={idx} className="text-sm">• {med}</li>

                      ))}

                    </ul>

                  </div>

 

                  {selectedDetail.attachments.length > 0 && (

                    <div className="pt-3 border-t border-gray-100">

                      <div className="flex items-center gap-2 mb-2">

                        <Download className="h-4 w-4 text-gray-400" />

                        <span className="font-semibold text-gray-700">附件:</span>

                      </div>

                      <div className="space-y-2 ml-6">

                        {selectedDetail.attachments.map((file: any, idx: number) => (

                          <button

                            key={idx}

                            className="flex items-center gap-2 text-xs text-[#D94527] hover:underline"

                          >

                            <FileText className="h-3 w-3" />

                            {file.name}

                          </button>

                        ))}

                      </div>

                    </div>

                  )}

                </CardContent>

              </Card>

            </div>

          </div>

 

          {/* Middle Section: Metrics Cards (Horizontal) */}

          {selectedDetail.metrics.length > 0 && (

            <Card className="bg-white border-gray-200">

              <CardHeader>

                <CardTitle className="text-sm font-bold flex items-center gap-2">

                  <TestTube className="h-4 w-4 text-[#D94527]" />

                  检查指标详情

                </CardTitle>

              </CardHeader>

              <CardContent>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                  {selectedDetail.metrics.map((metric: any, idx: number) => (

                    <div

                      key={idx}

                      className={`p-4 rounded-lg border-2 ${

                        metric.status === "error"

                          ? "bg-red-50 border-red-200"

                          : metric.status === "warning"

                          ? "bg-orange-50 border-orange-200"

                          : metric.status === "improving"

                          ? "bg-blue-50 border-blue-200"

                          : "bg-green-50 border-green-200"

                      }`}

                    >

                      <div className="flex items-center justify-between mb-2">

                        <span className="text-xs font-semibold text-gray-500">{metric.name}</span>

                        {metric.trend === "down" && <ArrowDown className="h-4 w-4 text-green-600" />}

                        {metric.trend === "high" && <ArrowUpDown className="h-4 w-4 text-orange-600" />}

                        {metric.trend === "abnormal" && <AlertCircle className="h-4 w-4 text-red-600" />}

                        {metric.trend === "normal" && <CheckCircle className="h-4 w-4 text-green-600" />}

                      </div>

                      <div className="text-xl font-bold text-gray-900 mb-1">

                        {metric.value} {metric.unit}

                      </div>

                      <div className="text-xs text-gray-600 mb-2">{metric.fullName}</div>

                      {metric.percentage > 0 && (

                        <div className="w-full bg-gray-200 rounded-full h-1.5">

                          <div

                            className={`h-1.5 rounded-full ${

                              metric.status === "error"

                                ? "bg-red-500"

                                : metric.status === "warning"

                                ? "bg-orange-500"

                                : metric.status === "improving"

                                ? "bg-blue-500"

                                : "bg-green-500"

                            }`}

                            style={{ width: `${metric.percentage}%` }}

                          />

                        </div>

                      )}

                      <div className="text-xs text-gray-500 mt-1">

                        {metric.status === "error"

                          ? "异常"

                          : metric.status === "warning"

                          ? "偏高"

                          : metric.status === "improving"

                          ? "改善中"

                          : "正常"}

                      </div>

                    </div>

                  ))}

                </div>

              </CardContent>

            </Card>

          )}

 

          {/* Bottom Section: Doctor Notes (50%) + Pathology Findings (50%) */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Doctor Notes */}

            <Card className="bg-white border-gray-200">

              <CardHeader>

                <CardTitle className="text-sm font-bold">👨‍⚕️ 医生观察记录</CardTitle>

              </CardHeader>

              <CardContent>

                <p className="text-sm text-gray-700 leading-relaxed">{selectedDetail.notes}</p>

              </CardContent>

            </Card>

 

            {/* Right: Pathology Findings */}

            <Card className="bg-white border-gray-200">

              <CardHeader>

                <CardTitle className="text-sm font-bold">📸 病理发现</CardTitle>

              </CardHeader>

              <CardContent>

                <p className="text-sm text-gray-700 leading-relaxed">{selectedDetail.pathologyFindings}</p>

              </CardContent>

            </Card>

          </div>

        </div>

      ) : (

        <Card className="bg-gray-50 border-gray-200">

          <CardContent className="p-12 text-center">

            <p className="text-gray-500">该阶段尚未进行，请按时复诊。</p>

          </CardContent>

        </Card>

      )}

    </div>

  );

}