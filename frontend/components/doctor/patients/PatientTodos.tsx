"use client";

import { useState, useEffect } from "react";
import { App, Checkbox } from "antd";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  CircleAlert,
  ChevronDown,
  ChevronRight,
  UserRound,
} from "lucide-react";
import patientService from "@/services/patientService";
import type { PatientTodo } from "@/types/patient";
import { CreateTodoModal } from "./CreateTodoModal";

interface PatientTodosProps {
  patientId: string;
}

// Helper Functions
const formatDate = (dateString?: string): string => {
  if (!dateString) return "未设置";
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "明天";
  if (diffDays === 2) return "后天";
  if (diffDays > 0 && diffDays <= 7) return `${diffDays}天后`;
  return date.toLocaleDateString("zh-CN");
};

const isOverdue = (dateString?: string): boolean => {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
};

// Priority tag config
const priorityTag: Record<string, { label: string; className: string }> = {
  urgent: { label: "紧急", className: "bg-red-100 text-red-700 border-red-200" },
  high: { label: "本周", className: "bg-amber-100 text-amber-700 border-amber-200" },
  medium: { label: "本周", className: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "常规", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

// Single todo item row
function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
}: {
  todo: PatientTodo;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const completed = todo.status === "completed";
  const overdue = !completed && isOverdue(todo.due_date);
  const tag = priorityTag[todo.priority || "low"] || priorityTag.low;

  return (
    <div
      className={`group flex items-start gap-4 px-6 py-4 border-b border-gray-100 last:border-b-0 transition-colors hover:bg-gray-50/60 ${
        completed ? "opacity-50" : ""
      }`}
    >
      {/* Checkbox */}
      <Checkbox
        checked={completed}
        onChange={onToggle}
        className="mt-0.5"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <span
            className={`text-base font-medium ${
              completed ? "line-through text-gray-400" : "text-gray-900"
            }`}
          >
            {todo.todo_title}
          </span>
          {!completed && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${tag.className}`}>
              {tag.label}
            </span>
          )}
        </div>

        {todo.todo_description && (
          <p className={`text-sm mt-1 ${completed ? "line-through text-gray-400" : "text-gray-500"}`}>
            {todo.todo_description}
          </p>
        )}

        <div className="flex items-center gap-4 mt-2">
          {todo.due_date && (
            <span className={`inline-flex items-center gap-1.5 text-sm ${
              overdue ? "text-red-500 font-medium" : "text-gray-400"
            }`}>
              <CalendarClock size={14} />
              {overdue ? "已逾期 · " : ""}{formatDate(todo.due_date)}
            </span>
          )}
          {todo.assigned_doctor && (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
              <UserRound size={14} />
              {todo.assigned_doctor}
            </span>
          )}
        </div>
      </div>

      {/* Actions - show on hover */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!completed && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="text-gray-600 hover:text-[#DA7756] hover:border-[#DA7756]"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-gray-600 hover:text-red-600 hover:border-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PatientTodos({ patientId }: PatientTodosProps) {
  const { message, modal } = App.useApp();
  const [todos, setTodos] = useState<PatientTodo[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<PatientTodo | null>(null);

  useEffect(() => {
    loadTodos();
  }, [patientId, filter]);

  const loadTodos = async () => {
    try {
      setLoading(true);
      const status = filter === "all" ? undefined : filter;
      const data = await patientService.getPatientTodos(
        parseInt(patientId),
        status,
      );
      setTodos(data);
    } catch (error) {
      message.error("加载待办事项失败");
      console.error("Failed to load todos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Categorize todos
  const urgentTodos = todos.filter(
    (todo) => todo.status !== "completed" && todo.priority === "high",
  );
  const weeklyTodos = todos.filter(
    (todo) => todo.status !== "completed" && todo.priority === "medium",
  );
  const normalTodos = todos.filter(
    (todo) =>
      todo.status !== "completed" &&
      (todo.priority === "low" || !todo.priority),
  );
  const completedTodos = todos.filter((todo) => todo.status === "completed");

  const pendingCount = todos.filter((t) => t.status !== "completed").length;

  const handleEdit = (todo: PatientTodo) => {
    setEditingTodo(todo);
    setTodoModalOpen(true);
  };

  const handleDelete = (todo: PatientTodo) => {
    if (!todo.todo_id) {
      message.error("待办ID无效，无法删除");
      return;
    }

    modal.confirm({
      title: "确认删除",
      content: `确定要删除待办"${todo.todo_title}"吗？`,
      okText: "确认",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            await patientService.deletePatientTodo(todo.todo_id);
            message.success("删除成功");
            await loadTodos();
            resolve();
          } catch (error) {
            console.error("Failed to delete todo:", error);
            const errorMessage =
              error instanceof Error ? error.message : "删除失败";
            message.error(errorMessage);
            reject(error);
          }
        });
      },
    });
  };

  const toggleTodo = async (todoId: number, currentStatus: string) => {
    try {
      const newStatus =
        currentStatus === "completed" ? "pending" : "completed";
      await patientService.updateTodoStatus(todoId, { status: newStatus });
      loadTodos();
    } catch (error) {
      message.error("更新待办状态失败");
      console.error("Failed to update todo:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // Render a todo section
  const renderSection = (
    title: string,
    items: PatientTodo[],
    icon?: React.ReactNode,
  ) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-400">{items.length}</span>
        </div>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-0">
            {items.map((todo) => (
              <TodoItem
                key={todo.todo_id}
                todo={todo}
                onToggle={() => toggleTodo(todo.todo_id, todo.status)}
                onEdit={() => handleEdit(todo)}
                onDelete={() => handleDelete(todo)}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">待办事项</h2>
          <p className="text-sm text-gray-500 mt-1">
            共 {todos.length} 项，{pendingCount} 项待处理
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["all", "pending", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f === "all" ? "全部" : f === "pending" ? "待处理" : "已完成"}
              </button>
            ))}
          </div>
          <Button
            onClick={() => setTodoModalOpen(true)}
            className="bg-[#DA7756] hover:bg-[#C46B4D] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建待办
          </Button>
        </div>
      </div>

      {/* Todo Sections */}
      {renderSection(
        "紧急待办",
        urgentTodos,
        <CircleAlert size={18} className="text-red-500" />,
      )}
      {renderSection("本周待办", weeklyTodos)}
      {renderSection("常规待办", normalTodos)}

      {/* Completed (collapsible) */}
      {completedTodos.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showCompleted ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            已完成
            <span className="text-sm font-normal">{completedTodos.length}</span>
          </button>
          {showCompleted && (
            <Card className="bg-white border-gray-200">
              <CardContent className="p-0">
                {completedTodos.map((todo) => (
                  <TodoItem
                    key={todo.todo_id}
                    todo={todo}
                    onToggle={() => toggleTodo(todo.todo_id, todo.status)}
                    onEdit={() => handleEdit(todo)}
                    onDelete={() => handleDelete(todo)}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {todos.length === 0 && (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无待办事项</h3>
            <p className="text-sm text-gray-500 mb-6">点击上方按钮为患者创建第一个待办</p>
            <Button
              onClick={() => setTodoModalOpen(true)}
              variant="outline"
              className="text-[#DA7756] border-[#DA7756] hover:bg-[#DA7756] hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建待办
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Todo Modal */}
      <CreateTodoModal
        open={todoModalOpen}
        onClose={() => {
          setTodoModalOpen(false);
          setEditingTodo(null);
        }}
        patientId={parseInt(patientId)}
        editingTodo={editingTodo}
        onSuccess={loadTodos}
      />
    </div>
  );
}
