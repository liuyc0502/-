"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Lightbulb, Edit, Trash2 } from "lucide-react";
import { App } from "antd";
import patientService from "@/services/patientService";
import type { PatientTodo } from "@/types/patient";

interface PatientTodosProps {
  patientId: string;
}

export function PatientTodos({ patientId }: PatientTodosProps) {
  const { message } = App.useApp();
  const [todos, setTodos] = useState<PatientTodo[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTodos();
  }, [patientId, filter]);

  const loadTodos = async () => {
    try {
      setLoading(true);
      const status = filter === "all" ? undefined : filter;
      const data = await patientService.getPatientTodos(parseInt(patientId), status);
      setTodos(data);
    } catch (error) {
      message.error("加载待办事项失败");
      console.error("Failed to load todos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "border-l-4 border-l-red-500 bg-red-50";
      case "high":
        return "border-l-4 border-l-yellow-500 bg-yellow-50";
      default:
        return "border-l-4 border-l-green-500 bg-green-50";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未设置';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '明天';
    if (diffDays === 2) return '后天';
    if (diffDays > 0 && diffDays <= 7) return `${diffDays}天后`;
    return date.toLocaleDateString('zh-CN');
  };

  const urgentTodos = todos.filter((todo) => todo.status !== "completed" && todo.priority === "urgent");
  const highTodos = todos.filter((todo) => todo.status !== "completed" && todo.priority === "high");
  const normalTodos = todos.filter((todo) => todo.status !== "completed" && (todo.priority === "medium" || !todo.priority));
  const completedTodos = todos.filter((todo) => todo.status === "completed");

  const toggleTodo = async (todoId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "completed" ? "pending" : "completed";
      await patientService.updateTodoStatus(todoId, { status: newStatus });
      // Reload todos after update
      loadTodos();
    } catch (error) {
      message.error("更新待办状态失败");
      console.error("Failed to update todo:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#D94527] border-r-transparent mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Suggestions Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 mb-2">AI智能建议</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>建议在下次复查前完成肝肾功能检查</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>患者用药已满3个月，建议评估疗效并调整方案</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>关节肿胀有加重趋势，考虑增加物理治疗</span>
                </li>
              </ul>
              <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700 text-white">
                一键添加到待办
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Stats Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filter === "pending" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              待处理
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filter === "completed" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              已完成
            </button>
          </div>
          <span className="text-sm text-gray-600">
            共 {todos.length} 项，待处理 {todos.filter((t) => t.status !== "completed").length} 项
          </span>
        </div>
      </div>

      {/* Urgent Todos */}
      {urgentTodos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            紧急待办
          </h3>
          {urgentTodos.map((todo) => (
            <Card key={todo.todo_id} className={getPriorityColor(todo.priority)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={todo.status === "completed"}
                    onCheckedChange={() => toggleTodo(todo.todo_id, todo.status)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{todo.todo_title}</h4>
                    {todo.todo_description && (
                      <p className="text-sm text-gray-600 mt-1">{todo.todo_description}</p>
                    )}
                    <p className="text-sm text-red-600 font-medium mt-2">
                      截止：{formatDate(todo.due_date)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* High Priority Todos */}
      {highTodos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-yellow-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            本周待办
          </h3>
          {highTodos.map((todo) => (
            <Card key={todo.todo_id} className={getPriorityColor(todo.priority)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={todo.status === "completed"}
                    onCheckedChange={() => toggleTodo(todo.todo_id, todo.status)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{todo.todo_title}</h4>
                    {todo.todo_description && (
                      <p className="text-sm text-gray-600 mt-1">{todo.todo_description}</p>
                    )}
                    <p className="text-sm text-yellow-600 font-medium mt-2">
                      截止：{formatDate(todo.due_date)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Normal Todos */}
      {normalTodos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            常规待办
          </h3>
          {normalTodos.map((todo) => (
            <Card key={todo.todo_id} className={getPriorityColor(todo.priority)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={todo.status === "completed"}
                    onCheckedChange={() => toggleTodo(todo.todo_id, todo.status)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{todo.todo_title}</h4>
                    {todo.todo_description && (
                      <p className="text-sm text-gray-600 mt-1">{todo.todo_description}</p>
                    )}
                    <p className="text-sm text-green-600 font-medium mt-2">
                      截止：{formatDate(todo.due_date)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Todos (Collapsible) */}
      {completedTodos.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-lg font-bold text-gray-500 flex items-center gap-2 hover:text-gray-700"
          >
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            已完成 ({completedTodos.length})
            <span className="text-sm">{showCompleted ? "▼" : "▶"}</span>
          </button>
          {showCompleted &&
            completedTodos.map((todo) => (
              <Card key={todo.todo_id} className="bg-gray-50 border-gray-200 opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={todo.status === "completed"}
                      onCheckedChange={() => toggleTodo(todo.todo_id, todo.status)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-700 line-through">{todo.todo_title}</h4>
                      {todo.todo_description && (
                        <p className="text-sm text-gray-500 mt-1 line-through">{todo.todo_description}</p>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {todos.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">暂无待办事项</p>
        </div>
      )}
    </div>
  );
}
