"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Microscope, HeartPulse, Settings, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { App } from "antd";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { PORTAL_ROUTES } from "@/types/portal";
import type { ComponentType, SVGProps } from "react";

type PortalType = "doctor" | "patient" | "admin";

interface Portal {
  id: PortalType;
  title: string;
  subtitle: string;
  description: string;
  loginTitle: string;
  accentColor: string;
  accentLight: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const portals: Portal[] = [
  {
    id: "doctor",
    title: "病理医生",
    subtitle: "智能洞察，辅佐诊断",
    description: "AI 驱动的病理分析工具，助力精准诊断与高效工作流",
    loginTitle: "病理医生端",
    accentColor: "#DA7756",
    accentLight: "#FDF0EB",
    icon: Microscope,
  },
  {
    id: "patient",
    title: "患者",
    subtitle: "医学知识，触手可及",
    description: "通俗易懂的医学解读，帮助您更好地了解自身健康状况",
    loginTitle: "患者端",
    accentColor: "#6E977B",
    accentLight: "#EFF7F5",
    icon: HeartPulse,
  },
  {
    id: "admin",
    title: "管理员",
    subtitle: "全面管理，实时监控",
    description: "智能体配置与系统管理，掌控全局运行状态",
    loginTitle: "管理员端",
    accentColor: "#586E9F",
    accentLight: "#F3EFF7",
    icon: Settings,
  },
];

export default function Home() {
  const { t } = useTranslation("common");
  const { message } = App.useApp();
  const router = useRouter();
  const { login, register, isLoading: authLoading } = useAuth();

  const [expandedPortal, setExpandedPortal] = useState<PortalType | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  const handleClose = () => {
    setExpandedPortal(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRememberMe(false);
    setShowRegisterForm(false);
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
      await login(email, password, false);
      const portalRoute = PORTAL_ROUTES[expandedPortal];
      if (portalRoute) {
        message.success(t("auth.loginSuccess", "登录成功"));
        setTimeout(() => { router.push(portalRoute); }, 100);
      }
      handleClose();
    } catch (error: any) {
      message.error(error?.message || t("auth.loginFailed", "登录失败"));
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
      await register(email, password);
      const portalRoute = PORTAL_ROUTES[expandedPortal];
      if (portalRoute) {
        message.success("注册成功！");
        setTimeout(() => { router.push(portalRoute); }, 100);
      }
      handleClose();
    } catch (error: any) {
      message.error(error?.message || "注册失败，请重试");
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

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex antialiased"
      style={{ backgroundColor: "#FDF8F2" }}
    >
      {/* ======= LEFT: Welcome area ======= */}
      <div className="flex-[65] flex flex-col items-center justify-center relative">
        {/* ModelEngine + Nexent logo top-left */}
        <div className="absolute top-8 left-10 flex items-end gap-3">
          <img
            src="/modelengine-logo2.png"
            alt="ModelEngine"
            style={{ height: "27px", width: "auto" }}
          />
          <span
            style={{
              fontFamily: "'AliHealth', 'PingFang SC', sans-serif",
              fontSize: "18px",
              fontWeight: 900,
              color: "#4A6CF7",
              lineHeight: 1,
              paddingBottom: "3px",
            }}
          >
            Nexent
          </span>
        </div>

  

        {/* Main title */}
        <div>
          <h1
            style={{
              fontFamily: "'AliHealth', 'PingFang SC', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(34px, 4.2vw, 52px)",
              lineHeight: 1.2,
              color: "#6b6460",
              letterSpacing: "0.06em",
            }}
          >
            欢迎来到
          </h1>
          <h2
            style={{
              fontFamily: "'AliHealth', 'PingFang SC', sans-serif",
              fontWeight: 700,
              lineHeight: 0.9,
              color: "#1a1a1a",
              marginTop: "2px",
              marginLeft: "clamp(40px, 5vw, 80px)",
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontSize: "clamp(72px, 9vw, 120px)" }}>安</span>
            <span style={{ fontSize: "clamp(75px, 9.4vw, 125px)", position: "relative", top: "4px" }}>语</span>
          </h2>

          <p
            className="mt-16"
            style={{
              fontFamily: "'AliHealth', 'PingFang SC', sans-serif",
              fontWeight: 700,
              fontSize: "17px",
              color: "#8a847c",
              lineHeight: 1.75,
              maxWidth: "400px",
              letterSpacing: "0.18em",
              marginLeft: "clamp(8px, 1vw, 16px)",
            }}
          >
            一个基于大语言模型的病理知识问答智能体
            <br />
            <span style={{ whiteSpace: "nowrap" }}>为医生、患者和管理者提供专业、可靠的智能服务</span>
          </p>
        </div>
      </div>

      {/* ======= RIGHT: Three vertical color strips ======= */}
      <div className="flex-[35] flex py-8 pr-12 gap-0">
        {portals.map((portal) => {
          const isExpanded = expandedPortal === portal.id;
          const isCollapsed = expandedPortal !== null && !isExpanded;
          const Icon = portal.icon;

          return (
            <motion.div
              key={portal.id}
              className="relative overflow-hidden cursor-pointer"
              style={{
                borderRadius: "20px",
                backgroundColor: portal.accentColor,
              }}
              animate={{
                flex: isExpanded ? 20 : isCollapsed ? 0 : 1,
                opacity: isCollapsed ? 0 : 1,
              }}
              transition={{
                flex: { duration: expandedPortal ? 0.25 : 0.38, ease: [0.25, 0.46, 0.45, 0.94] },
                opacity: { duration: 0.15, ease: "easeOut" },
              }}
              onClick={() => {
                if (!expandedPortal) {
                  setExpandedPortal(portal.id);
                }
              }}
            >
              <AnimatePresence mode="wait">
                {isExpanded ? (
                  /* ===== EXPANDED: Login form ===== */
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: 0.18, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: portal.accentColor }}
                  >
                    {/* Close button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClose(); }}
                      className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all duration-300 z-10"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    {/* Title top-left, form centered */}
                    <div className="absolute inset-0 flex flex-col">
                      {/* Top-left: title */}
                      <div className="px-8 pt-10">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/20">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="whitespace-nowrap">
                            <h2 className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: "'AliHealth', 'PingFang SC', sans-serif" }}>
                              {portal.loginTitle}
                            </h2>
                            <p className="text-sm text-white/50 mt-0.5 font-medium tracking-wider">
                              {portal.subtitle}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Center: form */}
                      <div className="flex-1 flex items-center justify-center -mt-4">
                        <div className="w-full max-w-sm px-8">
                          <form
                            onSubmit={showRegisterForm ? handleRegisterSubmit : handleLogin}
                            className="space-y-5"
                          >
                            <div>
                              <Label htmlFor="email" className="text-base font-semibold text-white/70 mb-2 block tracking-wide">
                                邮箱地址
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="请输入您的邮箱"
                                className="w-full px-5 py-3 border-0 rounded-xl text-lg font-medium bg-white/15 text-white placeholder:text-white/35 focus:bg-white/25 focus:ring-2 focus:ring-white/50"
                                style={{ height: "56px" }}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="password" className="text-base font-semibold text-white/70 mb-2 block tracking-wide">
                                密码
                              </Label>
                              <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={showRegisterForm ? "请输入密码（至少6位）" : "请输入您的密码"}
                                className="w-full px-5 py-3 border-0 rounded-xl text-lg font-medium bg-white/15 text-white placeholder:text-white/35 focus:bg-white/25 focus:ring-2 focus:ring-white/50"
                                style={{ height: "56px" }}
                                required
                              />
                            </div>
                            {showRegisterForm && (
                              <div>
                                <Label htmlFor="confirmPassword" className="text-base font-semibold text-white/70 mb-2 block tracking-wide">
                                  确认密码
                                </Label>
                                <Input
                                  id="confirmPassword"
                                  type="password"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="请再次输入密码"
                                  className="w-full px-4 py-3 border-0 rounded-xl text-base font-medium bg-white/15 text-white placeholder:text-white/35 focus:bg-white/25 focus:ring-2 focus:ring-white/50"
                                  style={{ height: "52px" }}
                                  required
                                />
                              </div>
                            )}
                            {!showRegisterForm && (
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id="remember"
                                    checked={rememberMe}
                                    onCheckedChange={(checked: boolean) => setRememberMe(checked)}
                                  />
                                  <Label htmlFor="remember" className="text-sm text-white/60 cursor-pointer font-medium">
                                    记住我
                                  </Label>
                                </div>
                                <a
                                  href="#"
                                  className="text-sm text-white/60 hover:text-white hover:underline font-medium"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  忘记密码？
                                </a>
                              </div>
                            )}
                            <Button
                              type="submit"
                              disabled={isLoggingIn || isRegistering || authLoading}
                              className="w-full rounded-xl text-lg font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95"
                              style={{ backgroundColor: "white", color: portal.accentColor, height: "56px" }}
                            >
                              {showRegisterForm
                                ? (isRegistering ? "注册中..." : "注册")
                                : (isLoggingIn ? "登录中..." : "登录")}
                            </Button>
                            <div className="flex items-center justify-center gap-1.5 pt-3">
                              <span className="text-base text-white/50 font-medium">
                                {showRegisterForm ? "已有账号？" : "还没有账号？"}
                              </span>
                              <button
                                type="button"
                                onClick={toggleForm}
                                disabled={isLoggingIn || isRegistering}
                                className="text-base font-semibold text-white hover:underline"
                              >
                                {showRegisterForm ? "返回登录" : "注册新账号"}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : !isCollapsed ? (
                  /* ===== DEFAULT: Color strip with vertical text ===== */
                  <motion.div
                    key="strip"
                    initial={false}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full w-full flex flex-col items-center justify-between py-10 px-2"
                  >
                    {/* Top: icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      <Icon className="w-5 h-5 text-white/90" />
                    </div>

                    {/* Spacer to push content down */}
                    <div className="flex-1" />

                    {/* Vertical text just above arrow */}
                    <div
                      className="mb-4"
                      style={{
                        writingMode: "vertical-rl",
                        textOrientation: "mixed",
                      }}
                    >
                      <span
                        className="text-white font-bold"
                        style={{ fontFamily: "'AliHealth', 'PingFang SC', sans-serif", fontSize: "28px", letterSpacing: "0.2em" }}
                      >
                        {portal.title}
                      </span>
                    </div>

                    {/* Bottom: arrow button */}
                    <div
                      className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/15 hover:scale-105 transition-all duration-200"
                    >
                      <ArrowRight className="w-4 h-4 text-white/70" />
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
