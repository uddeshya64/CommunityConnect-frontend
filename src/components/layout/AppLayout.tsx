"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/app/home/SideBar";
import Navbar from "@/components/layout/Navbar";
import { hasStoredSession } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";

const PROTECTED_PREFIXES = [
  "/home",
  "/settings",
  "/profile",
  "/notifications",
  "/events/create",
  "/events/mine",
  "/events/saved",
  "/dashboard",
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { activeAccent } = useAppearance();

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  // Keep SSR and initial client hydration in exact sync to prevent React hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  const [authorized, setAuthorized] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    if (isProtected && !hasStoredSession()) {
      setAuthorized(false);
      const redirectQuery = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirectQuery}`);
    } else {
      setAuthorized(true);
    }
  }, [isProtected, pathname, router]);

  // Only display the unauthenticated loader if mounted on the client and confirmed unauthorized
  if (isMounted && isProtected && !authorized) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row relative w-full overflow-x-clip"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        transition: "background 0.25s ease, color 0.25s ease",
      }}
    >
      {/* Ambient background glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute w-[720px] h-[720px] -left-[200px] -top-[320px] rounded-full opacity-60 blur-3xl pointer-events-none"
          style={{
            background: `radial-gradient(closest-side, ${activeAccent.hex}22, transparent)`,
          }}
        />
        <div
          className="absolute w-[640px] h-[640px] -right-[220px] -bottom-[280px] rounded-full opacity-50 blur-3xl pointer-events-none"
          style={{
            background: `radial-gradient(closest-side, ${activeAccent.gradientEnd || "#8b5cf6"}18, transparent)`,
          }}
        />
      </div>

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Navbar
          collapsed={collapsed}
          onToggleMobile={() => setMobileOpen(true)}
        />
        <main className="flex-1 w-full min-w-0">{children}</main>
      </div>
    </div>
  );
}
