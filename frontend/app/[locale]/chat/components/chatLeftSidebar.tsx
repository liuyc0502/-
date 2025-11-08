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
}: ChatSidebarProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoading: userAuthLoading, isSpeedMode } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dialogToDelete, setDialogToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  const handleStartEdit = (dialogId: number, title: string) => {
    setEditingId(dialogId);
    setEditingTitle(title);
    onDropdownOpenChange(false, null);
  };

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
      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[#BAA890] mb-2">
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
      <button className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-[#E0D6C6] bg-white hover:bg-[#FDF8F2] transition-all duration-200 hover:shadow-sm">
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
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">
              {userName || userEmail || "用户"}
            </p>
            <p className="text-xs text-[#6B6B6B]">Pro plan</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-[#6B6B6B] flex-shrink-0 transition-transform duration-200" />
      </button>
    );
  };

  const renderExpandedSidebar = () => (
    <div className="hidden md:flex h-full flex-col bg-[#FDF8F2] border-r border-[#E5E5E5] transition-all duration-300 ease-in-out w-[340px]">
      <div className="flex items-center justify-between pl-4 pr-5 pt-6 pb-2">
        <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ width: 'calc(100% - 48px)' }}>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#B1997B] opacity-100 transition-opacity duration-300">
            {portalConfig.brandName}
          </p>
          <p className="text-xl font-semibold text-[#1A1A1A] mt-2 opacity-100 transition-opacity duration-300">
            {portalConfig.newChatLabel}
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-white transition-all duration-200 hover:shadow-sm flex-shrink-0"
                onClick={onToggleSidebar}
              >
                <ChevronLeft className="h-5 w-5 text-[#6B6B6B] transition-transform duration-200" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t("chatLeftSidebar.collapseSidebar")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="px-4 mt-2">
        <button
          className="w-full flex items-center gap-3 py-3 pl-2 pr-4 rounded-3xl border border-[#E5E5E5] bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
          onClick={onNewConversation}
        >
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-all duration-200"
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="h-5 w-5" />
          </div>
          <div className="text-left min-w-0 overflow-hidden">
            <p className="text-sm font-semibold text-[#1A1A1A] opacity-100 transition-opacity duration-300 delay-75">
              {portalConfig.newChatLabel}
            </p>
            {portalConfig.newChatDescription && (
              <p className="text-xs text-[#6B6B6B] opacity-100 transition-opacity duration-300 delay-75">
                {portalConfig.newChatDescription}
              </p>
            )}
          </div>
        </button>
      </div>

      <div className="px-4 mt-4 space-y-1">
        {portalConfig.navItems.map((item, index) => (
          <button
            key={item.id}
            className="w-full flex items-center gap-3 py-2 pl-2 pr-3 rounded-2xl text-sm text-[#4D4D4D] hover:bg-white transition-all duration-200 hover:scale-[1.02]"
            type="button"
          >
            <div className="h-11 w-11 flex items-center justify-center flex-shrink-0">
              <item.icon className="h-4 w-4 transition-transform duration-200" />
            </div>
            <span className="truncate opacity-100 transition-opacity duration-300" style={{ transitionDelay: `${75 + index * 25}ms` }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <div className="px-4 pt-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B3AEA5] transition-transform duration-200" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={portalConfig.searchPlaceholder}
            className="pl-10 pr-4 h-11 rounded-2xl bg-white border-[#EFE8DE] placeholder:text-[#B3AEA5] focus-visible:ring-0 text-sm transition-all duration-200 hover:border-[#D8CDC2]"
          />
        </div>
      </div>

      <StaticScrollArea className="flex-1 px-5 pb-6 mt-6">
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

      <div className="px-5 pb-5 space-y-3">
        {renderUserSection()}
        <div className="flex items-center justify-between transition-all duration-200">
          {!isSpeedMode && userRole ? (
            <Tag color={getRoleColor(userRole)}>{userRole}</Tag>
          ) : (
            <span />
          )}
          {renderSettingsButton(false)}
        </div>
      </div>
    </div>
  );

  const renderCollapsedSidebar = () => (
    <div className="hidden md:flex h-full flex-col bg-[#FDF8F2] border-r border-[#E5E5E5] w-[84px] transition-all duration-300 ease-in-out pt-6 pl-4">
      <button
        className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 flex-shrink-0"
        onClick={onToggleSidebar}
      >
        <ChevronRight className="h-5 w-5 text-[#6B6B6B] transition-transform duration-200" />
      </button>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="h-12 w-12 rounded-full flex items-center justify-center text-white mt-6 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
              style={{ backgroundColor: accentColor }}
              onClick={onNewConversation}
            >
              <Plus className="h-5 w-5 transition-transform duration-200" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{portalConfig.newChatLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="mt-6 flex-1 flex flex-col gap-3">
        {portalConfig.navItems.map((item) => (
          <TooltipProvider key={item.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="h-11 w-11 rounded-2xl bg-white flex items-center justify-center text-[#6B6B6B] hover:scale-105 hover:shadow-sm transition-all duration-200 flex-shrink-0">
                  <item.icon className="h-4 w-4 transition-transform duration-200" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      <div className="flex flex-col gap-4 pb-6">
        {renderSettingsButton(true)}
        {!isSpeedMode && (
          <div className="h-10 w-10 rounded-full overflow-hidden bg-[#F2F0EB] flex items-center justify-center transition-all duration-200 hover:scale-105 flex-shrink-0">
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
    </div>
  );

  return (
    <>
      {expanded ? renderExpandedSidebar() : renderCollapsedSidebar()}

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
