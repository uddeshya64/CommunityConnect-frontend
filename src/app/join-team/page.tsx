"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/axios";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface InviteDetails {
  emailInvited: string;
  teamName: string;
  eventName: string;
  eventBanner?: string;
}

// ==========================================
// 1. THE INNER LOGIC COMPONENT
// This contains the useSearchParams hook and all the UI logic.
// ==========================================
function InviteLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // States
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Action States
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Auth State
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
        // 1. Check Authentication Status
        const authToken = localStorage.getItem("token");
        if (authToken) {
          setIsLoggedIn(true);
          try {
            const payload = JSON.parse(window.atob(authToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            setCurrentUserEmail(payload.email);
          } catch (e) {
            console.error("Failed to decode token email");
          }
        }

        // 2. Verify Invite Token
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
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!isLoggedIn) {
      localStorage.setItem("returnUrl", `/join-team?token=${token}`);
      router.push("/login"); // Assuming your login route is /login
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
        {/* ERROR STATE */}
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
        ) : 
        
        /* SUCCESS STATE */
        isSuccess ? (
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
        ) : 
        
        /* INVITE DETAILS STATE */
        inviteDetails && (
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
                <div className={`flex items-start gap-3 p-3 rounded-xl border ${currentUserEmail === inviteDetails.emailInvited ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">
                    {currentUserEmail === inviteDetails.emailInvited 
                      ? "Secure Match: You are logged in with the correct email address." 
                      : `Warning: You are logged in as ${currentUserEmail}. This invite requires you to log in with the invited email.`}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <Button 
                onClick={handleAcceptInvite} 
                disabled={isAccepting || (isLoggedIn && currentUserEmail !== inviteDetails.emailInvited)}
                className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-xl shadow-indigo-900/20 transition-all hover:scale-[1.02] flex items-center justify-center"
              >
                {isAccepting ? <Loader2 className="w-6 h-6 animate-spin" /> : 
                 !isLoggedIn ? "Log in to Accept Invite" : "Accept Invitation"}
                {!isAccepting && isLoggedIn && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
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

// ==========================================
// 2. THE MAIN EXPORTED PAGE COMPONENT
// This securely wraps the inner logic in a React Suspense boundary.
// ==========================================
export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans selection:bg-indigo-500/30 flex flex-col">
      <Navbar theme="dark" />

      <main className="flex-1 flex items-center justify-center p-6 pt-32 relative overflow-hidden">
        {/* Ambient Backgrounds */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        {/* The Suspense Boundary wrapping the logic */}
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center relative z-10">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-6" />
            <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-sm">Loading Workspace...</p>
          </div>
        }>
          <InviteLogic />
        </Suspense>

      </main>
    </div>
  );
}