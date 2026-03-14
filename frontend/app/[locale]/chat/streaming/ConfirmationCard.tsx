"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
import { Input, InputNumber, Select, Form, Button as AntButton } from "antd";
import { API_ENDPOINTS } from "@/services/api";
import { getAuthHeaders } from "@/lib/auth";
import type { ToolConfirmationData, ParameterFieldSchema } from "@/types/chat";
import log from "@/lib/logger";

const { TextArea } = Input;

// Tool name to icon mapping
const toolIconMap: Record<string, React.ReactNode> = {
  create_new_patient: <UserPlus size={18} />,
  update_patient_info: <UserPlus size={18} />,
  delete_patient_record: <Trash2 size={18} />,
  create_patient_todo: <ClipboardList size={18} />,
  update_patient_todo_status: <ClipboardList size={18} />,
  delete_patient_todo: <Trash2 size={18} />,
  save_lab_report: <FileText size={18} />,
  delete_lab_report_record: <Trash2 size={18} />,
  save_imaging_report: <FileText size={18} />,
  delete_imaging_report_record: <Trash2 size={18} />,
  create_medical_case: <Stethoscope size={18} />,
  update_medical_case_info: <Stethoscope size={18} />,
  delete_medical_case_record: <Trash2 size={18} />,
  save_case_detail: <Stethoscope size={18} />,
  create_timeline_event: <Calendar size={18} />,
  save_timeline_detail: <Calendar size={18} />,
  delete_timeline_event: <Trash2 size={18} />,
};

type CardStatus = "pending" | "confirming" | "editing" | "regenerating" | "confirmed" | "failed" | "timeout";

interface ConfirmationCardProps {
  data: ToolConfirmationData;
}

export default function ConfirmationCard({ data }: ConfirmationCardProps) {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState<CardStatus>("pending");
  const [isEditing, setIsEditing] = useState(false);
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [regenInstructions, setRegenInstructions] = useState("");
  const [editedParams, setEditedParams] = useState<Record<string, any>>({ ...data.parameters });
  const [errorMsg, setErrorMsg] = useState("");
  const [form] = Form.useForm();

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
    form.setFieldsValue(data.parameters);
  }, [data.parameters, form]);

  const isResolved = status === "confirmed" || status === "failed" || status === "timeout";
  const icon = toolIconMap[data.tool_name] || <Save size={18} />;

  // Status badge
  const statusBadge = () => {
    switch (status) {
      case "pending":
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200"><Clock size={12} /> {t("confirmation.pending")}</span>;
      case "confirming":
      case "regenerating":
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200"><Loader2 size={12} className="animate-spin" /> 处理中</span>;
      case "confirmed":
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200"><Check size={12} /> {t("confirmation.confirmed")}</span>;
      case "failed":
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200"><AlertCircle size={12} /> {t("confirmation.failed")}</span>;
      case "timeout":
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200"><Clock size={12} /> {t("confirmation.timeout")}</span>;
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
    (field) => field.required || data.parameters[field.key] !== undefined && data.parameters[field.key] !== null
  );

  return (
    <div className={`my-2 rounded-lg border ${isResolved ? "border-gray-200 bg-gray-50/50" : "border-blue-200 bg-white"} shadow-sm overflow-hidden transition-all`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2 text-gray-700">
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
              placeholder={t("confirmation.regenerateHint")}
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
              <AntButton
                type="primary"
                size="small"
                icon={<Check size={14} />}
                onClick={handleConfirm}
                loading={status === "confirming"}
                className="flex items-center gap-1"
              >
                {t("confirmation.confirm")}
              </AntButton>
              <AntButton
                size="small"
                icon={<Pencil size={14} />}
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1"
              >
                {t("confirmation.edit")}
              </AntButton>
              <AntButton
                size="small"
                icon={<RefreshCw size={14} />}
                onClick={() => setShowRegenInput(true)}
                className="flex items-center gap-1"
              >
                {t("confirmation.regenerate")}
              </AntButton>
            </>
          )}
          {isEditing && (
            <>
              <AntButton
                type="primary"
                size="small"
                icon={<Check size={14} />}
                onClick={handleEditSave}
                loading={status === "confirming"}
                className="flex items-center gap-1"
              >
                {t("confirmation.save")}
              </AntButton>
              <AntButton
                size="small"
                icon={<X size={14} />}
                onClick={handleEditCancel}
                className="flex items-center gap-1"
              >
                {t("confirmation.cancel")}
              </AntButton>
            </>
          )}
          {showRegenInput && (
            <>
              <AntButton
                type="primary"
                size="small"
                icon={<RefreshCw size={14} />}
                onClick={handleRegenerate}
                loading={status === "regenerating"}
                className="flex items-center gap-1"
              >
                {t("confirmation.regenerate")}
              </AntButton>
              <AntButton
                size="small"
                icon={<X size={14} />}
                onClick={() => { setShowRegenInput(false); setRegenInstructions(""); }}
                className="flex items-center gap-1"
              >
                {t("confirmation.cancel")}
              </AntButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}
