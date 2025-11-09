"use client";

import { useState, useRef, useEffect } from "react";
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
import { StaticScrollArea } from "@/components/ui/scrollArea";
import { getRoleColor } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { Spin, Tag, ConfigProvider, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useTranslation } from "react-i18next";

import type { ChatSidebarProps, ConversationListItem } from "@/types/chat";

const SIDEBAR_EXPANDED_WIDTH = 200;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const TEXT_FADE_IN_DELAY = 100;
const TEXT_FADE_OUT_DURATION = 100;

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

  const filteredConversations = conversationList.filter((dialog) =>
    dialog.conversation_title
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );
  const { today, week, older } = categorizeDialogs(filteredConversations);

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

  // Text content transition with delay on expand, immediate on collapse
  const slidingContentClass = `transition-all ease-out pointer-events-auto ${
    showText
      ? "opacity-100 translate-x-0 duration-200 delay-100"
      : "opacity-0 -translate-x-2 duration-100 delay-0 pointer-events-none"
  }`;

  const fadingContentClass = `transition-opacity ease-in-out ${
    showText ? "opacity-100 duration-200 delay-100" : "opacity-0 duration-100 delay-0"
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
                        <Button
                          variant="ghost"
                          className="flex-1 justify-start text-left hover:bg-transparent min-w-0"
                          onClick={() => onDialogClick(dialog)}
                        >
                          <ConversationStatusIndicator
                            isStreaming={streamingConversations.has(
                              dialog.conversation_id
                            )}
                            isCompleted={completedConversations.has(
                              dialog.conversation_id
                            )}
                          />
                          <span className="truncate block text-sm font-medium text-[#1A1A1A]">
                            {dialog.conversation_title}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="break-words">
                          {dialog.conversation_title}
                        </p>
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
            className={`text-left min-w-0 transition-all ease-out ${
              showText
                ? "opacity-100 translate-x-0 duration-200 delay-100"
                : "opacity-0 -translate-x-2 duration-100 delay-0 pointer-events-none"
            }`}
          >
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">
              {userName || userEmail || "用户"}
            </p>
            <p className="text-xs text-[#6B6B6B]">Pro plan</p>
          </div>
        </div>
        <ChevronDown 
          className={`h-4 w-4 text-[#6B6B6B] flex-shrink-0 transition-all ease-in-out ${
            showText ? "opacity-100 duration-200 delay-100" : "opacity-0 duration-100 delay-0"
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
            top: '26px',
            left: expanded ? `${SIDEBAR_EXPANDED_WIDTH - 20}px` : '52px',
            transition: 'left 300ms ease-in-out'
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
              <span className={`ml-3 text-sm font-medium text-[#1A1A1A] whitespace-nowrap transition-all ease-out ${
                showText
                  ? "opacity-100 translate-x-0 duration-200 delay-100"
                  : "opacity-0 -translate-x-2 duration-100 delay-0"
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
                    <span className={`ml-3 text-lg whitespace-nowrap transition-all ease-out ${
                      isActive ? "text-[#1A1A1A] font-medium" : "text-[#4D4D4D]"
                    } ${
                      showText
                        ? "opacity-100 translate-x-0 duration-200 delay-100"
                        : "opacity-0 -translate-x-2 duration-100 delay-0"
                    }`}>
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
              expanded ? 'px-4' : 'px-0'
            } ${
              showText ? "opacity-100 duration-200 delay-100" : "opacity-0 duration-100 delay-0"
            }`}
          >
            {expanded && (
              <>
                <div className="flex flex-col pt-4 pb-6 space-y-4">

                  <div>
                    <div className="flex items-center rounded-2xl border border-[#EFE8DE] bg-white px-4 h-11">
                      <Search className="h-4 w-4 text-[#B3AEA5]" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={portalConfig.searchPlaceholder}
                        className="border-0 bg-transparent text-sm focus-visible:ring-0 ml-3"
                      />
                    </div>
                  </div>

                  <StaticScrollArea className="flex-1 pr-2">
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
                  </StaticScrollArea>
                </div>

                <div className="pb-6">
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
