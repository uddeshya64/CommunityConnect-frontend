"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, RegisterFormValues } from "@/validations/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowRight, Users, Loader2, MailCheck, Eye, EyeOff } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import { useRegisterInit, useVerifyRegister } from "@/hooks/authHooks";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [serverError, setServerError] = useState("");
  const [otp, setOtp] = useState(""); // Simple state for our OTP string
  const [showPassword, setShowPassword] = useState(false);

  const { registerInit, isLoading: isSendingOtp } = useRegisterInit();
  const { verifyRegister, isLoading: isVerifying } = useVerifyRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  // Handles Step 1: Submitting Details & Requesting OTP
  const onSubmitDetails = async (data: RegisterFormValues) => {
    try {
      setServerError("");

      // Trigger the backend to email the OTP
      await registerInit(data.email, data.password);

      // Move to the OTP verification screen
      setStep(2);

    } catch (error: any) {
      setServerError(error.message || "Failed to send OTP. Please try again.");
    }
  };

  // Handles Step 2: Verifying OTP & Creating Account
  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setServerError("OTP must be exactly 6 digits.");
      return;
    }

    try {
      setServerError("");

      // We send name + email (from react-hook-form) plus the OTP to create the user
      const { name, email } = form.getValues();
      const result = await verifyRegister(name, email, otp);

      // Persist auth tokens
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);

      // Check if there's a return URL (e.g. from a team invite)
      const returnUrl = localStorage.getItem("returnUrl");
      if (returnUrl) {
        localStorage.removeItem("returnUrl");
        router.push(returnUrl);
      } else {
        router.push("/home");
      }

    } catch (error: any) {
      setServerError(error.message || "Invalid OTP. Please try again.");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen w-full flex bg-white">
        {/* LEFT SIDE - Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-16 xl:p-24">
          <div className="w-full max-w-md mx-auto space-y-8">

            <Link href="/" className="flex items-center gap-2 font-extrabold text-xl mb-12 text-zinc-900 w-fit hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm"></div>
              CommunityConnect
            </Link>

            {serverError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 font-medium text-sm">
                {serverError}
              </div>
            )}

            {/* ==== STEP 1: USER DETAILS ==== */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Create an account</h1>
                  <p className="text-lg text-zinc-500 font-medium">Join the community to discover amazing events.</p>
                </div>

                <form onSubmit={form.handleSubmit(onSubmitDetails)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-semibold text-zinc-900">Full Name</Label>
                    <Input id="name" placeholder="John Doe" {...form.register("name")} disabled={isSendingOtp} className="rounded-xl px-4 py-6 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all text-base" />
                    {form.formState.errors.name && <p className="text-sm text-red-500 font-medium">{form.formState.errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold text-zinc-900">Email Address</Label>
                    <Input id="email" type="email" placeholder="m@example.com" {...form.register("email")} disabled={isSendingOtp} className="rounded-xl px-4 py-6 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all text-base" />
                    {form.formState.errors.email && <p className="text-sm text-red-500 font-medium">{form.formState.errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-semibold text-zinc-900">Password</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} {...form.register("password")} disabled={isSendingOtp} className="rounded-xl px-4 py-6 pr-12 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all text-base" />
                      <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {form.formState.errors.password && <p className="text-sm text-red-500 font-medium">{form.formState.errors.password.message}</p>}
                  </div>

                  <Button type="submit" disabled={isSendingOtp} className="w-full rounded-xl mt-4 py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]">
                    {isSendingOtp ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="ml-2 h-5 w-5" /></>}
                  </Button>
                </form>

                <p className="text-center text-zinc-500 font-medium">
                  Already have an account?{" "}
                  <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-4">Sign in</Link>
                </p>
              </div>
            )}

            {/* ==== STEP 2: OTP VERIFICATION ==== */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <MailCheck className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Check your email</h1>
                  <p className="text-lg text-zinc-500 font-medium">
                    We sent a 6-digit verification code to <span className="text-zinc-900 font-bold">{form.getValues("email")}</span>.
                  </p>
                </div>

                <form onSubmit={onVerifyOtp} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="font-semibold text-zinc-900">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={isVerifying}
                      className="rounded-xl text-center tracking-[0.5em] text-2xl font-bold px-4 py-8 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                    />
                  </div>

                  <Button type="submit" disabled={isVerifying} className="w-full rounded-xl py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]">
                    {isVerifying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Create Account"}
                  </Button>

                  <button type="button" onClick={() => setStep(1)} className="w-full text-center text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
                    Wrong email address? Go back
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT SIDE - Animated Visuals (Unchanged) */}
        <div className="hidden lg:flex w-1/2 bg-zinc-950 relative overflow-hidden items-center justify-center p-12">
          {/* ... Keep the glowing orbs and feature list here ... */}
          <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-violet-600/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s' }} />
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '7s', animationDelay: '2s' }} />

          <div className="relative z-10 w-full max-w-lg p-10 backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl shadow-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium mb-8">
              <Users className="w-4 h-4 text-indigo-400" />
              Join the movement
            </div>
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              Connect with developers around the world.
            </h2>
            <ul className="space-y-4 text-zinc-300 font-medium text-lg">
              <li className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-indigo-500" /> Discover local meetups</li>
              <li className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-violet-500" /> Form teams for hackathons</li>
              <li className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-rose-500" /> Grow your technical network</li>
            </ul>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}