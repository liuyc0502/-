"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, TestTube, Pill, TrendingDown, AlertCircle, Users } from "lucide-react";

interface PatientOverviewProps {
  patientId: string;
}

export function PatientOverview({ patientId }: PatientOverviewProps) {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column - 40% width */}
      <div className="col-span-12 lg:col-span-5 space-y-4">
        {/* Basic Info Card */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">姓名:</span>
                <span className="ml-2 font-medium">张三</span>
              </div>
              <div>
                <span className="text-gray-500">性别:</span>
                <span className="ml-2 font-medium">男</span>
              </div>
              <div>
                <span className="text-gray-500">年龄:</span>
                <span className="ml-2 font-medium">58岁</span>
              </div>
              <div>
                <span className="text-gray-500">病历号:</span>
                <span className="ml-2 font-medium">MR202401001</span>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-semibold text-red-700">过敏史:</span>
                  <span className="ml-2 text-sm text-gray-700">青霉素、头孢类</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm font-semibold text-gray-700">家族史:</span>
                <span className="ml-2 text-sm text-gray-600">父亲有类风湿病史</span>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-sm font-semibold text-gray-700 mb-2">既往病史:</p>
              <ul className="text-sm text-gray-600 space-y-1 pl-4 list-disc">
                <li>2018年确诊类风湿关节炎</li>
                <li>2020年轻度高血压</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* AI Summary Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-blue-600">AI病情总结</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-gray-700 leading-relaxed">
              患者张三，58岁男性，确诊类风湿关节炎6年。目前病情控制良好，
              <span className="bg-yellow-200 px-1 rounded">炎症指标有所升高</span>，
              建议调整用药方案。
            </p>
            <p className="text-gray-700 leading-relaxed">
              <span className="bg-green-200 px-1 rounded">遵医嘱率较好</span>，
              定期复查，关节功能保持稳定。需注意监测肝肾功能。
            </p>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              展开完整分析 →
            </button>
          </CardContent>
        </Card>

        {/* Key Metrics Card */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">15</div>
              <div className="text-sm text-gray-500 mt-1">就诊次数</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-600">3</div>
              <div className="text-sm text-gray-500 mt-1">待办事项</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">90</div>
              <div className="text-sm text-gray-500 mt-1">服药天数</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">5天后</div>
              <div className="text-sm text-gray-500 mt-1">下次复查</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Column - 60% width */}
      <div className="col-span-12 lg:col-span-7 space-y-4">
        {/* Quick Access Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 space-y-3">
              <FileText className="h-8 w-8 text-[#D94527]" />
              <h3 className="font-bold text-gray-900">就诊记录</h3>
              <p className="text-sm text-gray-600">共15次就诊</p>
              <p className="text-sm text-gray-500">最近: 2024-11-10</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 space-y-3">
              <TestTube className="h-8 w-8 text-blue-600" />
              <h3 className="font-bold text-gray-900">检查报告</h3>
              <p className="text-sm text-gray-600">3份待查看</p>
              <p className="text-sm text-red-600 font-medium">最新: 血常规异常</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 space-y-3">
              <Pill className="h-8 w-8 text-green-600" />
              <h3 className="font-bold text-gray-900">用药历史</h3>
              <p className="text-sm text-gray-600">当前3种药物</p>
              <p className="text-sm text-gray-500">遵医嘱率: 85%</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 space-y-3">
              <TrendingDown className="h-8 w-8 text-purple-600" />
              <h3 className="font-bold text-gray-900">健康趋势</h3>
              <p className="text-sm text-green-600">血压↓</p>
              <p className="text-sm text-red-600">炎症指标↑</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities Timeline */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold">最近动态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { date: "2024-11-14", icon: Pill, text: "开始服用甲氨蝶呤", color: "text-green-600" },
                { date: "2024-11-10", icon: TestTube, text: "血常规检查完成", color: "text-blue-600" },
                { date: "2024-11-05", icon: FileText, text: "门诊复查记录", color: "text-purple-600" },
                { date: "2024-11-01", icon: Pill, text: "调整用药剂量", color: "text-orange-600" },
                { date: "2024-10-28", icon: TestTube, text: "肝功能检查正常", color: "text-green-600" },
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500 font-mono w-24 flex-shrink-0">{activity.date}</span>
                  <activity.icon className={`h-5 w-5 ${activity.color} flex-shrink-0`} />
                  <span className="text-gray-700 flex-1">{activity.text}</span>
                  <button className="text-[#D94527] hover:underline text-xs">详情</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks Banner */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <h3 className="font-bold text-yellow-900 mb-3">紧急待办</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-gray-900">完善RF检查</p>
                <p className="text-xs text-gray-500 mt-1">明天截止</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-gray-900">审核影像报告</p>
                <p className="text-xs text-gray-500 mt-1">后天截止</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-gray-900">制定治疗方案</p>
                <p className="text-xs text-gray-500 mt-1">本周内</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
