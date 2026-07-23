import { Suspense } from "react";
import Navbar from "@/components/NavBar";
import { Loader2 } from "lucide-react";
import JoinStaffClient from "./JoinStaffClient";

export const dynamic = 'force-dynamic';

export default function AcceptStaffInvitePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans selection:bg-indigo-500/30 flex flex-col">
      <Navbar theme="dark" />

      <main className="flex-1 flex items-center justify-center p-6 pt-32 relative overflow-hidden">
        {/* Ambient Backgrounds */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center relative z-10">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-6" />
            <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-sm">Loading Workspace...</p>
          </div>
        }>
          <JoinStaffClient />
        </Suspense>

      </main>
    </div>
  );
}
