"use client";

import { ArrowLeft, Star, Share2, GitCompare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CaseDetailViewProps {
  caseId: string;
  onBack: () => void;
}

export function CaseDetailView({ caseId, onBack }: CaseDetailViewProps) {
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
              <h1 className="text-2xl font-bold text-gray-900">病例 #0234 - 类风湿关节炎</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Star className="h-4 w-4 mr-2" />
                收藏
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
                    <span className="ml-2 font-medium">女</span>
                  </div>
                  <div>
                    <span className="text-gray-500">年龄:</span>
                    <span className="ml-2 font-medium">58岁</span>
                  </div>
                  <div>
                    <span className="text-gray-500">病例编号:</span>
                    <span className="ml-2 font-medium">#0234</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm">
                    <span className="font-semibold text-gray-700">主诉:</span>
                    <span className="ml-2 text-gray-600">双膝关节肿痛3个月，伴晨僵</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Medical History */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold">现病史</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 leading-relaxed space-y-3">
                <p>
                  患者3个月前无明显诱因出现双膝关节肿痛，以晨起明显，伴晨僵约1小时，
                  活动后可缓解。关节肿胀逐渐加重，影响日常活动。无发热、皮疹等症状。
                </p>
                <p>曾在当地医院就诊，诊断为"骨关节炎"，给予非甾体抗炎药治疗，效果不佳。</p>
              </CardContent>
            </Card>

            {/* Physical Examination */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold">体格检查</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-2">
                <p>
                  <span className="font-semibold">一般情况:</span> 神志清楚，精神可，营养中等
                </p>
                <p>
                  <span className="font-semibold">关节检查:</span>{" "}
                  双膝关节肿胀明显，局部皮温升高，压痛(+)，浮髌试验(+)，活动受限
                </p>
                <p>
                  <span className="font-semibold">双手:</span> 掌指关节轻度肿胀，无晨僵
                </p>
              </CardContent>
            </Card>

            {/* Laboratory Tests */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold">实验室检查</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">RF (类风湿因子)</span>
                      <span className="font-semibold text-red-600">126 IU/mL ↑</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">抗CCP抗体</span>
                      <span className="font-semibold text-red-600">158 U/mL ↑</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ESR (血沉)</span>
                      <span className="font-semibold text-red-600">45 mm/h ↑</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">CRP (C反应蛋白)</span>
                      <span className="font-semibold text-red-600">28 mg/L ↑</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ANA</span>
                      <span className="font-semibold text-gray-900">阴性</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">血常规</span>
                      <span className="font-semibold text-gray-900">正常</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Imaging */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold">影像学检查</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-2">
                <p>
                  <span className="font-semibold">双膝X线:</span>{" "}
                  关节间隙轻度狭窄，软骨下骨轻度硬化，未见明显骨质破坏
                </p>
                <p>
                  <span className="font-semibold">双手X线:</span> 未见明显异常
                </p>
              </CardContent>
            </Card>

            {/* Diagnosis */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-blue-900">诊断</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700">
                <p className="font-semibold">类风湿关节炎 (Rheumatoid Arthritis)</p>
                <p className="mt-2 text-xs text-gray-600">
                  根据2010 ACR/EULAR类风湿关节炎分类标准，患者符合诊断标准（评分≥6分）
                </p>
              </CardContent>
            </Card>

            {/* Treatment Plan */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold">治疗方案</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-900 mb-2">药物治疗:</p>
                  <ul className="space-y-1 text-gray-700 pl-5 list-disc">
                    <li>甲氨蝶呤 (Methotrexate) 15mg 口服，每周一次</li>
                    <li>叶酸 5mg 口服，每日一次（避开甲氨蝶呤当天）</li>
                    <li>塞来昔布 200mg 口服，每日两次</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-2">监测:</p>
                  <ul className="space-y-1 text-gray-700 pl-5 list-disc">
                    <li>每2周复查肝功能、肾功能、血常规</li>
                    <li>每月评估疾病活动度</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Prognosis */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold">预后</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 leading-relaxed">
                <p>
                  患者接受规范化治疗后，症状明显改善。3个月后复查，关节肿痛基本消失，
                  晨僵时间缩短至15分钟，RF、ESR、CRP均明显下降。继续维持治疗，
                  定期随访，预后良好。
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - AI Analysis & Related Cases */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* AI Analysis */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-purple-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  AI辅助分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <div>
                  <p className="font-semibold text-gray-900 mb-2">诊断要点提取:</p>
                  <ul className="space-y-1 text-gray-700 pl-4 list-disc">
                    <li>双侧对称性关节肿痛</li>
                    <li>晨僵时间 &gt; 1小时</li>
                    <li>RF阳性 + 抗CCP阳性</li>
                    <li>炎症指标升高</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-purple-200">
                  <p className="font-semibold text-gray-900 mb-2">鉴别诊断思路:</p>
                  <ul className="space-y-1 text-gray-700 pl-4 list-disc">
                    <li>骨关节炎 - 已排除</li>
                    <li>系统性红斑狼疮 - ANA阴性</li>
                    <li>强直性脊柱炎 - 无脊柱症状</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-purple-200">
                  <p className="font-semibold text-gray-900 mb-2">治疗方案分析:</p>
                  <p className="text-gray-700">
                    MTX作为一线DMARDs，联合NSAIDs控制症状，
                    方案合理。需注意MTX的肝毒性，定期监测必要。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Related Cases */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-sm font-bold">相似病例推荐</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { id: "#0156", similarity: 82, match: "相似症状表现" },
                  { id: "#0189", similarity: 78, match: "类似治疗方案" },
                  { id: "#0201", similarity: 75, match: "相同年龄段患者" },
                ].map((relatedCase) => (
                  <div
                    key={relatedCase.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">病例 {relatedCase.id}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {relatedCase.similarity}% 相似
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{relatedCase.match}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

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
