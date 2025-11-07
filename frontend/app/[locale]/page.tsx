"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dropdown, App } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { languageOptions } from "@/const/constants";
import { useLanguageSwitch } from "@/lib/language";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { PORTAL_ROUTES } from "@/types/portal";

// Portal type definition
type PortalType = "doctor" | "student" | "patient" | "admin";

interface Portal {
  id: PortalType;
  title: string;
  subtitle: string;
  buttonText: string;
  loginTitle: string;
  color: string;
}

const portals: Portal[] = [
  {
    id: "doctor",
    title: "智能洞察",
    subtitle: "辅佐诊断",
    buttonText: "进入医生端",
    loginTitle: "病理医生端",
    color: "#1e293b",
  },
  {
    id: "student",
    title: "智研病理",
    subtitle: "AI启蒙",
    buttonText: "进入学生端",
    loginTitle: "医学生端",
    color: "#0f172a",
  },
  {
    id: "patient",
    title: "医学知识",
    subtitle: "触手可及",
    buttonText: "进入患者端",
    loginTitle: "患者端",
    color: "#334155",
  },
  {
    id: "admin",
    title: "全面管理",
    subtitle: "实时监控",
    buttonText: "进入管理端",
    loginTitle: "管理员端",
    color: "#475569",
  },
];

