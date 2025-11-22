"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dropdown, Badge, Modal, Button } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { WarningFilled } from "@ant-design/icons";
import { BrainCircuit, Globe } from "lucide-react";

import { Button as ButtonUI } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { languageOptions } from "@/const/constants";
import { useLanguageSwitch } from "@/lib/language";
import { useMemoryIndicator } from "@/hooks/useMemory";
import { loadMemoryConfig, setMemorySwitch } from "@/services/memoryService";
import { configStore } from "@/lib/config";
import log from "@/lib/logger";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { USER_ROLES } from "@/const/modelConfig";

import MemoryManageModal from "../internal/memory/memoryManageModal";
import type { PortalChatConfig } from "@/const/portalChatConfig";
import { PatientSelector } from "./PatientSelector";
import { ConversationStatus } from "./ConversationStatus";
import { TagsManager } from "./TagsManager";
import { SummaryEditor } from "./SummaryEditor";

// Gradient definition for BrainCircuit icon
const GradientDefs = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <linearGradient id="brainCogGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#9333ea" />
      </linearGradient>
    </defs>
  </svg>
);

interface ChatHeaderProps {
  title: string;
  onRename?: (newTitle: string) => void;
  portalConfig: PortalChatConfig;
  // Conversation-patient linking props (optional for doctor portal)
  conversationId?: number | null;
  patientId?: number | null;
  patientName?: string | null;
  conversationStatus?: string;
  conversationTags?: string[];
  conversationSummary?: string; // Summary field
  onPatientChange?: (patientId: number | null, patientName: string | null) => void;
  onStatusChange?: (status: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onSummaryChange?: (summary: string) => void; // Summary change callback
  showPatientLinking?: boolean; // Show patient linking features (default: false)
}

export function ChatHeader({
  title,
  onRename,
  portalConfig,
  conversationId,
  patientId,
  patientName,
  conversationStatus,
  conversationTags,
  conversationSummary,
  onPatientChange,
  onStatusChange,
  onTagsChange,
  onSummaryChange,
  showPatientLinking = false,
}: ChatHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [memoryModalVisible, setMemoryModalVisible] = useState(false);
  const [embeddingConfigured, setEmbeddingConfigured] = useState<boolean>(true);
  const [showConfigPrompt, setShowConfigPrompt] = useState(false);
  const [showAutoOffPrompt, setShowAutoOffPrompt] = useState(false);
  const hasNewMemory = useMemoryIndicator(memoryModalVisible);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation("common");
  const { currentLanguage, handleLanguageChange } = useLanguageSwitch();
  const { user } = useAuth();
  const isAdmin = user?.role === USER_ROLES.ADMIN;

  const displayedTitle =
    title ||
    t("chatHeader.newConversation", { defaultValue: "New conversation" });

  const goToModelSetup = () => {
    router.push(`/${currentLanguage}/setup/models`);
  };

  // Update editTitle when the title attribute changes
  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  // Handle double-click event
  const handleDoubleClick = () => {
    setIsEditing(true);
    // Delay focusing to ensure the DOM has updated
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 10);
  };

  // Check embedding configuration and memory switch once when entering the page
  useEffect(() => {
    try {
      const modelConfig = configStore.getModelConfig();
      const configured = Boolean(
        modelConfig?.embedding?.modelName ||
          modelConfig?.multiEmbedding?.modelName
      );
      setEmbeddingConfigured(configured);

      if (!configured) {
        // If memory switch is on, turn it off automatically and notify the user
        loadMemoryConfig()
          .then(async (cfg) => {
            if (cfg.memoryEnabled) {
              const ok = await setMemorySwitch(false);
              if (!ok) {
                log.warn(
                  "Failed to auto turn off memory switch when embedding is not configured"
                );
              }
              setShowAutoOffPrompt(true);
            }
          })
          .catch((e) => {
            log.error("Failed to check memory config on page enter", e);
          });
      }
    } catch (e) {
      setEmbeddingConfigured(false);
      log.error("Failed to read model config for embedding check", e);
    }
  }, []);

