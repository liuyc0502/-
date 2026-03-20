"use client";

import { useState, useCallback } from "react";

import {
  Check,
  Pencil,
  RefreshCw,
  X,
  Loader2,
  AlertCircle,
  Clock,
  UserPlus,
  ClipboardList,
  FileText,
  Stethoscope,
  Calendar,
  Trash2,
  Save,
} from "lucide-react";
import { Input, InputNumber, Select } from "antd";
import { API_ENDPOINTS } from "@/services/api";
import { getAuthHeaders } from "@/lib/auth";
import type { ToolConfirmationData, ParameterFieldSchema } from "@/types/chat";
import log from "@/lib/logger";

const { TextArea } = Input;

// Tool name to icon mapping
const toolIconMap: Record<string, React.ReactNode> = {
  create_new_patient: <UserPlus size={16} />,
  update_patient_info: <UserPlus size={16} />,
  delete_patient_record: <Trash2 size={16} />,
  create_patient_todo: <ClipboardList size={16} />,
  update_patient_todo_status: <ClipboardList size={16} />,
  delete_patient_todo: <Trash2 size={16} />,
  save_lab_report: <FileText size={16} />,
  delete_lab_report_record: <Trash2 size={16} />,
  save_imaging_report: <FileText size={16} />,
  delete_imaging_report_record: <Trash2 size={16} />,
  create_medical_case: <Stethoscope size={16} />,
  update_medical_case_info: <Stethoscope size={16} />,
  delete_medical_case_record: <Trash2 size={16} />,
  save_case_detail: <Stethoscope size={16} />,
  create_timeline_event: <Calendar size={16} />,
  save_timeline_detail: <Calendar size={16} />,
  delete_timeline_event: <Trash2 size={16} />,
};

// Detect if tool is a destructive (delete) operation
const isDestructiveTool = (toolName: string) =>
  toolName.includes("delete");

type CardStatus = "pending" | "confirming" | "editing" | "regenerating" | "confirmed" | "failed" | "timeout";

interface ConfirmationCardProps {
  data: ToolConfirmationData;
}

