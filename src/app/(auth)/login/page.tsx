"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, LoginFormValues } from "@/validations/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowRight, Sparkles, Loader2, KeyRound, MailCheck, RotateCcw, Eye, EyeOff } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import { authService } from "@/services/auth.service";

// Define our view states
type ViewState = "LOGIN" | "FORGOT_EMAIL" | "FORGOT_OTP" | "FORGOT_NEW_PASSWORD";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>("LOGIN");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // States for the forgot password flow
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password visibility toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  // --- STANDARD LOGIN ---
  const onSubmitLogin = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      setServerError("");
      await authService.login(data);
      router.push("/home");
    } catch (error: any) {
      setServerError(error.response?.data?.error || "Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- FORGOT PASSWORD: STEP 1 (Send Email) ---
  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return setServerError("Please enter your email address.");

    try {
      setIsLoading(true);
      setServerError("");
      await authService.sendResetOtp(resetEmail);
      setView("FORGOT_OTP");
    } catch (error: any) {
      setServerError(error.response?.data?.error || "Failed to send reset code.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- FORGOT PASSWORD: STEP 2 (Verify OTP) ---
  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetOtp.length !== 6) return setServerError("OTP must be 6 digits.");

    try {
      setIsLoading(true);
      setServerError("");
      const res = await authService.verifyResetOtp(resetEmail, resetOtp);
      setResetToken(res.token); // Save the secure token for the final step!
      setView("FORGOT_NEW_PASSWORD");
    } catch (error: any) {
      setServerError(error.response?.data?.error || "Invalid reset code.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- FORGOT PASSWORD: STEP 3 (Set New Password) ---
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      return setServerError("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      return setServerError("Passwords do not match."); // <-- Frontend check
    }

    try {
      setIsLoading(true);
      setServerError("");

      // Pass BOTH passwords to the service
      await authService.resetPassword(resetToken, newPassword, confirmPassword);

      // Success! Send them back to login
      setSuccessMessage("Password reset successfully! You can now log in.");
      setView("LOGIN");

      // Clear out all states
      setResetEmail("");
      setResetOtp("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword(""); // Clear this too
    } catch (error: any) {
      setServerError(error.response?.data?.error || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen w-full flex bg-white">
        {/* LEFT SIDE - Form Area */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-16 xl:p-24">
          <div className="w-full max-w-md mx-auto space-y-8">

            <Link href="/" className="flex items-center gap-2 font-extrabold text-xl mb-12 text-zinc-900 w-fit hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm"></div>
              CommunityConnect
            </Link>

            {serverError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 font-medium text-sm animate-in fade-in">
                {serverError}
              </div>
            )}
            {successMessage && view === "LOGIN" && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 font-medium text-sm animate-in fade-in">
                {successMessage}
              </div>
            )}

            {/* =========================================
                VIEW: STANDARD LOGIN
                ========================================= */}
            {view === "LOGIN" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Welcome back</h1>
                  <p className="text-lg text-zinc-500 font-medium">Enter your details to sign in.</p>
                </div>

                <form onSubmit={form.handleSubmit(onSubmitLogin)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold text-zinc-900">Email Address</Label>
                    <Input id="email" type="email" placeholder="m@example.com" {...form.register("email")} disabled={isLoading} className="rounded-xl px-4 py-6 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all text-base" />
                    {form.formState.errors.email && <p className="text-sm text-red-500 font-medium">{form.formState.errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="font-semibold text-zinc-900">Password</Label>
                      <button type="button" onClick={() => { setView("FORGOT_EMAIL"); setServerError(""); setSuccessMessage(""); }} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input id="password" type={showLoginPassword ? "text" : "password"} {...form.register("password")} disabled={isLoading} className="rounded-xl px-4 py-6 pr-12 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all text-base" />
                      <button type="button" tabIndex={-1} onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors">
                        {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {form.formState.errors.password && <p className="text-sm text-red-500 font-medium">{form.formState.errors.password.message}</p>}
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full rounded-xl py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Sign In <ArrowRight className="ml-2 h-5 w-5" /></>}
                  </Button>
                </form>

                <p className="text-center text-zinc-500 font-medium">
                  Don't have an account?{" "}
                  <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-4">Sign up</Link>
                </p>
              </div>
            )}

            {/* =========================================
                VIEW: FORGOT PASSWORD - EMAIL
                ========================================= */}
            {view === "FORGOT_EMAIL" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <KeyRound className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Reset password</h1>
                  <p className="text-lg text-zinc-500 font-medium">Enter your email and we'll send you a verification code.</p>
                </div>

                <form onSubmit={handleSendResetOtp} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="font-semibold text-zinc-900">Email Address</Label>
                    <Input id="reset-email" type="email" placeholder="m@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} disabled={isLoading} className="rounded-xl px-4 py-6 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all text-base" />
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full rounded-xl py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Reset Code"}
                  </Button>

                  <button type="button" onClick={() => setView("LOGIN")} className="w-full text-center text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
                    Back to login
                  </button>
                </form>
              </div>
            )}

            {/* =========================================
                VIEW: FORGOT PASSWORD - OTP
                ========================================= */}
            {view === "FORGOT_OTP" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <MailCheck className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Check your email</h1>
                  <p className="text-lg text-zinc-500 font-medium">We sent a 6-digit verification code to <span className="text-zinc-900 font-bold">{resetEmail}</span>.</p>
                </div>

                <form onSubmit={handleVerifyResetOtp} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="reset-otp" className="font-semibold text-zinc-900">Verification Code</Label>
                    <Input id="reset-otp" type="text" maxLength={6} placeholder="Enter 6-digit OTP" value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} disabled={isLoading} className="rounded-xl text-center tracking-[0.5em] text-2xl font-bold px-4 py-8 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all" />
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full rounded-xl py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Code"}
                  </Button>

                  <button type="button" onClick={() => setView("FORGOT_EMAIL")} className="w-full text-center text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
                    Didn't receive it? Go back
                  </button>
                </form>
              </div>
            )}

            {/* =========================================
                VIEW: FORGOT PASSWORD - NEW PASSWORD
                ========================================= */}
            {view === "FORGOT_NEW_PASSWORD" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                  <RotateCcw className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Create new password</h1>
                  <p className="text-lg text-zinc-500 font-medium">Your new password must be different from previously used passwords.</p>
                </div>

                <form onSubmit={handleSetNewPassword} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="font-semibold text-zinc-900">New Password</Label>
                    <div className="relative">
                      <Input id="new-password" type={showNewPassword ? "text" : "password"} placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isLoading} className="rounded-xl px-4 py-6 pr-12 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all text-base" />
                      <button type="button" tabIndex={-1} onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors">
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Add Confirm Password Input */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="font-semibold text-zinc-900">Confirm Password</Label>
                    <div className="relative">
                      <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} className="rounded-xl px-4 py-6 pr-12 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all text-base" />
                      <button type="button" tabIndex={-1} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors">
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full rounded-xl py-6 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg shadow-md shadow-green-500/20 transition-all hover:scale-[1.02]">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Reset Password"}
                  </Button>
                </form>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT SIDE - Animated Visuals (Unchanged) */}
        <div className="hidden lg:flex w-1/2 bg-zinc-950 relative overflow-hidden items-center justify-center p-12">
          {/* ... Glowing orbs and testimonial exactly as before ... */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-rose-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />

          <div className="relative z-10 w-full max-w-lg p-10 backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl shadow-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Built for organizers
            </div>
            <h2 className="text-4xl font-bold text-white mb-8 leading-tight">
              "The absolute best platform for managing our hackathons and tech meetups effortlessly."
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                UP
              </div>
              <div>
                <p className="text-white font-bold tracking-wide">Uddeshya Patidar</p>
                <p className="text-zinc-400 text-sm font-medium">Creator Communtiy Connect</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}