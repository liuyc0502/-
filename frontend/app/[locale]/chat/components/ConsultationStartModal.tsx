"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, Checkbox, Input, Progress } from "antd";
import { Users, Brain, Paperclip, X, Image, FileText } from "lucide-react";
import type { Agent } from "@/types/chat";
import { API_ENDPOINTS } from "@/services/api";
import { fetchWithAuth } from "@/lib/auth";
import { storageService } from "@/services/storageService";

interface MinioFileRef {
  name: string;
  type: "image" | "file";
  object_name: string;
  url: string;
}

interface FilePreviewItem {
  id: string;
  file: File;
  type: "image" | "file";
  previewUrl?: string;
}

interface ConsultationStartModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: (question: string, agentIds: number[], minioFiles?: MinioFileRef[]) => void;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function getFileType(file: File): "image" | "file" {
  if (file.type.startsWith("image/")) return "image";
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.includes(ext) ? "image" : "file";
}

export default function ConsultationStartModal({
  visible,
  onClose,
  onStart,
}: ConsultationStartModalProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
  const [question, setQuestion] = useState("");
  const [attachments, setAttachments] = useState<FilePreviewItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Fetch agent list when modal opens
  useEffect(() => {
    if (visible) {
      fetchAgents();
    }
  }, [visible]);

  // Cleanup blob URLs on unmount or modal close
  useEffect(() => {
    if (!visible && attachments.length > 0) {
      attachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      setAttachments([]);
    }
  }, [visible]);

  const fetchAgents = async () => {
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.agent.list);
      if (response.ok) {
        const data = await response.json();
        const agentList = data.agents || data || [];
        setAgents(agentList.filter((a: Agent) => a.is_available !== false));
      }
    } catch (e) {
      console.error("Failed to fetch agents:", e);
    }
  };

  const handleToggleAgent = (agentId: number) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: FilePreviewItem[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (attachments.length + newFiles.length >= MAX_FILES) break;
      if (file.size > MAX_FILE_SIZE) continue;

      const type = getFileType(file);
      const previewUrl = type === "image" ? URL.createObjectURL(file) : undefined;
      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        type,
        previewUrl,
      });
    }

    if (newFiles.length > 0) {
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  }, [attachments.length]);

  const removeFile = (id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleStart = async () => {
    if (selectedAgentIds.length < 2) return;
    if (!question.trim()) return;

    let minioFiles: MinioFileRef[] | undefined;

    // Upload files if any
    if (attachments.length > 0) {
      setUploading(true);
      setUploadProgress(10);
      try {
        const files = attachments.map((a) => a.file);
        setUploadProgress(30);
        const result = await storageService.uploadFiles(files, "consultation");
        setUploadProgress(90);

        minioFiles = result.results
          .filter((r) => r.success)
          .map((r, idx) => ({
            name: r.file_name,
            type: attachments[idx]?.type || "file",
            object_name: r.object_name,
            url: r.url,
          }));

        setUploadProgress(100);
      } catch (e) {
        console.error("Failed to upload files:", e);
        setUploading(false);
        setUploadProgress(0);
        return;
      }
      setUploading(false);
      setUploadProgress(0);
    }

    onStart(question.trim(), selectedAgentIds, minioFiles);
    // Reset state
    setSelectedAgentIds([]);
    setQuestion("");
    attachments.forEach((a) => {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    });
    setAttachments([]);
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[#DA7756]" />
          <span>发起多学科会诊</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleStart}
      okText={uploading ? "上传中..." : "开始会诊"}
      cancelText="取消"
      okButtonProps={{
        disabled: selectedAgentIds.length < 2 || !question.trim() || uploading,
      }}
      width={560}
      centered
    >
      <div className="space-y-4 py-2">
        {/* Question input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            会诊问题
          </label>
          <Input.TextArea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="请输入需要多学科会诊的问题..."
            rows={3}
            maxLength={2000}
          />
        </div>

        {/* File upload area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            附件资料
            <span className="text-xs text-gray-400 ml-2">
              (可选，支持图片、PDF、文档等，最多 {MAX_FILES} 个)
            </span>
          </label>

          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 hover:border-[#DA7756]/40 rounded-lg p-3 text-center cursor-pointer transition-colors"
          >
            <Paperclip size={20} className="mx-auto text-gray-400 mb-1" />
            <p className="text-xs text-gray-500">
              点击或拖拽上传文件（影像、检验报告、病历等）
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* File previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="relative group flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs max-w-[200px]"
                >
                  {att.type === "image" && att.previewUrl ? (
                    <img
                      src={att.previewUrl}
                      alt={att.file.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                  )}
                  <span className="truncate text-gray-600">{att.file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(att.id);
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-white border border-gray-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} className="text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <Progress percent={uploadProgress} size="small" className="mt-2" />
          )}
        </div>

        {/* Agent selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择参与会诊的专科智能体
            <span className="text-xs text-gray-400 ml-2">
              (至少选择 2 个)
            </span>
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {agents.map((agent) => (
              <div
                key={agent.agent_id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  selectedAgentIds.includes(agent.agent_id)
                    ? "border-[#DA7756]/40 bg-[#DA7756]/5"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
                onClick={() => handleToggleAgent(agent.agent_id)}
              >
                <Checkbox
                  checked={selectedAgentIds.includes(agent.agent_id)}
                  onChange={() => handleToggleAgent(agent.agent_id)}
                />
                <Brain size={16} className="text-[#DA7756] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">
                    {agent.display_name || agent.name}
                  </div>
                  {agent.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {agent.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {agents.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-4">
                暂无可用的智能体
              </div>
            )}
          </div>
        </div>

        {selectedAgentIds.length > 0 && selectedAgentIds.length < 2 && (
          <p className="text-xs text-amber-600">
            请至少选择 2 个智能体参与会诊
          </p>
        )}
      </div>
    </Modal>
  );
}
