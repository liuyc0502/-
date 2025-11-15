"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Lightbulb, Edit, Trash2 } from "lucide-react";

interface PatientTodosProps {
  patientId: string;
}

interface TodoItem {
  id: string;
  title: string;
  description: string;
  deadline: string;
  priority: "urgent" | "high" | "normal";
  completed: boolean;
}

const mockTodos: TodoItem[] = [
  {
    id: "1",
    title: "完善RF检查",
    description: "医生建议：需确认类风湿诊断",
    deadline: "明天 17:00",
    priority: "urgent",
    completed: false,
  },
  {
    id: "2",
    title: "审核影像报告",
    description: "关节X光片已上传，等待审核",
    deadline: "后天 12:00",
    priority: "urgent",
    completed: false,
  },
  {
    id: "3",
    title: "调整用药方案",
    description: "根据最新检查结果优化治疗方案",
    deadline: "本周五",
    priority: "high",
    completed: false,
  },
  {
    id: "4",
    title: "安排下次复查",
    description: "预约下次门诊时间",
    deadline: "下周一",
    priority: "normal",
    completed: false,
  },
  {
    id: "5",
    title: "更新患者档案",
    description: "录入最新就诊信息",
    deadline: "下周三",
    priority: "normal",
    completed: true,
  },
];

export function PatientTodos({ patientId }: PatientTodosProps) {
  const [todos, setTodos] = useState<TodoItem[]>(mockTodos);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [showCompleted, setShowCompleted] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-l-4 border-l-red-500 bg-red-50";
      case "high":
        return "border-l-4 border-l-yellow-500 bg-yellow-50";
      default:
        return "border-l-4 border-l-green-500 bg-green-50";
    }
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "pending") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const urgentTodos = filteredTodos.filter((todo) => !todo.completed && todo.priority === "urgent");
  const highTodos = filteredTodos.filter((todo) => !todo.completed && todo.priority === "high");
  const normalTodos = filteredTodos.filter((todo) => !todo.completed && todo.priority === "normal");
  const completedTodos = filteredTodos.filter((todo) => todo.completed);

  const toggleTodo = (id: string) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

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
            共 {todos.length} 项，待处理 {todos.filter((t) => !t.completed).length} 项
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
            <Card key={todo.id} className={getPriorityColor(todo.priority)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{todo.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
                    <p className="text-sm text-red-600 font-medium mt-2">截止：{todo.deadline}</p>
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
            <Card key={todo.id} className={getPriorityColor(todo.priority)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{todo.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
                    <p className="text-sm text-yellow-600 font-medium mt-2">截止：{todo.deadline}</p>
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
            <Card key={todo.id} className={getPriorityColor(todo.priority)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{todo.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
                    <p className="text-sm text-green-600 font-medium mt-2">截止：{todo.deadline}</p>
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
              <Card key={todo.id} className="bg-gray-50 border-gray-200 opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={todo.completed} onCheckedChange={() => toggleTodo(todo.id)} className="mt-1" />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-700 line-through">{todo.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 line-through">{todo.description}</p>
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
    </div>
  );
}
