
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  useLogin,
  useSendResetOtp,
  useVerifyResetOtp,
  useResetPassword,
} from "@/hooks/authHooks";

type ViewState =
  | "LOGIN"
  | "FORGOT_EMAIL"
  | "FORGOT_OTP"
  | "FORGOT_NEW_PASSWORD";

export default function LoginPage() {
  const router = useRouter();

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

      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);

      router.push("/home");
    } catch (error: any) {
      setServerError(error.message || "Failed to login");
    }
  };

  // =============================
  // Google Login
  // =============================
  const handleGoogleLogin = () => {
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
      setView("LOGIN");
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || "Failed to reset password"
      );
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
        {/* LEFT SIDE */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center p-4 sm:p-16 xl:p-24 py-8">
          <div className="w-full max-w-md mx-auto space-y-8">
            <Link
              href="/"
              className="flex items-center gap-2 font-extrabold text-xl mb-12 text-zinc-900 w-fit"
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-violet-600" />
              CommunityConnect
            </Link>

            {serverError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                {serverError}
              </div>
            )}

            {successMessage && view === "LOGIN" && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-medium">
                {successMessage}
              </div>
            )}

            {view === "LOGIN" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
                    Welcome back
                  </h1>
                  <p className="text-lg text-zinc-500 font-medium">
                    Enter your details to sign in.
                  </p>
                </div>
                {/* GOOGLE BUTTON */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="w-full rounded-xl py-6 text-lg font-semibold flex items-center justify-center gap-3"
                >
                  <FcGoogle className="w-6 h-6" />
                  Continue with Google
                </Button>
                {/* DIVIDER */}
                <div className="flex items-center gap-4">
                  <div className="h-px bg-zinc-200 flex-1" />
                  <span className="text-sm text-zinc-400">OR</span>
                  <div className="h-px bg-zinc-200 flex-1" />
                </div>
                <form
                  onSubmit={form.handleSubmit(onSubmitLogin)}
                  className="space-y-6"
                >
                  {/* EMAIL */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      {...form.register("email")}
                      disabled={isLoggingIn}
                      className="rounded-xl px-4 py-6 bg-zinc-50"
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
                      <Label htmlFor="password" className="font-semibold">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setView("FORGOT_EMAIL");
                          setServerError("");
                        }}
                        className="text-sm font-semibold text-indigo-600"
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
                        className="rounded-xl px-4 py-6 pr-12 bg-zinc-50"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowLoginPassword(!showLoginPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2"
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
                    className="w-full rounded-xl py-6 bg-indigo-600 text-white text-lg font-semibold"
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
                  Don't have an account?
                  <Link
                    href="/register"
                    className="ml-1 font-bold text-indigo-600"
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
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <KeyRound className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900">
                    Reset password
                  </h1>
                  <p className="text-lg text-zinc-500">
                    Enter your email and we will send you a verification code.
                  </p>
                </div>

                <form onSubmit={handleSendResetOtp} className="space-y-6">
                  <Input
                    type="email"
                    placeholder="m@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="rounded-xl py-6"
                  />

                  <Button
                    type="submit"
                    className="w-full rounded-xl py-6 bg-indigo-600 text-white"
                  >
                    Send Reset Code
                  </Button>

                  <button
                    type="button"
                    onClick={() => setView("LOGIN")}
                    className="w-full text-sm text-zinc-500"
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
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <MailCheck className="w-8 h-8" />
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900">
                  Verify OTP
                </h1>

                <form onSubmit={handleVerifyResetOtp} className="space-y-6">
                  <Input
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="Enter OTP"
                    className="rounded-xl py-6 text-center text-xl tracking-widest"
                  />

                  <Button
                    type="submit"
                    className="w-full rounded-xl py-6 bg-indigo-600 text-white"
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
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                  <RotateCcw className="w-8 h-8" />
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900">
                  Create new password
                </h1>

                <form onSubmit={handleSetNewPassword} className="space-y-5">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-xl py-6"
                  />

                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="rounded-xl py-6"
                  />

                  <Button
                    type="submit"
                    className="w-full rounded-xl py-6 bg-green-600 text-white"
                  >
                    Reset Password
                  </Button>
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
