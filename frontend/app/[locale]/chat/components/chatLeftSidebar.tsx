"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  User,
  Search,
  ChevronDown,
  Filter,
  X,
  UserCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdownMenu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRoleColor } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { Spin, Tag, ConfigProvider, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useTranslation } from "react-i18next";

import type { ChatSidebarProps, ConversationListItem } from "@/types/chat";

// Constants
const SIDEBAR_EXPANDED_WIDTH = 200;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const TEXT_FADE_IN_DELAY = 50;
const TEXT_FADE_OUT_DURATION = 50;

// conversation status indicator component
const ConversationStatusIndicator = ({
  isStreaming,
  isCompleted,
}: {
  isStreaming: boolean;
  isCompleted: boolean;
}) => {
  const { t } = useTranslation();

  if (isStreaming) {
    return (
      <div
        className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"
        title={t("chatLeftSidebar.running")}
      />
    );
  }

  if (isCompleted) {
    return (
      <div
        className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mr-2"
        title={t("chatLeftSidebar.completed")}
      />
    );
  }

  return null;
};

// Helper functions
const categorizeDialogs = (dialogs: ConversationListItem[]) => {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000;

  const todayDialogs: ConversationListItem[] = [];
  const weekDialogs: ConversationListItem[] = [];
  const olderDialogs: ConversationListItem[] = [];

  dialogs.forEach((dialog) => {
    const dialogTime = dialog.create_time;

    if (dialogTime >= today) {
      todayDialogs.push(dialog);
    } else if (dialogTime >= weekAgo) {
      weekDialogs.push(dialog);
    } else {
      olderDialogs.push(dialog);
    }
  });

  return {
    today: todayDialogs,
    week: weekDialogs,
    older: olderDialogs,
  };
};

const filterConversations = (
  conversations: ConversationListItem[],
  searchTerm: string,
  statusFilter: string | null,
  tagFilter: string | null
) => {
  return conversations.filter((dialog) => {
    const matchesSearch = dialog.conversation_title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus =
      !statusFilter || (dialog as any).conversation_status === statusFilter;

    const matchesTag =
      !tagFilter ||
      ((dialog as any).tags && (dialog as any).tags.includes(tagFilter));

    return matchesSearch && matchesStatus && matchesTag;
  });
};

