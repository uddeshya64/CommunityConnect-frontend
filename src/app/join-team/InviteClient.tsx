"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck, Mail, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/axios";
import Link from "next/link";

interface InviteDetails {
  emailInvited: string;
  teamName: string;
  eventName: string;
  eventBanner?: string;
}

export default function InviteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const verifyTokenAndAuth = async () => {
      if (!token) {
        setError("No invitation token found in the URL.");
        setIsLoading(false);
        return;
      }

      try {
        // Check auth state on every mount (important for post-login redirects)
        const authToken = localStorage.getItem("accessToken");
        if (authToken) {
          setIsLoggedIn(true);
          try {
            const payload = JSON.parse(window.atob(authToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            // Check multiple possible email field names in the JWT
            const email = payload.email || payload.Email || payload.sub || payload.user_email;
            if (email) {
              setCurrentUserEmail(email);
            } else {
              console.warn("JWT payload does not contain an email field. Fields:", Object.keys(payload));
            }
          } catch (e) {
            console.error("Failed to decode token email:", e);
          }
        } else {
          setIsLoggedIn(false);
          setCurrentUserEmail(null);
        }

        const response = await api.get(`/team-dashboard/verify-invite/${token}`);
        const data = response.data.data || response.data;
        setInviteDetails(data);

      } catch (err: any) {
        setError(err.response?.data?.error || err.response?.data?.message || "This invitation link is invalid or has expired.");
      } finally {
        setIsLoading(false);
      }
    };

    verifyTokenAndAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const returnUrl = `/join-team?token=${token}`;

  const handleRedirectToAuth = (page: "login" | "register") => {
    localStorage.setItem("returnUrl", returnUrl);
    router.push(`/${page}`);
  };

  const handleAcceptInvite = async () => {
    if (!isLoggedIn) {
      handleRedirectToAuth("login");
      return;
    }

    try {
      setIsAccepting(true);
      setError(null);

      const response = await api.post('/team-dashboard/accept-invite', { token });
      const result = response.data.data || response.data;

      if (result.success || response.data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push(`/dashboard/team/${result.teamId || response.data.teamId}`);
        }, 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to join the team. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center relative z-10">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-6" />
        <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-sm">Verifying Invitation...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg relative z-10">
      <AnimatePresence mode="wait">
        {error && !isSuccess ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900/60 border border-red-500/20 rounded-[2.5rem] p-10 md:p-12 text-center backdrop-blur-xl shadow-2xl shadow-red-900/10"
          >
            <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-black mb-4">Invitation Invalid</h1>
            <p className="text-zinc-400 font-medium mb-10 leading-relaxed">{error}</p>
            <Link href="/home" className="block w-full">
              <Button className="w-full h-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-lg transition-all">
                Return to Home
              </Button>
            </Link>
          </motion.div>
        ) : isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900/60 border border-emerald-500/20 rounded-[2.5rem] p-10 md:p-12 text-center backdrop-blur-xl shadow-2xl shadow-emerald-900/10"
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-24 h-24 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">You're In!</h1>
            <p className="text-zinc-400 font-medium mb-10 text-lg">
              You have successfully joined <span className="text-white font-bold">{inviteDetails?.teamName}</span>.
            </p>
            <div className="flex justify-center mb-6">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Redirecting to workspace...</p>
          </motion.div>
        ) : inviteDetails && (
          <motion.div
            key="invite"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/60 border border-white/5 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-xl shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform duration-700" />
            <div className="mb-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-400 mb-6 border border-indigo-500/20 shadow-inner">
                <Users className="w-8 h-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">You've Been Invited!</h1>
              <p className="text-zinc-400 font-medium text-lg leading-relaxed">
                You have been invited to join <span className="text-white font-bold">{inviteDetails.teamName}</span> for the upcoming event <span className="text-indigo-300 font-bold">{inviteDetails.eventName}</span>.
              </p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-2xl p-5 mb-10 flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-5 h-5 text-zinc-500" />
                <span className="text-zinc-400 font-medium">Invited Email:</span>
                <span className="text-white font-bold truncate">{inviteDetails.emailInvited}</span>
              </div>
              {isLoggedIn && currentUserEmail && (
                <div className={`flex items-start gap-3 p-3 rounded-xl border ${currentUserEmail.toLowerCase() === inviteDetails.emailInvited.toLowerCase() ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">
                    {currentUserEmail.toLowerCase() === inviteDetails.emailInvited.toLowerCase()
                      ? "Secure Match: You are logged in with the correct email address."
                      : `Warning: You are logged in as ${currentUserEmail}. This invite requires you to log in with the invited email.`}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {!isLoggedIn ? (
                <>
                  {/* Not logged in — show auth prompt */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-2">
                    <div className="flex items-start gap-3">
                      <LogIn className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-amber-300 font-bold text-sm leading-relaxed">
                          You need to sign in or create an account to accept this invitation.
                        </p>
                        <p className="text-amber-400/70 text-xs mt-1 font-medium">
                          You'll be brought right back here after signing in.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRedirectToAuth("login")}
                    className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-xl shadow-indigo-900/20 transition-all hover:scale-[1.02] flex items-center justify-center"
                  >
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In to Accept
                  </Button>
                  <Button
                    onClick={() => handleRedirectToAuth("register")}
                    variant="outline"
                    className="w-full h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-base transition-all hover:scale-[1.02] flex items-center justify-center"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Create Account & Join
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleAcceptInvite}
                  disabled={isAccepting || (currentUserEmail !== null && currentUserEmail.toLowerCase() !== inviteDetails.emailInvited.toLowerCase())}
                  className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-xl shadow-indigo-900/20 transition-all hover:scale-[1.02] flex items-center justify-center"
                >
                  {isAccepting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Accept Invitation"}
                  {!isAccepting && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
              )}
              <Link href="/home" className="block w-full">
                <Button variant="ghost" className="w-full h-14 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 font-bold transition-all">
                  Decline & Return Home
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}