export default function ConfirmationCard({ data }: ConfirmationCardProps) {
  const [status, setStatus] = useState<CardStatus>("pending");
  const [isEditing, setIsEditing] = useState(false);
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [regenInstructions, setRegenInstructions] = useState("");
  const [editedParams, setEditedParams] = useState<Record<string, any>>({ ...data.parameters });
  const [errorMsg, setErrorMsg] = useState("");

  const destructive = isDestructiveTool(data.tool_name);

  const callConfirmAPI = useCallback(async (action: string, params?: Record<string, any>, instructions?: string) => {
    try {
      const url = API_ENDPOINTS.confirmation.confirm(data.confirmation_id);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          action,
          parameters: params || null,
          instructions: instructions || null,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      return true;
    } catch (err: any) {
      log.error("Confirmation API error:", err);
      setErrorMsg(err.message || "操作失败");
      setStatus("failed");
      return false;
    }
  }, [data.confirmation_id]);

  const handleConfirm = useCallback(async () => {
    setStatus("confirming");
    setErrorMsg("");
    const success = await callConfirmAPI("confirm", data.parameters);
    if (success) {
      setStatus("confirmed");
    }
  }, [callConfirmAPI, data.parameters]);

  const handleEditSave = useCallback(async () => {
    setStatus("confirming");
    setErrorMsg("");
    const success = await callConfirmAPI("confirm", editedParams);
    if (success) {
      setStatus("confirmed");
      setIsEditing(false);
    }
  }, [callConfirmAPI, editedParams]);

  const handleRegenerate = useCallback(async () => {
    setStatus("regenerating");
    setErrorMsg("");
    const success = await callConfirmAPI("regenerate", undefined, regenInstructions);
    if (success) {
      setStatus("confirmed");
      setShowRegenInput(false);
    }
  }, [callConfirmAPI, regenInstructions]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditedParams({ ...data.parameters });
  }, [data.parameters]);

  const isResolved = status === "confirmed" || status === "failed" || status === "timeout";
  const icon = toolIconMap[data.tool_name] || <Save size={16} />;

  // Theme: teal for normal ops, red for destructive (delete) ops
  const theme = destructive
    ? { border: "border-red-200", headerBg: "bg-red-50/80", headerText: "text-red-700", badgeBg: "bg-red-100", badgeText: "text-red-600", badgeBorder: "border-red-200" }
    : { border: "border-teal-200", headerBg: "bg-teal-50/80", headerText: "text-teal-700", badgeBg: "bg-teal-100", badgeText: "text-teal-600", badgeBorder: "border-teal-200" };

  // Status badge
  const statusBadge = () => {
    switch (status) {
      case "pending":
        return (
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder}`}>
            <Clock size={12} /> 待确认
          </span>
        );
      case "confirming":
      case "regenerating":
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 border border-blue-200">
            <Loader2 size={12} className="animate-spin" /> 处理中
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 border border-green-200">
            <Check size={12} /> 已确认
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
            <AlertCircle size={12} /> 失败
          </span>
        );
      case "timeout":
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            <Clock size={12} /> 已超时
          </span>
        );
      default:
        return null;
    }
  };

  // Render a field value for display mode
  const renderFieldValue = (_schema: ParameterFieldSchema, value: any) => {
    if (value === null || value === undefined || value === "") return <span className="text-gray-400">-</span>;
    if (Array.isArray(value)) return <span>{value.join(", ")}</span>;
    return <span>{String(value)}</span>;
  };

  // Render an editable field
  const renderEditField = (schema: ParameterFieldSchema) => {
    if (schema.readonly) {
      return <Input value={editedParams[schema.key]} disabled className="text-sm" />;
    }
    switch (schema.type) {
      case "select":
        return (
          <Select
            value={editedParams[schema.key]}
            onChange={(val) => setEditedParams(prev => ({ ...prev, [schema.key]: val }))}
            options={(schema.options || []).map(opt => ({ label: opt, value: opt }))}
            className="w-full text-sm"
            size="small"
          />
        );
      case "number":
        return (
          <InputNumber
            value={editedParams[schema.key]}
            onChange={(val) => setEditedParams(prev => ({ ...prev, [schema.key]: val }))}
            className="w-full text-sm"
            size="small"
          />
        );
      case "textarea":
        return (
          <TextArea
            value={editedParams[schema.key]}
            onChange={(e) => setEditedParams(prev => ({ ...prev, [schema.key]: e.target.value }))}
            rows={2}
            className="text-sm"
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={editedParams[schema.key]}
            onChange={(e) => setEditedParams(prev => ({ ...prev, [schema.key]: e.target.value }))}
            className="text-sm"
            size="small"
          />
        );
      case "list":
        return (
          <Input
            value={Array.isArray(editedParams[schema.key]) ? editedParams[schema.key].join(", ") : editedParams[schema.key]}
            onChange={(e) => setEditedParams(prev => ({ ...prev, [schema.key]: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) }))}
            placeholder="逗号分隔"
            className="text-sm"
            size="small"
          />
        );
      default: // text
        return (
          <Input
            value={editedParams[schema.key]}
            onChange={(e) => setEditedParams(prev => ({ ...prev, [schema.key]: e.target.value }))}
            className="text-sm"
            size="small"
          />
        );
    }
  };

  // Filter schema to only show fields that have values or are required
  const visibleSchema = data.parameter_schema.filter(
    (field) => field.required || (data.parameters[field.key] !== undefined && data.parameters[field.key] !== null)
  );

  return (
    <div className={`my-2 rounded-lg border ${isResolved ? "border-gray-200" : theme.border} bg-white shadow-sm overflow-hidden transition-all`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 ${isResolved ? "bg-gray-50/80" : theme.headerBg}`}>
        <div className={`flex items-center gap-2 ${isResolved ? "text-gray-500" : theme.headerText}`}>
          {icon}
          <span className="font-medium text-sm">{data.tool_display_name}</span>
        </div>
        {statusBadge()}
      </div>

      {/* Body - Display or Edit mode */}
      <div className="px-4 py-3">
        {!isEditing ? (
          // Display mode
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {visibleSchema.map((field) => (
              <div key={field.key} className="flex items-baseline gap-2 text-sm py-0.5">
                <span className="text-gray-500 whitespace-nowrap min-w-[4rem]">{field.label}:</span>
                <span className="text-gray-800 break-all">{renderFieldValue(field, data.parameters[field.key])}</span>
              </div>
            ))}
          </div>
        ) : (
          // Edit mode
          <div className="space-y-2.5">
            {visibleSchema.map((field) => (
              <div key={field.key} className="flex items-center gap-2 text-sm">
                <label className="text-gray-500 whitespace-nowrap min-w-[4rem] text-right">{field.label}:</label>
                <div className="flex-1">{renderEditField(field)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Regeneration input */}
        {showRegenInput && !isResolved && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <TextArea
              value={regenInstructions}
              onChange={(e) => setRegenInstructions(e.target.value)}
              placeholder="请输入修改指令（可选）"
              rows={2}
              className="text-sm mb-2"
            />
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} /> {errorMsg}
          </div>
        )}
      </div>

      {/* Footer - Action buttons */}
      {!isResolved && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          {!isEditing && !showRegenInput && (
            <>
              <button
                onClick={handleConfirm}
                disabled={status === "confirming"}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50
                  ${destructive
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                  }`}
              >
                {status === "confirming" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                确认{destructive ? "删除" : ""}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
              >
                <Pencil size={13} />
                编辑
              </button>
              <button
                onClick={() => setShowRegenInput(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={13} />
                重新生成
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleEditSave}
                disabled={status === "confirming"}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {status === "confirming" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                保存
              </button>
              <button
                onClick={handleEditCancel}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
              >
                <X size={13} />
                取消
              </button>
            </>
          )}
          {showRegenInput && (
            <>
              <button
                onClick={handleRegenerate}
                disabled={status === "regenerating"}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {status === "regenerating" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                重新生成
              </button>
              <button
                onClick={() => { setShowRegenInput(false); setRegenInstructions(""); }}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
              >
                <X size={13} />
                取消
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
