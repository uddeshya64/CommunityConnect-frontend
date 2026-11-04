"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  MailCheck,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import {
  RegisterSchema,
  RegisterFormValues,
} from "@/validations/auth.schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageTransition from "@/components/layout/PageTransition";
import { API_BASE_URL } from "@/config/env";
import { hasStoredSession, setStoredTokens } from "@/lib/auth";

import {
  useRegisterInit,
  useVerifyRegister,
} from "@/hooks/authHooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import AuthGeometricShowcase from "@/components/auth/AuthGeometricShowcase";

export default function RegisterPage() {
  const { isDark, toggleTheme, activeAccent } = useAppearance();
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => {
    if (hasStoredSession()) {
      const returnUrl = localStorage.getItem("returnUrl") || "/home";
      router.replace(returnUrl);
    }
  }, [router]);

  const [step, setStep] = useState<1 | 2>(1);
  const [serverError, setServerError] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    registerInit,
    isLoading: isSendingOtp,
  } = useRegisterInit();

  const {
    verifyRegister,
    isLoading: isVerifying,
  } = useVerifyRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // =====================================================
  // GOOGLE OAUTH
  // =====================================================
  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  // =====================================================
  // STEP 1: REGISTER DETAILS & SEND OTP
  // =====================================================
  const onSubmitDetails = async (data: RegisterFormValues) => {
    try {
      setServerError("");
      await registerInit(data.email, data.password);
      setStep(2);
      setResendCooldown(45);
      showSuccess("Verification code sent to your email!");
    } catch (error: any) {
      setServerError(
        error.response?.data?.message ||
        error.message ||
        "Failed to initiate registration. Please try again."
      );
    }
  };

  // =====================================================
  // RESEND OTP
  // =====================================================
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      setServerError("");
      await registerInit(form.getValues("email"), form.getValues("password"));
      setResendCooldown(45);
      showSuccess("New verification code sent!");
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || "Failed to resend code. Please try again."
      );
    }
  };

  // =====================================================
  // STEP 2: VERIFY OTP & COMPLETE REGISTRATION
  // =====================================================
  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length < 6) {
      setServerError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setServerError("");
      const result = await verifyRegister(
        form.getValues("name"),
        form.getValues("email"),
        otp
      );

      setStoredTokens(result.accessToken, result.refreshToken);
      showSuccess("Account created successfully! Welcome to Eventrix.");

      const returnUrl = localStorage.getItem("returnUrl");
      if (returnUrl) {
        localStorage.removeItem("returnUrl");
        router.push(returnUrl);
      } else {
        router.push("/home");
      }
    } catch (error: any) {
      setServerError(
        error.response?.data?.message ||
        error.message ||
        "Invalid or expired verification code."
      );
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
            LEFT COLUMN: POLISHED REGISTRATION FORM (Standalone tokens)
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
            
            {/* Step Progress Pills */}
            <div className="flex items-center gap-2">
              <div 
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  step >= 1 ? "bg-[var(--accent)]" : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
              <div 
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  step >= 2 ? "bg-[var(--accent)]" : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            </div>

            {/* Error Banner */}
            {serverError && (
              <div className="p-4 rounded-2xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-3 shadow-sm animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{serverError}</div>
              </div>
            )}

            {/* =================================================
                STEP 1: ACCOUNT DETAILS
            ================================================== */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in">
                
                {/* Heading & Subheading */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-white/10 text-indigo-700 dark:text-indigo-300 text-[10.5px] font-mono font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>STEP 01 // JOIN THE PLATFORM</span>
                  </div>
                  <h1 className="font-bricolage text-3xl sm:text-4xl font-black tracking-tight text-zinc-950 dark:text-white">
                    Create your account
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium leading-relaxed">
                    Join thousands of creators, engineers, and organizers running real-time hackathons and meetups.
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
                      Sign up with Google
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

                {/* Registration Form */}
                <form onSubmit={form.handleSubmit(onSubmitDetails)} className="space-y-4">
                  {/* Full Name Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Full Name
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                        <User className="w-4 h-4" />
                      </div>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Aarav Sharma"
                        {...form.register("name")}
                        disabled={isSendingOtp}
                        className="rounded-2xl pl-11 pr-4 py-6 border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-xs"
                      />
                    </div>
                    {form.formState.errors.name && (
                      <p className="text-xs text-rose-500 font-semibold mt-1">
                        {form.formState.errors.name?.message}
                      </p>
                    )}
                  </div>

                  {/* Email Address Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Work / Personal Email
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
                        disabled={isSendingOtp}
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
                    <Label htmlFor="password" className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Password (min 8 chars)
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...form.register("password")}
                        disabled={isSendingOtp}
                        className="rounded-2xl pl-11 pr-11 py-6 border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                      >
                        {showPassword ? (
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

                  {/* Submit Button - 100% WHITE inside text in both themes */}
                  <Button
                    type="submit"
                    disabled={isSendingOtp}
                    className="w-full rounded-2xl py-6 font-bricolage text-base font-bold !text-white shadow-xl hover:shadow-2xl transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer mt-2"
                    style={{
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      color: "#ffffff",
                      boxShadow: "0 14px 30px -14px var(--accent)",
                    }}
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin !text-white" />
                        <span className="!text-white font-bold">Sending Security Code...</span>
                      </>
                    ) : (
                      <>
                        <span className="!text-white font-bold">Continue to Verification</span>
                        <ArrowRight className="w-4 h-4 !text-white" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Sign In Switch Link */}
                <p className="text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 pt-2">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-1 cursor-pointer"
                  >
                    Sign In
                  </Link>
                </p>

              </div>
            )}

            {/* =================================================
                STEP 2: OTP VERIFICATION
            ================================================== */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in">
                
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400">
                  <MailCheck className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-white/10 text-indigo-700 dark:text-indigo-300 text-[10.5px] font-mono font-bold uppercase tracking-wider">
                    <span>STEP 02 // EMAIL VERIFICATION</span>
                  </div>
                  <h1 className="font-bricolage text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                    Check your email
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium leading-relaxed">
                    We dispatched a 6-digit verification code to{" "}
                    <span className="font-bold text-zinc-950 dark:text-white">{form.getValues("email")}</span>.
                  </p>
                </div>

                <form onSubmit={onVerifyOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="otp" className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Verification Code
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      maxLength={6}
                      placeholder="••••••"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      disabled={isVerifying}
                      className="rounded-2xl text-center font-mono text-2xl font-bold tracking-[0.4em] py-7 border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-950 dark:text-zinc-50 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isVerifying || otp.length < 6}
                    className="w-full rounded-2xl py-6 font-bricolage text-base font-bold !text-white shadow-xl hover:shadow-2xl transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      color: "#ffffff",
                      boxShadow: "0 14px 30px -14px var(--accent)",
                    }}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin !text-white" />
                        <span className="!text-white font-bold">Creating Your Account...</span>
                      </>
                    ) : (
                      <>
                        <span className="!text-white font-bold">Verify & Complete Registration</span>
                        <ArrowRight className="w-4 h-4 !text-white" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs font-semibold pt-2">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0}
                      className={`flex items-center gap-1 cursor-pointer transition-colors font-bold ${
                        resendCooldown > 0 ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed" : "text-indigo-600 dark:text-indigo-400 hover:underline"
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Code"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setOtp("");
                        setServerError("");
                      }}
                      className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white cursor-pointer font-bold"
                    >
                      Change Email Address
                    </button>
                  </div>
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
          <AuthGeometricShowcase mode="register" />
        </div>

      </div>
    </PageTransition>
  );
}