  // Handle submit editing
  const handleSubmit = () => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && onRename && trimmedTitle !== title) {
      onRename(trimmedTitle);
    } else {
      setEditTitle(title); // If empty or unchanged, restore the original title
    }
    setIsEditing(false);
  };

  // Handle keydown event
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setEditTitle(title);
      setIsEditing(false);
    }
  };

  return (
    <>
      <GradientDefs />
      <header className="px-16 pt-6 pb-4 border-b border-transparent bg-transparent z-10">
        {/* Top Row: Brand + Title + Actions */}
        <div className="flex items-start justify-between gap-4">
          {/* Left: Brand and Title */}
          <div className="flex-shrink-0">
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#B1997B]">
              {portalConfig.brandName}
            </p>
            <div className="mt-2">
              {isEditing ? (
                <Input
                  ref={inputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSubmit}
                  className="text-2xl font-semibold h-11 max-w-md border-[#E5E5E5] bg-white/70"
                  autoFocus
                />
              ) : (
                <button
                  className="text-2xl font-semibold text-[#1A1A1A] font-serif cursor-text hover:text-[#D16E47] transition-colors"
                  onDoubleClick={handleDoubleClick}
                  title={t("chatHeader.doubleClickToEdit")}
                >
                  {displayedTitle}
                </button>
              )}
            </div>
          </div>

          {/* Center: Patient Linking Info (Doctor Portal) */}
          {showPatientLinking && (
            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-4">
              {/* Row 1: Patient, Status, Tags */}
              <div className="flex items-center gap-6 flex-wrap justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#999]">关联患者</span>
                  <PatientSelector
                    conversationId={conversationId || null}
                    currentPatientId={patientId}
                    currentPatientName={patientName}
                    onPatientChange={onPatientChange}
                    disabled={!conversationId}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#999]">状态</span>
                  <ConversationStatus
                    conversationId={conversationId || null}
                    currentStatus={conversationStatus}
                    onStatusChange={onStatusChange}
                    disabled={!conversationId}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#999]">标签</span>
                  <TagsManager
                    conversationId={conversationId || null}
                    currentTags={conversationTags}
                    onTagsChange={onTagsChange}
                    disabled={!conversationId}
                  />
                </div>
              </div>

              {/* Row 2: Summary */}
              <div className="flex items-center gap-2 mt-2 w-full max-w-lg">
                <span className="text-xs text-[#999] flex-shrink-0">摘要</span>
                <div className="flex-1">
                  <SummaryEditor
                    conversationId={conversationId || null}
                    currentSummary={conversationSummary}
                    onSummaryChange={onSummaryChange}
                    disabled={!conversationId}
                    placeholder="点击添加对话摘要..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Right: Language & Memory */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Dropdown
              menu={{
                items: languageOptions.map((opt) => ({
                  key: opt.value,
                  label: opt.label,
                })),
                onClick: ({ key }) => handleLanguageChange(key as string),
              }}
            >
              <a className="ant-dropdown-link text-sm font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors flex items-center gap-2 cursor-pointer rounded-full border border-[#E5E5E5] px-3 py-2 bg-white">
                <Globe className="h-4 w-4" />
                {languageOptions.find((o) => o.value === currentLanguage)
                  ?.label || currentLanguage}
                <DownOutlined className="text-[10px]" />
              </a>
            </Dropdown>
            <Badge dot={embeddingConfigured && hasNewMemory} offset={[-4, 4]}>
              <ButtonUI
                variant="ghost"
                className={`rounded-full px-3 py-2 h-10 flex items-center gap-2 border border-[#E5E5E5] bg-white ${
                  !embeddingConfigured ? "opacity-50" : ""
                }`}
                onClick={() => {
                  if (!embeddingConfigured) {
                    setShowConfigPrompt(true);
                    return;
                  }
                  setMemoryModalVisible(true);
                }}
              >
                <BrainCircuit className="h-5 w-5 text-[#B87345]" />
                <span className="text-sm text-[#6B6B6B]">
                  {t("chatHeader.memory", { defaultValue: "记忆" })}
                </span>
              </ButtonUI>
            </Badge>
          </div>
        </div>
      </header>
      {/* Embedding not configured prompt */}
      <Modal
        title={t("embedding.chatMemoryWarningModal.title")}
        open={showConfigPrompt}
        onCancel={() => setShowConfigPrompt(false)}
        centered
        footer={
          <div className="flex justify-end mt-3 gap-4">
            {isAdmin && (
              <Button type="primary" onClick={goToModelSetup}>
                {t("embedding.chatMemoryWarningModal.ok_config")}
              </Button>
            )}
            <Button onClick={() => setShowConfigPrompt(false)}>
              {t("embedding.chatMemoryWarningModal.ok")}
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <div className="flex items-center">
            <WarningFilled
              className="text-yellow-500 mt-1 mr-2"
              style={{ fontSize: "48px" }}
            />
            <div className="ml-3 mt-2">
              <div className="text-sm leading-6">
                {t("embedding.chatMemoryWarningModal.content")}
              </div>
              {!isAdmin && (
                <div className="mt-2 text-xs opacity-70">
                  {t("embedding.chatMemoryWarningModal.tip")}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Auto-off memory prompt when embedding missing */}
      <Modal
        title={t("embedding.chatMemoryAutoDeselectModal.title")}
        open={showAutoOffPrompt}
        onCancel={() => setShowAutoOffPrompt(false)}
        centered
        footer={
          <div className="flex justify-end mt-3 gap-4">
            {isAdmin && (
              <Button type="primary" onClick={goToModelSetup}>
                {t("embedding.chatMemoryAutoDeselectModal.ok_config")}
              </Button>
            )}
            <Button onClick={() => setShowAutoOffPrompt(false)}>
              {t("embedding.chatMemoryAutoDeselectModal.ok")}
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <div className="flex items-center">
            <WarningFilled
              className="text-yellow-500 mt-1 mr-2"
              style={{ fontSize: "48px" }}
            />
            <div className="ml-3 mt-2">
              <div className="text-sm leading-6">
                {t("embedding.chatMemoryAutoDeselectModal.content")}
              </div>
              {!isAdmin && (
                <div className="mt-2 text-xs opacity-70">
                  {t("embedding.chatMemoryAutoDeselectModal.tip")}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
      <MemoryManageModal
        visible={memoryModalVisible}
        onClose={() => setMemoryModalVisible(false)}
      />
    </>
  );
}
