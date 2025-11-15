"use client";

import { ArrowLeft, Star, Share2, Link as LinkIcon, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KnowledgeDetailViewProps {
  knowledgeId: string;
  onBack: () => void;
}

export function KnowledgeDetailView({ knowledgeId, onBack }: KnowledgeDetailViewProps) {
  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 px-8 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                返回知识库
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">类风湿关节炎诊断标准</h1>
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
                <LinkIcon className="h-4 w-4 mr-2" />
                引用
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          <div className="grid grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-8 space-y-5">
            {/* Overview */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold">定义与概述</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  类风湿关节炎（Rheumatoid Arthritis, RA）是一种以侵蚀性、对称性多关节炎为主要临床表现的慢性全身性自身免疫性疾病。
                  主要累及手、足小关节，可导致关节畸形及功能丧失。
                </p>
                <p className="text-gray-700 leading-relaxed mt-3">
                  全球患病率约为0.5-1%，女性多于男性（约3:1），可发生于任何年龄，以40-60岁最为常见。
                </p>
              </CardContent>
            </Card>

            {/* Diagnostic Criteria */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold">2010 ACR/EULAR分类标准</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">评分≥6分可分类为确定的RA</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">项目</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">标准</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-900">评分</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900" rowSpan={4}>
                          受累关节
                        </td>
                        <td className="px-4 py-3 text-gray-700">1个大关节</td>
                        <td className="px-4 py-3 text-center text-gray-700">0</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-700">2-10个大关节</td>
                        <td className="px-4 py-3 text-center text-gray-700">1</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-700">1-3个小关节</td>
                        <td className="px-4 py-3 text-center text-gray-700">2</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-700">4-10个小关节</td>
                        <td className="px-4 py-3 text-center text-gray-700">3</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900" rowSpan={4}>
                          血清学
                        </td>
                        <td className="px-4 py-3 text-gray-700">RF和抗CCP均阴性</td>
                        <td className="px-4 py-3 text-center text-gray-700">0</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-700">RF或抗CCP低滴度阳性</td>
                        <td className="px-4 py-3 text-center text-gray-700">2</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-700">RF或抗CCP高滴度阳性</td>
                        <td className="px-4 py-3 text-center text-gray-700">3</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900" rowSpan={2}>
                          急性期反应物
                        </td>
                        <td className="px-4 py-3 text-gray-700">ESR和CRP均正常</td>
                        <td className="px-4 py-3 text-center text-gray-700">0</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-700">ESR或CRP升高</td>
                        <td className="px-4 py-3 text-center text-gray-700">1</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-gray-900" rowSpan={2}>
                          病程
                        </td>
                        <td className="px-4 py-3 text-gray-700">&lt;6周</td>
                        <td className="px-4 py-3 text-center text-gray-700">0</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-gray-700">≥6周</td>
                        <td className="px-4 py-3 text-center text-gray-700">1</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Treatment */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold">治疗方案</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">一、改善病情抗风湿药（DMARDs）</h4>
                  <ul className="space-y-2 text-sm text-gray-700 pl-5 list-disc">
                    <li>
                      <span className="font-medium">甲氨蝶呤（MTX）:</span>{" "}
                      首选一线药物，7.5-25mg/周，口服或注射
                    </li>
                    <li>
                      <span className="font-medium">来氟米特:</span> 10-20mg/日，口服
                    </li>
                    <li>
                      <span className="font-medium">羟氯喹:</span> 200-400mg/日，口服
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">二、生物制剂</h4>
                  <ul className="space-y-2 text-sm text-gray-700 pl-5 list-disc">
                    <li>
                      <span className="font-medium">TNF-α抑制剂:</span>{" "}
                      依那西普、阿达木单抗、英夫利昔单抗
                    </li>
                    <li>
                      <span className="font-medium">IL-6受体抑制剂:</span> 托珠单抗
                    </li>
                    <li>
                      <span className="font-medium">B细胞清除剂:</span> 利妥昔单抗
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">三、非甾体抗炎药（NSAIDs）</h4>
                  <p className="text-sm text-gray-700">用于缓解疼痛和炎症，不能改变病程</p>
                </div>
              </CardContent>
            </Card>

            {/* Monitoring */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-yellow-900">注意事项</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-700">
                <p>• 使用MTX期间需定期监测肝肾功能、血常规</p>
                <p>• 使用羟氯喹需定期眼科检查</p>
                <p>• 生物制剂使用前需排除结核、乙肝等感染</p>
                <p>• 长期使用糖皮质激素需注意骨质疏松、感染等风险</p>
              </CardContent>
            </Card>

            {/* References */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold">参考文献</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-700">
                <p>
                  1. Aletaha D, Neogi T, Silman AJ, et al. 2010 Rheumatoid arthritis classification criteria: an
                  American College of Rheumatology/European League Against Rheumatism collaborative initiative.
                  Arthritis Rheum. 2010;62(9):2569-2581.
                </p>
                <p>
                  2. Smolen JS, Landewé RBM, Bijlsma JWJ, et al. EULAR recommendations for the management of
                  rheumatoid arthritis with synthetic and biological disease-modifying antirheumatic drugs: 2019
                  update. Ann Rheum Dis. 2020;79(6):685-699.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* AI Knowledge Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  AI知识要点
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-900 mb-2">诊断关键点:</p>
                  <ul className="space-y-1 text-gray-700 pl-4 list-disc">
                    <li>对称性多关节炎</li>
                    <li>晨僵≥1小时</li>
                    <li>血清学阳性</li>
                    <li>病程≥6周</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-blue-200">
                  <p className="font-semibold text-gray-900 mb-2">治疗原则:</p>
                  <ul className="space-y-1 text-gray-700 pl-4 list-disc">
                    <li>早期诊断、早期治疗</li>
                    <li>达标治疗（T2T）</li>
                    <li>个体化方案</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Related Knowledge */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-sm font-bold">相关知识</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { id: 1, title: "甲氨蝶呤使用指南", category: "药物" },
                  { id: 2, title: "系统性红斑狼疮", category: "疾病" },
                  { id: 3, title: "关节超声检查", category: "检查" },
                ].map((item) => (
                  <button
                    key={item.id}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{item.category}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Related Cases */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-sm font-bold">相关病例</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { id: "#0234", diagnosis: "类风湿关节炎" },
                  { id: "#0156", diagnosis: "未分化关节炎" },
                ].map((caseItem) => (
                  <button
                    key={caseItem.id}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-900">病例 {caseItem.id}</span>
                    </div>
                    <p className="text-sm text-gray-600">{caseItem.diagnosis}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Related Drugs */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-sm font-bold">相关药物</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {["甲氨蝶呤", "依那西普", "托珠单抗"].map((drug) => (
                  <button
                    key={drug}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-900"
                  >
                    {drug}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
