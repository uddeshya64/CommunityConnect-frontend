
"use client";

import { useState, Suspense } from "react";
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
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { LoginSchema, LoginFormValues } from "@/validations/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageTransition from "@/components/layout/PageTransition";
import { verify2FACode } from "@/lib/totp";
import {
  useLogin,
  useSendResetOtp,
  useVerifyResetOtp,
  useResetPassword,
} from "@/hooks/authHooks";
import { useToast } from "@/components/providers/ToastProvider";
import { useAppearance } from "@/components/providers/AppearanceProvider";

type ViewState =
  | "LOGIN"
  | "FORGOT_EMAIL"
  | "FORGOT_OTP"
  | "FORGOT_NEW_PASSWORD"
  | "TWO_FACTOR_VERIFY";

function LoginContent() {
  const { isDark, activeAccent } = useAppearance();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { success: showSuccess, error: showError } = useToast();

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

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 2FA state during login
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [pendingTokens, setPendingTokens] = useState<{
    accessToken: string;
    refreshToken: string;
  } | null>(null);
  const [pending2FAData, setPending2FAData] = useState<{
    secret: string;
    backupCodes: string[];
  }>({
    secret: "JBSWY3DPEHPK3PXP",
    backupCodes: [],
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // =============================
  // Normal Login
  // =============================
  const onSubmitLogin = async (data: LoginFormValues) => {
    try {
      setServerError("");
      const result = await login(data.email, data.password);

      const settings = (result as any).user_settings || {};

      const is2FAEnabled = Boolean(settings.twoFactorEnabled);

      if (is2FAEnabled) {
        const secret = settings.twoFactorSecret || "JBSWY3DPEHPK3PXP";
        const backupCodes = Array.isArray(settings.twoFactorBackupCodes) 
          ? settings.twoFactorBackupCodes 
          : [];

        setPending2FAData({
          secret,
          backupCodes,
        });

        setPendingTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        setTwoFactorCode("");
        setTwoFactorError("");
        setView("TWO_FACTOR_VERIFY");
        return;
      }

      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);
      showSuccess("Signed in successfully!");

      const targetUrl = localStorage.getItem("returnUrl") || redirectParam;
      if (targetUrl) {
        localStorage.removeItem("returnUrl");
        router.push(targetUrl);
      } else {
        router.push("/home");
      }
    } catch (error: any) {
      setServerError(error.message || "Failed to login");
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

      localStorage.setItem("accessToken", pendingTokens.accessToken);
      localStorage.setItem("refreshToken", pendingTokens.refreshToken);
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
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  // =============================
  // Send Reset OTP
  // =============================
  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setServerError("");
      await sendResetOtp(resetEmail);
      setView("FORGOT_OTP");
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || "Failed to send OTP"
      );
    }
  };

  // =============================
  // Verify Reset OTP
  // =============================
  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await verifyResetOtp(resetEmail, resetOtp);
      setResetToken(response.token);
      setView("FORGOT_NEW_PASSWORD");
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || "Invalid OTP"
      );
    }
  };

  // =============================
  // Reset Password
  // =============================
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setServerError("Passwords do not match");
      return;
    }

    try {
      await resetPassword(resetToken, newPassword, confirmPassword);
      setSuccessMessage("Password reset successfully");
      showSuccess("Password reset successfully");
      setView("LOGIN");
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || "Failed to reset password"
      );
    }
  };

  return (
    <PageTransition>
      <div className={`min-h-screen w-full flex flex-col lg:flex-row transition-colors duration-300 ${
        isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900"
      }`}>
        {/* LEFT SIDE */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center p-4 sm:p-16 xl:p-24 py-8">
          <div className="w-full max-w-md mx-auto space-y-8">
            <Link
              href="/"
              className={`flex items-center gap-2 font-extrabold text-xl mb-12 w-fit ${
                isDark ? "text-white" : "text-zinc-900"
              }`}
            >
              <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${activeAccent.gradient}`} />
              CommunityConnect
            </Link>

            {serverError && (
              <div className={`p-4 rounded-xl border text-sm font-medium ${
                isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-100 text-red-600"
              }`}>
                {serverError}
              </div>
            )}

            {view === "LOGIN" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                    isDark ? "text-white" : "text-zinc-900"
                  }`}>
                    Welcome back
                  </h1>
                  <p className={`text-lg font-medium ${
                    isDark ? "text-zinc-400" : "text-zinc-500"
                  }`}>
                    Enter your details to sign in.
                  </p>
                </div>
                {/* GOOGLE BUTTON */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className={`w-full rounded-xl py-6 text-base font-semibold flex items-center justify-center gap-3 transition-colors ${
                    isDark ? "bg-zinc-900 border-white/10 text-zinc-200 hover:bg-zinc-800" : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <FcGoogle className="w-6 h-6" />
                  Continue with Google
                </Button>
                {/* DIVIDER */}
                <div className="flex items-center gap-4">
                  <div className={`h-px flex-1 ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />
                  <span className="text-sm text-zinc-400">OR</span>
                  <div className={`h-px flex-1 ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />
                </div>
                <form
                  onSubmit={form.handleSubmit(onSubmitLogin)}
                  className="space-y-6"
                >
                  {/* EMAIL */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className={`font-semibold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      {...form.register("email")}
                      disabled={isLoggingIn}
                      className={`rounded-xl px-4 py-6 text-base ${
                        isDark ? "bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                      }`}
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.email?.message}
                      </p>
                    )}
                  </div>

                  {/* PASSWORD */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className={`font-semibold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setView("FORGOT_EMAIL");
                          setServerError("");
                        }}
                        className={`text-sm font-semibold ${activeAccent.text} hover:underline`}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative">
                      <Input
                        id="password"
                        type={showLoginPassword ? "text" : "password"}
                        {...form.register("password")}
                        disabled={isLoggingIn}
                        className={`rounded-xl px-4 py-6 pr-12 text-base ${
                          isDark ? "bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowLoginPassword(!showLoginPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* LOGIN BUTTON */}
                  <Button
                    type="submit"
                    disabled={isLoggingIn}
                    className={`w-full rounded-xl py-6 ${activeAccent.bg} text-white hover:opacity-90 text-lg font-semibold shadow-md ${activeAccent.shadow} transition-all`}
                  >
                    {isLoggingIn ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>

                <p className="text-center text-zinc-500 font-medium">
                  Don&apos;t have an account?
                  <Link
                    href="/register"
                    className={`ml-1 font-bold ${activeAccent.text}`}
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            )}

            {/* ================================
                FORGOT EMAIL
            ================================= */}
            {view === "FORGOT_EMAIL" && (
              <div className="space-y-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${activeAccent.badgeBg} ${activeAccent.text}`}>
                  <KeyRound className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h1 className={`text-3xl sm:text-4xl font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>
                    Reset password
                  </h1>
                  <p className={`text-lg ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Enter your email and we will send you a verification code.
                  </p>
                </div>

                <form onSubmit={handleSendResetOtp} className="space-y-6">
                  <Input
                    type="email"
                    placeholder="m@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className={`rounded-xl py-6 text-base ${
                      isDark ? "bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                    }`}
                  />

                  <Button
                    type="submit"
                    className={`w-full rounded-xl py-6 ${activeAccent.bg} text-white hover:opacity-90 font-semibold shadow-md`}
                  >
                    Send Reset Code
                  </Button>

                  <button
                    type="button"
                    onClick={() => setView("LOGIN")}
                    className="w-full text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Back to login
                  </button>
                </form>
              </div>
            )}

            {/* ================================
                VERIFY OTP
            ================================= */}
            {view === "FORGOT_OTP" && (
              <div className="space-y-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${activeAccent.badgeBg} ${activeAccent.text}`}>
                  <MailCheck className="w-8 h-8" />
                </div>

                <h1 className={`text-3xl sm:text-4xl font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>
                  Verify OTP
                </h1>

                <form onSubmit={handleVerifyResetOtp} className="space-y-6">
                  <Input
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="Enter OTP"
                    className={`rounded-xl py-6 text-center text-xl tracking-widest font-mono font-bold ${
                      isDark ? "bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                    }`}
                  />

                  <Button
                    type="submit"
                    className={`w-full rounded-xl py-6 ${activeAccent.bg} text-white hover:opacity-90 font-semibold shadow-md`}
                  >
                    Verify Code
                  </Button>
                </form>
              </div>
            )}

            {/* ================================
                NEW PASSWORD
            ================================= */}
            {view === "FORGOT_NEW_PASSWORD" && (
              <div className="space-y-6">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                  <RotateCcw className="w-8 h-8" />
                </div>

                <h1 className={`text-3xl sm:text-4xl font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>
                  Create new password
                </h1>

                <form onSubmit={handleSetNewPassword} className="space-y-5">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`rounded-xl py-6 ${
                      isDark ? "bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                    }`}
                  />

                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`rounded-xl py-6 ${
                      isDark ? "bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                    }`}
                  />

                  <Button
                    type="submit"
                    className={`w-full rounded-xl py-6 ${activeAccent.bg} text-white hover:opacity-90 font-semibold shadow-md`}
                  >
                    Reset Password
                  </Button>
                </form>
              </div>
            )}

            {/* ================================
                2FA VERIFICATION STEP
            ================================= */}
            {view === "TWO_FACTOR_VERIFY" && (
              <div className="space-y-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${activeAccent.badgeBg} ${activeAccent.text}`}>
                  <KeyRound className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${activeAccent.badgeBg} ${activeAccent.text}`}>
                    <span>Two-Factor Authentication</span>
                  </div>
                  <h1 className={`text-3xl font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>
                    Verification Required
                  </h1>
                  <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Enter the 6-digit verification code from your Authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 1Password, etc.) or use an Emergency Backup Code.
                  </p>
                </div>

                <form onSubmit={handleVerify2FA} className="space-y-6">
                  <div>
                    <Label className={`text-xs font-semibold block mb-2 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      Authentication Code or Backup Code
                    </Label>
                    <Input
                      maxLength={14}
                      value={twoFactorCode}
                      onChange={(e) => {
                        setTwoFactorCode(e.target.value);
                        setTwoFactorError("");
                      }}
                      placeholder="6-digit code (e.g. 123456) or CC-XXXX-XXXX"
                      className={`rounded-2xl py-6 text-center font-mono text-xl tracking-widest font-bold ${
                        isDark ? "bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                      }`}
                    />
                    {twoFactorError && (
                      <p className="text-xs text-rose-500 mt-2 font-medium">{twoFactorError}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isVerifying2FA}
                    className={`w-full rounded-2xl py-6 ${activeAccent.bg} hover:opacity-90 text-white font-semibold shadow-lg transition-all`}
                  >
                    {isVerifying2FA ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Verifying Code...
                      </>
                    ) : (
                      "Verify & Continue"
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setView("LOGIN");
                      setTwoFactorCode("");
                      setTwoFactorError("");
                    }}
                    className="w-full text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
                  >
                    Back to login
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* ================================
            RIGHT SIDE DESIGN
        ================================= */}
        <div className="hidden lg:flex w-1/2 bg-zinc-950 relative overflow-hidden items-center justify-center p-12">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px]" />

          <div className="relative z-10 max-w-lg p-10 rounded-3xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-white mb-6">
              <Sparkles className="text-indigo-400" />
              Built for organizers
            </div>

            <h2 className="text-4xl font-bold text-white leading-tight">
              The best platform for managing hackathons and tech events.
            </h2>

            <div className="mt-8 text-zinc-400">Community Connect</div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

