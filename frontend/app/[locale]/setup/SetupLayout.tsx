"use client";

import React, {ReactNode} from "react";
import {useRouter} from "next/navigation";
import {useTranslation} from "react-i18next";

import {Badge, Dropdown} from "antd";
import {DownOutlined} from "@ant-design/icons";
import {FiArrowLeft, FiRefreshCw} from "react-icons/fi";
import {Globe} from "lucide-react";
import {languageOptions} from "@/const/constants";
import {useLanguageSwitch} from "@/lib/language";
import {HEADER_CONFIG} from "@/const/layoutConstants";
import {CONNECTION_STATUS, ConnectionStatus,} from "@/const/modelConfig";

// ================ Header ================
interface HeaderProps {
  connectionStatus: ConnectionStatus;
  isCheckingConnection: boolean;
  onCheckConnection: () => void;
  title: string;
  description: string;
}

function Header({
  connectionStatus,
  isCheckingConnection,
  onCheckConnection,
  title,
  description,
}: HeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentLanguage, handleLanguageChange } = useLanguageSwitch();

  // Get status text
  const getStatusText = () => {
    switch (connectionStatus) {
      case CONNECTION_STATUS.SUCCESS:
        return t("setup.header.status.connected");
      case CONNECTION_STATUS.ERROR:
        return t("setup.header.status.disconnected");
      case CONNECTION_STATUS.PROCESSING:
        return t("setup.header.status.checking");
      default:
        return t("setup.header.status.unknown");
    }
  };

  return (
    <header
      className="w-full py-4 px-6 flex items-center justify-between border-b border-[#E8E2D6] bg-[#FDF8F2]"
      style={{ height: HEADER_CONFIG.HEIGHT }}
    >
      <div className="flex items-center">
        <button
          onClick={() => router.push("/")}
          className="mr-3 p-2 rounded-full hover:bg-[#F5F2ED] transition-colors"
          aria-label={t("setup.header.button.back")}
        >
          <FiArrowLeft className="text-[#6B6B6B] text-xl" />
        </button>
        <h1 className="text-xl font-bold text-[#D94527]">
          {title}
        </h1>
        <div className="mx-3 h-5 border-l border-[#E0D6C6]"></div>
        <span className="text-[#8B8680] text-sm">
          {description}
        </span>
      </div>
      {/* Language switch */}
      <div className="flex items-center gap-3">
        <Dropdown
          menu={{
            items: languageOptions.map((opt) => ({
              key: opt.value,
              label: opt.label,
            })),
            onClick: ({ key }) => handleLanguageChange(key as string),
          }}
        >
          <a className="ant-dropdown-link text-sm font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors flex items-center gap-2 cursor-pointer">
            <Globe className="h-4 w-4" />
            {languageOptions.find((o) => o.value === currentLanguage)?.label ||
              currentLanguage}
            <DownOutlined className="text-[10px]" />
          </a>
        </Dropdown>
        {/* ModelEngine connectivity status */}
        <div className="flex items-center px-3 py-1.5 rounded-xl border border-[#E8E2D6] bg-white">
          <Badge
            status={connectionStatus}
            text={getStatusText()}
            className="[&>.ant-badge-status-dot]:w-[8px] [&>.ant-badge-status-dot]:h-[8px] [&>.ant-badge-status-text]:text-sm [&>.ant-badge-status-text]:ml-2 [&>.ant-badge-status-text]:text-[#6B6B6B]"
          />
          <button
            onClick={onCheckConnection}
            disabled={isCheckingConnection}
            className="ml-2 p-1 rounded-md hover:bg-[#F5F2ED] transition-colors disabled:opacity-50"
          >
            <FiRefreshCw
              className={`text-[#6B6B6B] ${isCheckingConnection ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>
    </header>
  );
}

// ================ Navigation ================
interface NavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  onComplete?: () => void;
  isSaving?: boolean;
  showBack?: boolean;
  showNext?: boolean;
  showComplete?: boolean;
  nextText?: string;
  completeText?: string;
}

function Navigation({
  onBack,
  onNext,
  onComplete,
  isSaving = false,
  showBack = false,
  showNext = false,
  showComplete = false,
  nextText,
  completeText,
}: NavigationProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (showComplete && onComplete) {
      onComplete();
    } else if (showNext && onNext) {
      onNext();
    }
  };

  const buttonText = () => {
    if (showComplete) {
      return isSaving
        ? t("setup.navigation.button.saving")
        : completeText || t("setup.navigation.button.complete");
    }
    if (showNext) {
      return nextText || t("setup.navigation.button.next");
    }
    return "";
  };

  return (
    <div className="mt-4 flex justify-between px-6">
      <div className="flex gap-2">
        {showBack && onBack && (
          <button
            onClick={onBack}
            className="px-5 py-2 rounded-xl flex items-center text-sm font-medium bg-white border border-[#E8E2D6] text-[#6B6B6B] hover:bg-[#F5F2ED] cursor-pointer transition-colors"
          >
            {t("setup.navigation.button.previous")}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(showNext || showComplete) && (
          <button
            onClick={handleClick}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl flex items-center text-sm font-medium bg-[#D94527] text-white hover:bg-[#C13D22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{
              border: "none",
              marginLeft: !showBack ? "auto" : undefined,
            }}
          >
            {buttonText()}
          </button>
        )}
      </div>
    </div>
  );
}

// ================ Layout ================
interface SetupLayoutProps {
  children: ReactNode;
  connectionStatus: ConnectionStatus;
  isCheckingConnection: boolean;
  onCheckConnection: () => void;
  title: string;
  description: string;
  onBack?: () => void;
  onNext?: () => void;
  onComplete?: () => void;
  isSaving?: boolean;
  showBack?: boolean;
  showNext?: boolean;
  showComplete?: boolean;
  nextText?: string;
  completeText?: string;
}

export default function SetupLayout({
  children,
  connectionStatus,
  isCheckingConnection,
  onCheckConnection,
  title,
  description,
  onBack,
  onNext,
  onComplete,
  isSaving = false,
  showBack = false,
  showNext = false,
  showComplete = false,
  nextText,
  completeText,
}: SetupLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans">
      <Header
        connectionStatus={connectionStatus}
        isCheckingConnection={isCheckingConnection}
        onCheckConnection={onCheckConnection}
        title={title}
        description={description}
      />

      {/* Main content */}
      <div className="max-w-[1800px] mx-auto px-8 pb-4 mt-6 bg-transparent">
        {children}
        <Navigation
          onBack={onBack}
          onNext={onNext}
          onComplete={onComplete}
          isSaving={isSaving}
          showBack={showBack}
          showNext={showNext}
          showComplete={showComplete}
          nextText={nextText}
          completeText={completeText}
        />
      </div>
    </div>
  );
}
