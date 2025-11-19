"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { App } from "antd";
import { Plus, Calendar, FileText, Pill, Activity, Clock, Edit, Trash2 } from "lucide-react";
import carePlanService from "@/services/carePlanService";
import type { CarePlan } from "@/types/carePlan";
import { CreateCarePlanModal } from "./CreateCarePlanModal";
import { CarePlanCompletionStats } from "./CarePlanCompletionStats";
interface PatientCarePlansProps {
  patientId: string;
}
export function PatientCarePlans({ patientId }: PatientCarePlansProps) {
  const { message, modal } = App.useApp();
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CarePlan | null>(null);
  useEffect(() => {
    loadCarePlans();
  }, [patientId]);
  const loadCarePlans = async () => {
    try {
      setLoading(true);
      const plans = await carePlanService.listCarePlans(parseInt(patientId));
      setCarePlans(plans);
    } catch (error) {
      message.error("加载康复计划失败");
      console.error("Failed to load care plans:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleCreatePlan = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };
  const handleEditPlan = (plan: CarePlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };
  const handleDeletePlan = (plan: CarePlan) => {
    modal.confirm({
      title: "确认删除",
      content: `确定要删除康复计划"${plan.plan_name}"吗？`,
      okText: "确定",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await carePlanService.deleteCarePlan(plan.plan_id);
          message.success("删除成功");
          loadCarePlans();
        } catch (error) {
          message.error("删除失败");
          console.error("Failed to delete care plan:", error);
        }
      },
    });
  };
  const handleModalClose = (shouldRefresh?: boolean) => {
    setIsModalOpen(false);
    setEditingPlan(null);
    if (shouldRefresh) {
      loadCarePlans();
    }
  };
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: "进行中", className: "bg-green-100 text-green-700 border-green-200" },
      completed: { label: "已完成", className: "bg-blue-100 text-blue-700 border-blue-200" },
      paused: { label: "已暂停", className: "bg-gray-100 text-gray-700 border-gray-200" },
    };
    const config = statusMap[status] || statusMap.active;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        {config.label}
      </span>
    );
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">康复计划</h2>
          <p className="text-sm text-gray-500 mt-1">为患者制定和管理康复计划</p>
        </div>
        <Button
          onClick={handleCreatePlan}
          className="bg-[#FF4D4F] hover:bg-[#FF7875] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          创建康复计划
        </Button>
      </div>
      {/* Care Plans List */}
      {carePlans.length === 0 ? (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无康复计划</h3>
            <p className="text-sm text-gray-500 mb-6">点击上方按钮为患者创建第一个康复计划</p>
            <Button
              onClick={handleCreatePlan}
              variant="outline"
              className="text-[#FF4D4F] border-[#FF4D4F] hover:bg-[#FF4D4F] hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建康复计划
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {carePlans.map((plan) => (
            <Card key={plan.plan_id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{plan.plan_name}</h3>
                      {getStatusBadge(plan.status)}
                    </div>
                    {plan.plan_description && (
                      <p className="text-sm text-gray-600 mb-3">{plan.plan_description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{plan.start_date}</span>
                        {plan.end_date && <span> 至 {plan.end_date}</span>}
                      </div>
                      {plan.create_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>创建于 {new Date(plan.create_time).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPlan(plan)}
                      className="text-gray-600 hover:text-[#FF4D4F] hover:border-[#FF4D4F]"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePlan(plan)}
                      className="text-gray-600 hover:text-red-600 hover:border-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {/* Stats */}
                <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{plan.medication_count || 0}</span> 项用药
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{plan.task_count || 0}</span> 项任务
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{plan.precaution_count || 0}</span> 项注意事项
                    </span>
                  </div>
                </div>

                {/* Patient Completion Feedback */}
                {plan.status === 'active' && (
                 <CarePlanCompletionStats
                 patientId={parseInt(patientId)}
                 planId={plan.plan_id}
                    />
                       )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Create/Edit Modal */}
      {isModalOpen && (
        <CreateCarePlanModal
          open={isModalOpen}
          patientId={parseInt(patientId)}
          editingPlan={editingPlan}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}