"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { App } from "antd";
import patientService from "@/services/patientService";

interface CreateTimelineDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: number;
  onSuccess: () => void;
}

export function CreateTimelineDialog({ open, onClose, patientId, onSuccess }: CreateTimelineDialogProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    stage_type: "初诊",
    stage_date: new Date().toISOString().split("T")[0],
    stage_title: "",
    diagnosis: "",
    status: "current",
    display_order: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.stage_title) {
      message.error("请输入阶段标题");
      return;
    }

    try {
      setLoading(true);
      await patientService.createTimelineStage({
        patient_id: patientId,
        ...formData,
      });
      message.success("创建时间线节点成功");
      onSuccess();
      handleClose();
    } catch (error) {
      message.error("创建失败，请重试");
      console.error("Failed to create timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      stage_type: "初诊",
      stage_date: new Date().toISOString().split("T")[0],
      stage_title: "",
      diagnosis: "",
      status: "current",
      display_order: 0,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建时间线节点</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage_type">阶段类型 *</Label>
              <Select
                value={formData.stage_type}
                onValueChange={(value) => setFormData({ ...formData, stage_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="初诊">初诊</SelectItem>
                  <SelectItem value="检查">检查</SelectItem>
                  <SelectItem value="确诊">确诊</SelectItem>
                  <SelectItem value="治疗">治疗</SelectItem>
                  <SelectItem value="随访">随访</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage_date">日期 *</Label>
              <Input
                id="stage_date"
                type="date"
                value={formData.stage_date}
                onChange={(e) => setFormData({ ...formData, stage_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage_title">阶段标题 *</Label>
            <Input
              id="stage_title"
              placeholder="例如：首次门诊检查"
              value={formData.stage_title}
              onChange={(e) => setFormData({ ...formData, stage_title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">诊断</Label>
            <Textarea
              id="diagnosis"
              placeholder="请输入诊断信息"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="current">进行中</SelectItem>
                  <SelectItem value="pending">待进行</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">显示顺序</Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              取消
            </Button>
            <Button type="submit" className="bg-[#D94527] hover:bg-[#C13D1F]" disabled={loading}>
              {loading ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
