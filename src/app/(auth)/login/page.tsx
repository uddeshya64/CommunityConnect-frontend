"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Loader2,
  KeyRound,
  MailCheck,
  RotateCcw,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { LoginSchema, LoginFormValues } from "@/validations/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageTransition from "@/components/layout/PageTransition";
import { API_BASE_URL } from "@/config/env";
import { hasStoredSession, setStoredTokens } from "@/lib/auth";
import { verify2FACode } from "@/lib/totp";
import {
  useLogin,
  useSendResetOtp,
  useVerifyResetOtp,
  useResetPassword,
} from "@/hooks/authHooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import AuthGeometricShowcase from "@/components/auth/AuthGeometricShowcase";

type ViewState =
  | "LOGIN"
  | "FORGOT_EMAIL"
  | "FORGOT_OTP"
  | "FORGOT_NEW_PASSWORD"
  | "TWO_FACTOR_VERIFY";

function LoginContent() {
  const { isDark, toggleTheme, activeAccent } = useAppearance();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => {
    if (hasStoredSession()) {
      const targetUrl = localStorage.getItem("returnUrl") || redirectParam || "/home";
      router.replace(targetUrl);
    }
  }, [redirectParam, router]);

  const [view, setView] = useState<ViewState>("LOGIN");
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { login, isLoading: isLoggingIn } = useLogin();
  const { sendResetOtp } = useSendResetOtp();
  const { verifyResetOtp } = useVerifyResetOtp();
  const { resetPassword } = useResetPassword();

  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [isVerifyingResetOtp, setIsVerifyingResetOtp] = useState(false);
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 2FA pending state
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [pendingTokens, setPendingTokens] = useState<{ accessToken: string; refreshToken: string } | null>(null);
  const [pending2FAData, setPending2FAData] = useState<{ secret: string; backupCodes: string[] }>({ secret: "", backupCodes: [] });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // =============================
  // Submit Login
  // =============================
  const onSubmitLogin = async (data: LoginFormValues) => {
    try {
      setServerError("");
      const result = await login(data.email, data.password);

      // Check if 2FA verification is required
      if (result.requires2FA) {
        setPendingTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });

        const settings = result.settings || {};
        const secret = settings.twoFactorSecret || "";
        const backupCodes = Array.isArray(settings.twoFactorBackupCodes)
          ? settings.twoFactorBackupCodes
          : [];

        setPending2FAData({ secret, backupCodes });
        setView("TWO_FACTOR_VERIFY");
        return;
      }

      // Regular login flow
      localStorage.removeItem("cc_user_settings");
      setStoredTokens(result.accessToken, result.refreshToken);

      const targetUrl = localStorage.getItem("returnUrl") || redirectParam;
      if (targetUrl) {
        localStorage.removeItem("returnUrl");
        router.push(targetUrl);
      } else {
        router.push("/home");
      }
    } catch (error: any) {
      setServerError(error.message || "Failed to sign in. Please verify your credentials.");
    }
  };

  // =============================
  // 2FA Verification Handler
  // =============================
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError("");
    if (!twoFactorCode) {
      setTwoFactorError("Please enter your 6-digit code or backup code.");
      return;
    }

    setIsVerifying2FA(true);
    try {
      const isValid = await verify2FACode(
        twoFactorCode,
        pending2FAData.secret,
        pending2FAData.backupCodes
      );
      if (!isValid) {
        setIsVerifying2FA(false);
        setTwoFactorError("Invalid verification code. Please check your Authenticator app and try again.");
        return;
      }

      if (!pendingTokens) {
        setIsVerifying2FA(false);
        setTwoFactorError("Authentication session expired. Please log in again.");
        setView("LOGIN");
        return;
      }

      localStorage.removeItem("cc_user_settings");
      setStoredTokens(pendingTokens.accessToken, pendingTokens.refreshToken);

      setSuccessMessage("2FA verification successful! Welcome back.");
      showSuccess("2FA verification successful! Welcome back.");
      setTimeout(() => {
        router.push("/home");
      }, 500);
    } catch {
      setIsVerifying2FA(false);
      setTwoFactorError("Failed to verify authentication code. Please try again.");
    }
  };

  // =============================
  // Google Login
  // =============================
  const handleGoogleLogin = () => {
    const targetUrl = localStorage.getItem("returnUrl") || redirectParam;
    if (targetUrl) {
      sessionStorage.setItem("redirectUrl", targetUrl);
    }
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  // =============================
  // Send Reset OTP
  // =============================
  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    try {
      setServerError("");
      setIsSendingResetOtp(true);
      await sendResetOtp(resetEmail);
      setView("FORGOT_OTP");
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || "Failed to send reset code. Please try again."
      );
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  // =============================
  // Verify Reset OTP
  // =============================
  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setServerError("");
      setIsVerifyingResetOtp(true);
      const response = await verifyResetOtp(resetEmail, resetOtp);
      setResetToken(response.token);
      setView("FORGOT_NEW_PASSWORD");
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || "Invalid or expired verification code."
      );
    } finally {
      setIsVerifyingResetOtp(false);
    }
  };

  // =============================
  // Reset Password
  // =============================
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setServerError("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setServerError("");
      setIsSettingNewPassword(true);
      await resetPassword(resetToken, newPassword, confirmPassword);
      setSuccessMessage("Password reset successfully. You can now log in.");
      showSuccess("Password reset successfully!");
      setView("LOGIN");
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || "Failed to reset password. Please try again."
      );
    } finally {
      setIsSettingNewPassword(false);
    }
  };

  return (
    <PageTransition>
      <div
        className="min-h-screen w-full flex flex-col lg:flex-row relative transition-colors duration-300"
        style={{
          background: "var(--bg)",
          color: "var(--text)",
        }}
      >
        {/* =====================================================
            LEFT COLUMN: POLISHED AUTH FORM (Standalone tokens)
        ====================================================== */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 min-h-screen relative z-10">

          {/* Top Brand Bar & Theme Toggle */}
          <div className="flex items-center justify-between w-full">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bricolage font-black text-xl tracking-tight group"
            >
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, var(--accent, #6366f1), var(--accent2, #a855f7))",
                  boxShadow: "0 6px 18px -6px var(--accent, #6366f1)",
                }}
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 5h14M5 12h9M5 19h14" />
                  <circle cx="18" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <span
                className="font-bricolage text-[18px] font-bold tracking-tight whitespace-nowrap"
                style={{ color: "var(--text)" }}
              >
                Event<span style={{ color: "var(--accent, #6366f1)" }}>rix</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-9 h-9 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          </div>

          {/* Center Form Card */}
          <div className="w-full max-w-[430px] mx-auto py-8 sm:py-12 space-y-7">

            {/* Feedback Alerts */}
            {serverError && (
              <div className="p-4 rounded-2xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-3 shadow-sm animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{serverError}</div>
              </div>
            )}

            {successMessage && (
              <div className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-start gap-3 shadow-sm animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{successMessage}</div>
              </div>
            )}

            {/* =================================================
                VIEW 1: REGULAR LOGIN
            ================================================== */}
            {view === "LOGIN" && (
              <div className="space-y-6">

                {/* Heading & Subheading */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-white/10 text-indigo-700 dark:text-indigo-300 text-[10.5px] font-mono font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>EVENT MANAGEMENT PORTAL</span>
                  </div>
                  <h1 className="font-bricolage text-3xl sm:text-4xl font-black tracking-tight text-zinc-950 dark:text-white">
                    Welcome back
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium leading-relaxed">
                    Sign in to manage your events, coordinate hackathon teams, and access your passes.
                  </p>
                </div>

                {/* Google Sign In Button - Decent, colorful quad-border with 100% visible high contrast text */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full relative group rounded-2xl p-[1.5px] transition-all duration-200 hover:scale-[1.01] shadow-xs hover:shadow-md cursor-pointer bg-gradient-to-r from-blue-500 via-rose-500 via-amber-400 to-emerald-500"
                >
                  <div className="w-full h-full py-3.5 px-4 rounded-[14.5px] bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-850 flex items-center justify-center gap-3 transition-colors">
                    <FcGoogle className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
                    <span className="text-zinc-900 dark:text-white font-bold text-sm tracking-tight">
                      Continue with Google
                    </span>
                  </div>
                </button>

                {/* Geometric Divider */}
                <div className="relative flex items-center justify-center my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-zinc-300 dark:border-white/15" />
                  </div>
                  <div className="relative px-3 bg-[var(--bg)] font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    OR WITH EMAIL
                  </div>
                </div>

                {/* Login Form */}
                <form onSubmit={form.handleSubmit(onSubmitLogin)} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Email Address
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@domain.com"
                        {...form.register("email")}
                        disabled={isLoggingIn}
                        className="rounded-2xl pl-11 pr-4 py-6 border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-xs"
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-xs text-rose-500 font-semibold mt-1">
                        {form.formState.errors.email?.message}
                      </p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setView("FORGOT_EMAIL");
                          setServerError("");
                        }}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <Input
                        id="password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...form.register("password")}
                        disabled={isLoggingIn}
                        className="rounded-2xl pl-11 pr-11 py-6 border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-xs text-rose-500 font-semibold mt-1">
                        {form.formState.errors.password?.message}
                      </p>
                    )}
                  </div>

                  {/* Primary Login Button - 100% WHITE inside text in both themes */}
                  <Button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full rounded-2xl py-6 font-bricolage text-base font-bold !text-white shadow-xl hover:shadow-2xl transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer mt-2"
                    style={{
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      color: "#ffffff",
                      boxShadow: "0 14px 30px -14px var(--accent)",
                    }}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin !text-white" />
                        <span className="!text-white font-bold">Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span className="!text-white font-bold">Sign In to Dashboard</span>
                        <ArrowRight className="w-4 h-4 !text-white" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Sign up Switch Link */}
                <p className="text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 pt-2">
                  Don&apos;t have an account yet?{" "}
                  <Link
                    href="/register"
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-1 cursor-pointer"
                  >
                    Create an Account
                  </Link>
                </p>
              </div>
            )}

            {/* =================================================
                VIEW 2: FORGOT PASSWORD - EMAIL
            ================================================== */}
            {view === "FORGOT_EMAIL" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400">
                  <KeyRound className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h1 className="font-bricolage text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                    Reset your password
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium leading-relaxed">
                    Enter your account email and we will dispatch a secure 6-digit verification code.
                  </p>
                </div>

                <form onSubmit={handleSendResetOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Email Address
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <Input
                        type="email"
                        placeholder="you@domain.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isSendingResetOtp}
                        className="rounded-2xl pl-11 pr-4 py-6 border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-950 dark:text-zinc-50 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSendingResetOtp || !resetEmail}
                    className="w-full rounded-2xl py-6 font-bricolage text-sm font-bold !text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      color: "#ffffff",
                      boxShadow: "0 14px 30px -14px var(--accent)",
                    }}
                  >
                    {isSendingResetOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin !text-white" />
                        <span className="!text-white font-bold">Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span className="!text-white font-bold">Send Verification Code</span>
                        <ArrowRight className="w-4 h-4 !text-white" />
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setView("LOGIN");
                      setServerError("");
                    }}
                    className="w-full text-center text-xs font-bold text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white cursor-pointer pt-2"
                  >
                    ← Back to Sign In
                  </button>
                </form>
              </div>
            )}

            {/* =================================================
                VIEW 3: FORGOT PASSWORD - VERIFY OTP
            ================================================== */}
            {view === "FORGOT_OTP" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400">
                  <MailCheck className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h1 className="font-bricolage text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                    Check your inbox
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium leading-relaxed">
                    We sent a 6-digit security code to{" "}
                    <span className="font-bold text-zinc-950 dark:text-white">{resetEmail}</span>.
                  </p>
                </div>

                <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Verification Code
                    </Label>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="••••••"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                      disabled={isVerifyingResetOtp}
                      className="rounded-2xl text-center font-mono text-2xl font-bold tracking-[0.4em] py-7 border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-950 dark:text-zinc-50 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isVerifyingResetOtp || resetOtp.length < 6}
                    className="w-full rounded-2xl py-6 font-bricolage text-sm font-bold !text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      color: "#ffffff",
                      boxShadow: "0 14px 30px -14px var(--accent)",
                    }}
                  >
                    {isVerifyingResetOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin !text-white" />
                        <span className="!text-white font-bold">Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span className="!text-white font-bold">Verify Code</span>
                        <ArrowRight className="w-4 h-4 !text-white" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs font-semibold pt-2">
                    <button
                      type="button"
                      onClick={handleSendResetOtp}
                      disabled={isSendingResetOtp}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1 font-bold"
                    >
                      <RotateCcw className="w-3 h-3" /> Resend Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("FORGOT_EMAIL")}
                      className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white cursor-pointer font-bold"
                    >
                      Change Email
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* =================================================
                VIEW 4: SET NEW PASSWORD
            ================================================== */}
            {view === "FORGOT_NEW_PASSWORD" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h1 className="font-bricolage text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                    Create new password
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium leading-relaxed">
                    Set a robust new password to secure your Eventrix account.
                  </p>
                </div>

                <form onSubmit={handleSetNewPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="rounded-2xl px-4 pr-11 py-6 border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-950 dark:text-zinc-50 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="rounded-2xl px-4 pr-11 py-6 border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-950 dark:text-zinc-50 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSettingNewPassword || !newPassword || !confirmPassword}
                    className="w-full rounded-2xl py-6 font-bricolage text-sm font-bold !text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      color: "#ffffff",
                      boxShadow: "0 14px 30px -14px var(--accent)",
                    }}
                  >
                    {isSettingNewPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin !text-white" />
                        <span className="!text-white font-bold">Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span className="!text-white font-bold">Reset Password</span>
                        <ArrowRight className="w-4 h-4 !text-white" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* =================================================
                VIEW 5: TWO-FACTOR AUTHENTICATION VERIFY
            ================================================== */}
            {view === "TWO_FACTOR_VERIFY" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-white/10 text-indigo-700 dark:text-indigo-300 text-[10.5px] font-mono font-bold uppercase tracking-wider">
                    <span>2FA SECURITY CHECK</span>
                  </div>
                  <h1 className="font-bricolage text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                    Verification Required
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium leading-relaxed">
                    Enter the 6-digit code from your Authenticator app (Google Authenticator, Microsoft Authenticator, 1Password) or an Emergency Backup Code.
                  </p>
                </div>

                <form onSubmit={handleVerify2FA} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Authentication / Backup Code
                    </Label>
                    <Input
                      maxLength={14}
                      value={twoFactorCode}
                      onChange={(e) => {
                        setTwoFactorCode(e.target.value);
                        setTwoFactorError("");
                      }}
                      placeholder="123456 or CC-XXXX-XXXX"
                      className="rounded-2xl text-center font-mono text-xl tracking-widest font-bold py-6 border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-950 dark:text-zinc-50 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-xs"
                    />
                    {twoFactorError && (
                      <p className="text-xs text-rose-500 font-semibold mt-1">{twoFactorError}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isVerifying2FA || !twoFactorCode}
                    className="w-full rounded-2xl py-6 font-bricolage text-sm font-bold !text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      color: "#ffffff",
                      boxShadow: "0 14px 30px -14px var(--accent)",
                    }}
                  >
                    {isVerifying2FA ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin !text-white" />
                        <span className="!text-white font-bold">Verifying Security Code...</span>
                      </>
                    ) : (
                      <>
                        <span className="!text-white font-bold">Verify & Sign In</span>
                        <ArrowRight className="w-4 h-4 !text-white" />
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setView("LOGIN");
                      setTwoFactorCode("");
                      setTwoFactorError("");
                    }}
                    className="w-full text-center text-xs font-bold text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white cursor-pointer pt-2"
                  >
                    ← Back to Sign In
                  </button>
                </form>
              </div>
            )}

          </div>

          {/* Bottom Copyright & Security Badge */}
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono pt-4 border-t border-zinc-200 dark:border-white/10">
            <span>© 2026 EVENTRIX</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>TLS 1.3 ENCRYPTED</span>
            </span>
          </div>

        </div>

        {/* =====================================================
            RIGHT COLUMN: ARTISTIC GEOMETRIC SHOWCASE PANEL
        ====================================================== */}
        <div className="hidden lg:flex lg:w-1/2 relative min-h-screen">
          <AuthGeometricShowcase mode="login" />
        </div>

      </div>
    </PageTransition>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen w-full flex items-center justify-center"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
