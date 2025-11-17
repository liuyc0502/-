"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { App } from "antd";
import patientService from "@/services/patientService";
import type { PatientTodo } from "@/types/patient";

interface CreateTodoDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: number;
  editingTodo?: PatientTodo | null;
  onSuccess: () => void;
}

export function CreateTodoDialog({
  open,
  onClose,
  patientId,
  editingTodo,
  onSuccess,
}: CreateTodoDialogProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    todo_title: "",
    todo_description: "",
    todo_type: "复查",
    due_date: new Date().toISOString().split("T")[0],
    priority: "medium",
    status: "pending",
  });

  useEffect(() => {
    if (editingTodo) {
      setFormData({
        todo_title: editingTodo.todo_title || "",
        todo_description: editingTodo.todo_description || "",
        todo_type: editingTodo.todo_type || "复查",
        due_date: editingTodo.due_date || new Date().toISOString().split("T")[0],
        priority: editingTodo.priority || "medium",
        status: editingTodo.status || "pending",
      });
    } else {
      setFormData({
        todo_title: "",
        todo_description: "",
        todo_type: "复查",
        due_date: new Date().toISOString().split("T")[0],
        priority: "medium",
        status: "pending",
      });
    }
  }, [editingTodo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.todo_title) {
      message.error("请输入待办标题");
      return;
    }

    try {
      setLoading(true);

      if (editingTodo) {
        // Update logic - note: you'll need to add updateTodo API endpoint
        message.warning("编辑功能需要后端支持updateTodo接口");
        // await patientService.updateTodo(editingTodo.todo_id, formData);
      } else {
        // Create new todo
        await patientService.createPatientTodo({
          patient_id: patientId,
          ...formData,
        });
      }

      message.success(editingTodo ? "更新成功" : "创建成功");
      onSuccess();
      handleClose();
    } catch (error) {
      message.error(editingTodo ? "更新失败，请重试" : "创建失败，请重试");
      console.error("Failed to save todo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      todo_title: "",
      todo_description: "",
      todo_type: "复查",
      due_date: new Date().toISOString().split("T")[0],
      priority: "medium",
      status: "pending",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingTodo ? "编辑待办事项" : "创建待办事项"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="todo_title">待办标题 *</Label>
            <Input
              id="todo_title"
              placeholder="例如：完善RF检查"
              value={formData.todo_title}
              onChange={(e) => setFormData({ ...formData, todo_title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="todo_description">详细描述</Label>
            <Textarea
              id="todo_description"
              placeholder="请输入详细描述"
              value={formData.todo_description}
              onChange={(e) => setFormData({ ...formData, todo_description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="todo_type">类型 *</Label>
              <Select
                value={formData.todo_type}
                onValueChange={(value) => setFormData({ ...formData, todo_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="复查">复查</SelectItem>
                  <SelectItem value="用药">用药</SelectItem>
                  <SelectItem value="检查">检查</SelectItem>
                  <SelectItem value="随访">随访</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">截止日期 *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">优先级</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">紧急</SelectItem>
                  <SelectItem value="medium">重要</SelectItem>
                  <SelectItem value="low">普通</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="overdue">已逾期</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              取消
            </Button>
            <Button type="submit" className="bg-[#D94527] hover:bg-[#C13D1F]" disabled={loading}>
              {loading ? "保存中..." : editingTodo ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
