"use client";

 

import { useState, useEffect } from "react";

import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {

  ChevronDown,

  ChevronUp,

  Calendar,

  TrendingUp,

  CheckCircle2,

  XCircle,

  AlertCircle

} from "lucide-react";

import carePlanService from "@/services/carePlanService";

import type { WeeklyProgressResponse } from "@/types/carePlan";

 

interface CarePlanCompletionStatsProps {

  patientId: number;

  planId: number;

}

 

export function CarePlanCompletionStats({ patientId, planId }: CarePlanCompletionStatsProps) {

  const [expanded, setExpanded] = useState(false);

  const [loading, setLoading] = useState(false);

  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressResponse | null>(null);

 

  useEffect(() => {

    if (expanded && !weeklyProgress) {

      loadWeeklyProgress();

    }

  }, [expanded]);

 

  const loadWeeklyProgress = async () => {

    try {

      setLoading(true);

      const progress = await carePlanService.getWeeklyProgress(patientId);

      setWeeklyProgress(progress);

    } catch (error) {

      console.error("Failed to load weekly progress:", error);

    } finally {

      setLoading(false);

    }

  };

 

  const getTodayCompletionRate = () => {

    if (!weeklyProgress?.daily_stats?.length) return null;

 

    const today = new Date().toISOString().split('T')[0];

    const todayStats = weeklyProgress.daily_stats.find(stat => stat.date === today);

 

    if (!todayStats) return null;

 

    const total = todayStats.total_items;

    const completed = todayStats.completed_items;

    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

 

    return { rate, completed, total };

  };

 

  const getCompletionStatus = (rate: number) => {

    if (rate >= 80) return { color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2, label: "完成良好" };

    if (rate >= 50) return { color: "text-yellow-600", bg: "bg-yellow-50", icon: AlertCircle, label: "部分完成" };

    return { color: "text-red-600", bg: "bg-red-50", icon: XCircle, label: "完成较少" };

  };

 

  const todayCompletion = getTodayCompletionRate();

 

  return (

    <div className="mt-4 pt-4 border-t border-gray-100">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-4">

          <span className="text-sm font-medium text-gray-700">患者完成情况</span>

 

          {todayCompletion ? (

            <div className="flex items-center gap-2">

              {(() => {

                const status = getCompletionStatus(todayCompletion.rate);

                const Icon = status.icon;

                return (

                  <>

                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${status.bg}`}>

                      <Icon className={`h-4 w-4 ${status.color}`} />

                      <span className={`text-xs font-medium ${status.color}`}>

                        今日 {todayCompletion.rate}%

                      </span>

                    </div>

                    <span className="text-xs text-gray-500">

                      ({todayCompletion.completed}/{todayCompletion.total} 项)

                    </span>

                  </>

                );

              })()}

            </div>

          ) : (

            <span className="text-xs text-gray-400">暂无今日数据</span>

          )}

        </div>

 

        <Button

          variant="ghost"

          size="sm"

          onClick={() => setExpanded(!expanded)}

          className="text-gray-600 hover:text-[#FF4D4F]"

        >

          {expanded ? (

            <>

              收起详情 <ChevronUp className="h-4 w-4 ml-1" />

            </>

          ) : (

            <>

              查看详情 <ChevronDown className="h-4 w-4 ml-1" />

            </>

          )}

        </Button>

      </div>

 

      {expanded && (

        <div className="mt-4 space-y-4">

          {loading ? (

            <div className="text-center py-8 text-gray-500">加载中...</div>

          ) : weeklyProgress ? (

            <>

              {/* Weekly Summary */}

              <div className="grid grid-cols-3 gap-4">

                <Card className="bg-blue-50 border-blue-200">

                  <CardContent className="p-4">

                    <div className="text-xs text-blue-600 mb-1">整体完成率</div>

                    <div className="text-2xl font-bold text-blue-700">

                      {weeklyProgress.overall_completion_rate || 0}%

                    </div>

                  </CardContent>

                </Card>

 

                <Card className="bg-green-50 border-green-200">

                  <CardContent className="p-4">

                    <div className="text-xs text-green-600 mb-1">用药依从性</div>

                    <div className="text-2xl font-bold text-green-700">

                      {weeklyProgress.medication_compliance_rate || 0}%

                    </div>

                  </CardContent>

                </Card>

 

                <Card className="bg-orange-50 border-orange-200">

                  <CardContent className="p-4">

                    <div className="text-xs text-orange-600 mb-1">任务完成率</div>

                    <div className="text-2xl font-bold text-orange-700">

                      {weeklyProgress.task_completion_rate || 0}%

                    </div>

                  </CardContent>

                </Card>

              </div>

 

              {/* Daily Breakdown */}

              {weeklyProgress.daily_stats && weeklyProgress.daily_stats.length > 0 && (

                <div className="space-y-2">

                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">

                    <Calendar className="h-4 w-4" />

                    最近7天完成情况

                  </div>

 

                  <div className="space-y-2">

                    {weeklyProgress.daily_stats.map((dayStat, index) => {

                      const rate = dayStat.total_items > 0

                        ? Math.round((dayStat.completed_items / dayStat.total_items) * 100)

                        : 0;

                      const isToday = dayStat.date === new Date().toISOString().split('T')[0];

 

                      return (

                        <div

                          key={index}

                          className={`flex items-center gap-3 p-3 rounded-lg border ${

                            isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'

                          }`}

                        >

                          <div className="flex-shrink-0 w-24">

                            <div className="text-xs font-medium text-gray-900">

                              {new Date(dayStat.date).toLocaleDateString('zh-CN', {

                                month: 'short',

                                day: 'numeric',

                                weekday: 'short'

                              })}

                            </div>

                            {isToday && (

                              <div className="text-xs text-blue-600">今天</div>

                            )}

                          </div>

 

                          <div className="flex-1">

                            <div className="flex items-center gap-2 mb-1">

                              <div className="flex-1 bg-gray-200 rounded-full h-2">

                                <div

                                  className={`h-2 rounded-full transition-all ${

                                    rate >= 80 ? 'bg-green-500' :

                                    rate >= 50 ? 'bg-yellow-500' :

                                    'bg-red-500'

                                  }`}

                                  style={{ width: `${rate}%` }}

                                />

                              </div>

                              <span className="text-sm font-semibold text-gray-900 w-12 text-right">

                                {rate}%

                              </span>

                            </div>

                            <div className="text-xs text-gray-500">

                              完成 {dayStat.completed_items} / {dayStat.total_items} 项

                              {dayStat.medication_completed !== undefined && (

                                <span className="ml-2">

                                  · 用药 {dayStat.medication_completed}/{dayStat.medication_total || 0}

                                </span>

                              )}

                              {dayStat.task_completed !== undefined && (

                                <span className="ml-2">

                                  · 任务 {dayStat.task_completed}/{dayStat.task_total || 0}

                                </span>

                              )}

                            </div>

                          </div>

                        </div>

                      );

                    })}

                  </div>

                </div>

              )}

 

              {/* Completion Chart */}

              {weeklyProgress.completion_chart && weeklyProgress.completion_chart.length > 0 && (

                <div className="space-y-2">

                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">

                    <TrendingUp className="h-4 w-4" />

                    完成率趋势

                  </div>

 

                  <div className="flex items-end justify-between gap-2 h-32 px-2">

                    {weeklyProgress.completion_chart.map((point, index) => {

                      const height = point.completion_rate || 0;

                      return (

                        <div key={index} className="flex-1 flex flex-col items-center gap-1">

                          <div className="text-xs text-gray-600 font-medium">

                            {height}%

                          </div>

                          <div className="w-full bg-gray-200 rounded-t relative" style={{ height: '100%' }}>

                            <div

                              className={`absolute bottom-0 w-full rounded-t transition-all ${

                                height >= 80 ? 'bg-green-500' :

                                height >= 50 ? 'bg-yellow-500' :

                                'bg-red-500'

                              }`}

                              style={{ height: `${height}%` }}

                            />

                          </div>

                          <div className="text-xs text-gray-500">

                            {new Date(point.date).toLocaleDateString('zh-CN', {

                              month: 'numeric',

                              day: 'numeric'

                            })}

                          </div>

                        </div>

                      );

                    })}

                  </div>

                </div>

              )}

            </>

          ) : (

            <div className="text-center py-8 text-gray-500">暂无数据</div>

          )}

        </div>

      )}

    </div>

  );

}