export function ChatSidebar({
  conversationList,
  selectedConversationId,
  openDropdownId,
  streamingConversations,
  completedConversations,
  onNewConversation,
  onDialogClick,
  onRename,
  onDelete,
  onSettingsClick,
  settingsMenuItems,
  onDropdownOpenChange,
  onToggleSidebar,
  expanded,
  userEmail,
  userAvatarUrl,
  userRole = "user",
  userName,
  portalConfig,
  onNavItemClick,
  activeNavItem = "chats",
}: ChatSidebarProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoading: userAuthLoading, isSpeedMode } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dialogToDelete, setDialogToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showText, setShowText] = useState(expanded);
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accentColor = portalConfig.accentColor || "#D94527";
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Memoize filtered conversations to avoid recalculating on every render
  const filteredConversations = useMemo(
    () =>
      filterConversations(conversationList, searchTerm, statusFilter, tagFilter),
    [conversationList, searchTerm, statusFilter, tagFilter]
  );

  // Memoize categorized dialogs
  const { today, week, older } = useMemo(
    () => categorizeDialogs(filteredConversations),
    [filteredConversations]
  );

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }

    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }

    if (expanded) {
      expandTimeoutRef.current = setTimeout(() => {
        setShowText(true);
      }, TEXT_FADE_IN_DELAY);
    } else {
      setShowText(false);
    }

    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
        expandTimeoutRef.current = null;
      }

      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current);
        collapseTimeoutRef.current = null;
      }
    };
  }, [expanded]);

  const handleStartEdit = (dialogId: number, title: string) => {
    setEditingId(dialogId);
    setEditingTitle(title);
    onDropdownOpenChange(false, null);
  };

  // Text content transition classes
  const slidingContentClass = `transition-opacity duration-150 ease-out ${
    showText ? "opacity-100" : "opacity-0 pointer-events-none"
  }`;

  const fadingContentClass = `transition-opacity duration-150 ease-out ${
    showText ? "opacity-100" : "opacity-0"
  }`;

  const handleSubmitEdit = () => {
    if (editingId !== null && editingTitle.trim()) {
      onRename(editingId, editingTitle.trim());
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmitEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleClearFilters = () => {
    setStatusFilter(null);
    setTagFilter(null);
  };

  const handleStatusFilterToggle = (status: string) => {
    setStatusFilter(statusFilter === status ? null : status);
  };

  const handleDeleteClick = (dialogId: number) => {
    setDialogToDelete(dialogId);
    setIsDeleteDialogOpen(true);
    onDropdownOpenChange(false, null);
  };

  const confirmDelete = () => {
    if (dialogToDelete !== null) {
      onDelete(dialogToDelete);
      setIsDeleteDialogOpen(false);
      setDialogToDelete(null);
    }
  };

  const renderSettingsButton = (isCollapsed: boolean = false) => {
    const button = (
      <Button
        variant="ghost"
        size="icon"
        className={`rounded-full border border-transparent hover:border-[#E5E5E5] hover:shadow-sm transition-all duration-200 ${
          isCollapsed ? "h-12 w-12" : "h-10 w-10"
        }`}
        onClick={settingsMenuItems ? undefined : onSettingsClick}
      >
        <span className="sr-only">{t("chatLeftSidebar.settings")}</span>
        <svg
          className="h-5 w-5 text-[#6B6B6B] transition-transform duration-200"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .69.28 1.35.77 1.84.49.49 1.15.77 1.84.77H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </Button>
    );

    if (settingsMenuItems && settingsMenuItems.length > 0) {
      const dropdownMenu: MenuProps = {
        items: settingsMenuItems.map((item) => ({
          key: item.key,
          label: item.label,
          onClick: item.onClick,
          style: { padding: "8px 16px" },
        })),
        style: {
          minWidth: "220px",
          borderRadius: "12px",
          boxShadow: "0 18px 40px rgba(0,0,0,0.1)",
        },
      };

      return (
        <ConfigProvider getPopupContainer={() => document.body}>
          <Dropdown menu={dropdownMenu} trigger={["click"]} placement="topRight">
            <div>{button}</div>
          </Dropdown>
        </ConfigProvider>
      );
    }

    return button;
  };

  const renderDialogList = (dialogs: ConversationListItem[], title: string) => {
    if (dialogs.length === 0) return null;

    return (
      <div className={`mt-4 ${slidingContentClass}`}>
        <p
          className={`text-[11px] uppercase tracking-[0.35em] text-[#BAA890] mb-2 ${fadingContentClass}`}
        >
          {title}
        </p>
        <div className="space-y-1.5">
          {dialogs.map((dialog) => (
            <div
              key={dialog.conversation_id}
              className={`group flex items-center rounded-2xl px-3 py-2 transition-all duration-200 ${
                selectedConversationId === dialog.conversation_id
                  ? "bg-white shadow-sm shadow-[#E6DED2]"
                  : "hover:bg-white/70"
              }`}
            >
              {editingId === dialog.conversation_id ? (
                <Input
                  ref={inputRef}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSubmitEdit}
                  className="h-9 text-sm"
                  autoFocus
                />
              ) : (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex-1 text-left min-w-0 py-1.5 px-1 rounded hover:bg-transparent"
                          onClick={() => onDialogClick(dialog)}
                        >
                          <div className="flex items-center w-full">
                            <ConversationStatusIndicator
                              isStreaming={streamingConversations.has(
                                dialog.conversation_id
                              )}
                              isCompleted={completedConversations.has(
                                dialog.conversation_id
                              )}
                            />
                            <span className="text-sm font-medium text-[#1A1A1A] truncate">
                              {dialog.conversation_title}
                            </span>
                          </div>
                          {/* Patient info row - simplified */}
                          {(dialog as any).patient_name && (
                            <div className="flex items-center mt-1">
                              <UserCircle2 className="h-3 w-3 mr-1 text-[#999] flex-shrink-0" />
                              <span className="text-xs text-[#999] truncate">
                                {(dialog as any).patient_name}
                              </span>
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="break-words">
                          {dialog.conversation_title}
                        </p>
                        {(dialog as any).patient_name && (
                          <p className="text-xs text-gray-400 mt-1">
                            患者: {(dialog as any).patient_name}
                          </p>
                        )}
                        {(dialog as any).tags && (dialog as any).tags.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            标签: {(dialog as any).tags.join(", ")}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <DropdownMenu
                    open={openDropdownId === dialog.conversation_id.toString()}
                    onOpenChange={(open) =>
                      onDropdownOpenChange(
                        open,
                        dialog.conversation_id.toString()
                      )
                    }
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-[#F5F5F5] rounded-full"
                      >
                        <MoreHorizontal className="h-4 w-4 text-[#6B6B6B]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom">
                      <DropdownMenuItem
                        onClick={() =>
                          handleStartEdit(
                            dialog.conversation_id,
                            dialog.conversation_title
                          )
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("chatLeftSidebar.rename")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500 focus:text-red-500"
                        onClick={() => handleDeleteClick(dialog.conversation_id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("chatLeftSidebar.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUserSection = () => {
    if (userAuthLoading) {
      return (
        <div className="flex items-center gap-3">
          <Spin size="default" />
          <span className="text-sm text-[#6B6B6B]">{t("common.loading")}</span>
        </div>
      );
    }

    if (isSpeedMode) {
      return null;
    }

    return (
      <button
        className={`w-full flex items-center rounded-2xl border border-[#E0D6C6] bg-white hover:bg-[#FDF8F2] transition-all duration-200 hover:shadow-sm px-3 ${
          expanded ? "justify-between" : "justify-center"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-[#F2F0EB] flex items-center justify-center flex-shrink-0">
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt={userEmail || userName || "user"}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-[#6B6B6B]" />
            )}
          </div>
          <div
            className={`text-left min-w-0 transition-opacity duration-150 ease-out ${
              showText ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">
              {userName || userEmail || "用户"}
            </p>
            <p className="text-xs text-[#6B6B6B]">Pro plan</p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[#6B6B6B] flex-shrink-0 transition-opacity duration-150 ease-out ${
            showText ? "opacity-100" : "opacity-0"
          }`}
        />
      </button>
    );
  };

  return (
    <>
      <div className="relative hidden md:flex h-full flex-shrink-0">
        <button
          type="button"
          className="absolute z-20 flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E5E5] bg-white shadow-sm transition-all duration-200 hover:shadow-md"
          style={{
            top: "26px",
            left: expanded ? `${SIDEBAR_EXPANDED_WIDTH - 20}px` : "52px",
            transition: "left 300ms ease-in-out",
          }}
          onClick={onToggleSidebar}
        >
          {expanded ? (
            <ChevronLeft className="h-5 w-5 text-[#6B6B6B]" />
          ) : (
            <ChevronRight className="h-5 w-5 text-[#6B6B6B]" />
          )}
        </button>

        <div
          className="flex h-full flex-col flex-shrink-0 overflow-hidden bg-[#FDF8F2] border-r border-[#E5E5E5] transition-[width] duration-300 ease-in-out"
          style={{
            width: expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
          }}
        >
          <div className="flex flex-col pt-20 pb-2 gap-4 items-center">
            {/* New Chat Button */}
            <div className="flex items-center w-full px-3">
              <button
                className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: accentColor }}
                onClick={onNewConversation}
              >
                <Plus className="h-5 w-5" />
              </button>
              <span className={`ml-3 text-sm font-medium text-[#1A1A1A] whitespace-nowrap transition-opacity duration-150 ease-out ${
                showText ? "opacity-100" : "opacity-0"
              }`}>
                {t("chatLeftSidebar.newConversation")}
              </span>
            </div>

            {/* Navigation Items */}
            <div className="flex flex-col gap-1 mt-2 w-full px-3">
              {portalConfig.navItems.map((item) => {
                const isActive = activeNavItem === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavItemClick?.(item.id)}
                    className={`flex items-center w-full h-11 rounded-2xl transition-colors ${
                      isActive
                        ? "text-[#1A1A1A] bg-white shadow-sm"
                        : "text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white/70"
                    }`}
                  >
                    <div className="h-11 w-11 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <span className={`ml-3 text-lg whitespace-nowrap transition-opacity duration-150 ease-out ${
                      isActive ? "text-[#1A1A1A] font-medium" : "text-[#4D4D4D]"
                    } ${showText ? "opacity-100" : "opacity-0"}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expanded Content Area */}
          <div
            className={`flex flex-col flex-1 overflow-hidden transition-opacity ease-in-out ${
              expanded ? "px-4" : "px-0"
            } ${
              showText
                ? "opacity-100 duration-200 delay-100"
                : "opacity-0 duration-100 delay-0"
            }`}
          >
            {expanded && (
              <>
                {/* Search and Filter Section - Compact Design */}
                <div className="pt-4 pb-3 flex-shrink-0">
                  {/* Search Input */}
                  <div className="flex items-center rounded-xl border border-[#E8E2D6] bg-white px-3 h-9">
                    <Search className="h-3.5 w-3.5 text-[#B3AEA5] flex-shrink-0" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="搜索对话..."
                      className="border-0 bg-transparent text-xs focus-visible:ring-0 ml-2 h-7 px-0"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="text-[#B3AEA5] hover:text-[#6B6B6B] ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills - inline style */}
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      onClick={() => setStatusFilter(statusFilter === 'active' ? null : 'active')}
                      className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                        statusFilter === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-[#F5F2ED] text-[#8B8680] hover:bg-[#EBE6DF]'
                      }`}
                    >
                      进行中
                    </button>

                    <button
                      onClick={() => setStatusFilter(statusFilter === 'pending_followup' ? null : 'pending_followup')}
                      className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                        statusFilter === 'pending_followup'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-[#F5F2ED] text-[#8B8680] hover:bg-[#EBE6DF]'
                      }`}
                    >
                      待跟进
                    </button>

                    <button
                      onClick={() => setStatusFilter(statusFilter === 'difficult_case' ? null : 'difficult_case')}
                      className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                        statusFilter === 'difficult_case'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-[#F5F2ED] text-[#8B8680] hover:bg-[#EBE6DF]'
                      }`}
                    >
                      疑难
                    </button>

                    {(statusFilter || tagFilter) && (
                      <button
                        onClick={() => {
                          setStatusFilter(null);
                          setTagFilter(null);
                        }}
                        className="text-[10px] px-1.5 py-0.5 text-[#B3AEA5] hover:text-[#6B6B6B]"
                      >
                        重置
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable Conversation List */}
                <div className="flex-1 overflow-y-auto pr-1" style={{ minHeight: 0 }}>
                  {conversationList.length > 0 ? (
                    <>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-[#BAA890] mb-4">
                        {portalConfig.recentLabel}
                      </p>
                      {renderDialogList(today, t("chatLeftSidebar.today"))}
                      {renderDialogList(week, t("chatLeftSidebar.last7Days"))}
                      {renderDialogList(older, t("chatLeftSidebar.older"))}
                    </>
                  ) : (
                    <div className="text-center text-sm text-[#6B6B6B] mt-10">
                      {t("chatLeftSidebar.noHistory")}
                    </div>
                  )}
                </div>

                {/* Bottom User Section - Fixed */}
                <div className="pb-6 pt-4 flex-shrink-0 border-t border-[#EFE8DE] mt-2">
                  {renderUserSection()}
                  <div className="mt-3 flex items-center justify-between">
                    {!isSpeedMode && userRole ? (
                      <Tag color={getRoleColor(userRole)}>{userRole}</Tag>
                    ) : (
                      <span />
                    )}
                    {renderSettingsButton(false)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom Section: Settings & User (collapsed state) */}
          {!expanded && (
            <div className="mt-auto flex flex-col items-center gap-4 pb-4">
              {renderSettingsButton(true)}
              {!isSpeedMode && (
                <div className="h-10 w-10 rounded-full overflow-hidden bg-[#F2F0EB] flex items-center justify-center">
                  {userAvatarUrl ? (
                    <img
                      src={userAvatarUrl}
                      alt={userEmail || userName || "user"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-[#6B6B6B]" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {t("chatLeftSidebar.confirmDeletionTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("chatLeftSidebar.confirmDeletionDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              {t("chatLeftSidebar.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("chatLeftSidebar.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