export default function Home() {
  const { t } = useTranslation("common");
  const { message } = App.useApp();
  const router = useRouter();
  const { login, register, isLoading: authLoading } = useAuth();
  const { currentLanguage, handleLanguageChange } = useLanguageSwitch();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedPortal, setExpandedPortal] = useState<PortalType | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number; width: number; height: number; finalTop: number; finalLeft: number } | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (expandedPortal) return; // Disable navigation when form is open

      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : portals.length - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev < portals.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedPortal]);

  const handlePortalClick = (portalId: PortalType, e: React.MouseEvent<HTMLButtonElement>) => {
    // Admin portal: direct navigation to setup page
    if (portalId === "admin") {
      router.push("/setup");
      return;
    }

    // For other portals: show login form
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    
    // Calculate final form position with padding from edges
    const formWidth = 420;
    const formHeight = 600;
    const padding = 40;
    
    // Calculate ideal position (expand from button position)
    let finalLeft = rect.left - 100;
    let finalTop = rect.top - 200;
    
    // Ensure form stays within viewport
    finalLeft = Math.max(padding, Math.min(finalLeft, window.innerWidth - formWidth - padding));
    finalTop = Math.max(padding, Math.min(finalTop, window.innerHeight - formHeight - padding));
    
    setButtonPosition({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      finalTop,
      finalLeft,
    });
    setExpandedPortal(portalId);
  };

  const handleClose = () => {
    setExpandedPortal(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRememberMe(false);
    setShowRegisterForm(false);
    setButtonPosition(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      message.warning(t("auth.pleaseEnterEmailAndPassword", "请输入邮箱和密码"));
      return;
    }

    if (!expandedPortal) return;

    setIsLoggingIn(true);
    
    try {
      // Call login function (showSuccessMessage = false, we'll show custom message)
      await login(email, password, false);
      
      // Login successful, navigate to the corresponding portal
      const portalRoute = PORTAL_ROUTES[expandedPortal];
      if (portalRoute) {
        message.success(t("auth.loginSuccess", "登录成功"));
        // Add slight delay to ensure state is updated before navigation
        setTimeout(() => {
          router.push(portalRoute);
        }, 100);
      }
      
      handleClose();
    } catch (error: any) {
      // Error handling
      const errorMessage = error?.message || t("auth.loginFailed", "登录失败");
      message.error(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      message.warning("请填写完整的注册信息");
      return;
    }

    if (password !== confirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }

    if (password.length < 6) {
      message.error("密码长度至少为6位");
      return;
    }

    if (!expandedPortal) return;

    setIsRegistering(true);
    
    try {
      // Call register function
      await register(email, password);
      
      // Registration successful, navigate to the corresponding portal
      const portalRoute = PORTAL_ROUTES[expandedPortal];
      if (portalRoute) {
        message.success("注册成功！");
        // Add slight delay to ensure state is updated before navigation
        setTimeout(() => {
          router.push(portalRoute);
        }, 100);
      }
      
      handleClose();
    } catch (error: any) {
      // Error handling
      const errorMessage = error?.message || "注册失败，请重试";
      message.error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const toggleForm = () => {
    setShowRegisterForm(!showRegisterForm);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : portals.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < portals.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white flex flex-col">
      {/* Header Navigation */}
      <header className="w-full py-4 px-6 flex items-center justify-between border-b border-slate-200 bg-white z-20">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 flex items-start">
            <img
              src="/modelengine-logo2.png"
              alt="ModelEngine"
              className="h-6"
            />
            <span className="text-blue-600 ml-2">
              {t("assistant.name")}
            </span>
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="https://github.com/ModelEngine-Group/nexent"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            Github
          </Link>
          <Link href="http://modelengine-ai.net" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            ModelEngine
          </Link>
          <Dropdown
            menu={{
              items: languageOptions.map((opt) => ({
                key: opt.value,
                label: opt.label,
              })),
              onClick: ({ key }) => handleLanguageChange(key as string),
            }}
          >
            <a className="ant-dropdown-link text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2 cursor-pointer">
              <Globe className="h-4 w-4" />
              {languageOptions.find((o) => o.value === currentLanguage)?.label || currentLanguage}
              <DownOutlined className="text-[10px]" />
            </a>
          </Dropdown>
        </div>
      </header>

      {/* Main content container with horizontal scroll */}
      <div className="flex-1 relative overflow-hidden">
        <div className="relative w-full h-full flex">
          {portals.map((portal, index) => (
            <div
              key={portal.id}
              ref={containerRef}
              className="absolute inset-0 h-full flex items-start justify-between px-32 pt-20 transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(${(index - currentIndex) * 100}%)`,
              }}
            >
                {/* Title - left side, upper area */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: currentIndex === index ? 1 : 0.3, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex-1 pt-16"
                >
                  <h1
                    className="font-mono leading-tight"
                    style={{
                      fontSize: "96px",
                      fontFamily: "'Courier New', Monaco, 'Roboto Mono', monospace",
                      color: portal.color,
                      lineHeight: 1.15,
                    }}
                  >
                    {portal.title}
                    <br />
                    <span className="ml-80">{portal.subtitle}</span>
                  </h1>
                </motion.div>

                {/* CTA Button - right side, upper area */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: currentIndex === index ? 1 : 0.3,
                    scale: currentIndex === index ? 1 : 0.9,
                  }}
                  transition={{ duration: 0.4 }}
                  className="flex items-start justify-start"
                  style={{ paddingTop: "210px", paddingRight: "180px" }}
                >
                  <Button
                    onClick={(e) => handlePortalClick(portal.id, e)}
                    className="relative bg-gray-900 text-white border-2 border-gray-900 px-12 py-8 text-xl font-semibold hover:bg-gray-800 transition-all duration-300 hover:scale-105"
                    style={{
                      borderRadius: "8px",
                      fontFamily: "'Inter', 'SF Pro', Arial, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {portal.buttonText}
                  </Button>
                </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {!expandedPortal && (
        <>
          <button
            onClick={goToPrevious}
            className="fixed left-6 top-1/2 -translate-y-1/2 z-10 transition-all duration-200 hover:opacity-70"
            aria-label="Previous portal"
          >
            <ChevronLeft className="w-10 h-10 text-gray-900" strokeWidth={3} />
          </button>
          <button
            onClick={goToNext}
            className="fixed right-6 top-1/2 -translate-y-1/2 z-10 transition-all duration-200 hover:opacity-70"
            aria-label="Next portal"
          >
            <ChevronRight className="w-10 h-10 text-gray-900" strokeWidth={3} />
          </button>
        </>
      )}

      {/* Page indicators */}
      {!expandedPortal && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {portals.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentIndex === index
                  ? "bg-gray-900 w-8"
                  : "bg-gray-400 hover:bg-gray-600"
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}


      {/* Login form - expands in place */}
      <AnimatePresence>
        {expandedPortal && buttonPosition && (
          <motion.div
            initial={{
              top: buttonPosition.top,
              left: buttonPosition.left,
              width: buttonPosition.width,
              height: buttonPosition.height,
              borderRadius: "8px",
            }}
            animate={{
              top: buttonPosition.finalTop,
              left: buttonPosition.finalLeft,
              width: 420,
              height: 600,
              borderRadius: "16px",
            }}
            exit={{
              top: buttonPosition.top,
              left: buttonPosition.left,
              width: buttonPosition.width,
              height: buttonPosition.height,
              borderRadius: "8px",
            }}
            transition={{
              duration: 0.4,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="fixed z-50 bg-white shadow-2xl"
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
              {/* Button text shown during exit animation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 1 }}
                transition={{ 
                  duration: 0.1,
                  delay: 0.35
                }}
                className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-white bg-gray-900 border-2 border-gray-900 pointer-events-none"
                style={{
                  fontFamily: "'Inter', 'SF Pro', Arial, sans-serif",
                  fontWeight: 600,
                  borderRadius: "inherit",
                }}
              >
                {portals.find((p) => p.id === expandedPortal)?.buttonText}
              </motion.div>
              {/* Close button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 hover:rotate-90 transition-all duration-300 z-10"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </motion.button>

              {/* Form content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="p-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {portals.find((p) => p.id === expandedPortal)?.loginTitle}
                  {showRegisterForm ? "注册" : "登录"}
                </h2>

                <form onSubmit={showRegisterForm ? handleRegisterSubmit : handleLogin} className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="text-sm text-gray-600 mb-2">
                      邮箱地址
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="请输入您的邮箱"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm text-gray-600 mb-2">
                      密码
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={showRegisterForm ? "请输入密码（至少6位）" : "请输入您的密码"}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                      required
                    />
                  </div>

                  {/* Confirm password field - only show in register mode */}
                  {showRegisterForm && (
                    <div>
                      <Label htmlFor="confirmPassword" className="text-sm text-gray-600 mb-2">
                        确认密码
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="请再次输入密码"
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                        required
                      />
                    </div>
                  )}

                  {!showRegisterForm && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked: boolean) =>
                            setRememberMe(checked)
                          }
                        />
                        <Label
                          htmlFor="remember"
                          className="text-sm text-gray-600 cursor-pointer"
                        >
                          记住我
                        </Label>
                      </div>
                      <a
                        href="#"
                        className="text-sm text-gray-900 hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          console.log("Forgot password");
                        }}
                      >
                        忘记密码？
                      </a>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoggingIn || isRegistering || authLoading}
                    className="w-full bg-gray-900 text-white py-3 rounded-md text-base font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ height: "48px" }}
                  >
                    {showRegisterForm 
                      ? (isRegistering ? "注册中..." : "注册") 
                      : (isLoggingIn ? "登录中..." : "登录")
                    }
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">
                        {showRegisterForm ? "已有账号？" : "还没有账号？"}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={toggleForm}
                    disabled={isLoggingIn || isRegistering}
                    variant="outline"
                    className="w-full border-2 border-gray-900 text-gray-900 py-3 rounded-md text-base font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ height: "48px" }}
                  >
                    {showRegisterForm ? "返回登录" : "注册新账号"}
                  </Button>
                </form>
              </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
