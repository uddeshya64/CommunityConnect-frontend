"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/app/home/SideBar";
import Navbar from "@/components/layout/Navbar";
import { hasStoredSession } from "@/lib/auth";
import { Loader2 } from "lucide-react";

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

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  const [authorized, setAuthorized] = useState(() => {
    if (!isProtected) return true;
    return hasStoredSession();
  });

  useEffect(() => {
    if (isProtected && !hasStoredSession()) {
      setAuthorized(false);
      const redirectQuery = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirectQuery}`);
    } else {
      setAuthorized(true);
    }
  }, [isProtected, pathname, router]);

  // If attempting to view a protected page without an active session, block rendering
  if (isProtected && !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-xs font-semibold text-zinc-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative w-full overflow-x-hidden">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Navbar
          collapsed={collapsed}
          onToggleMobile={() => setMobileOpen(true)}
        />
        {children}
      </div>
    </div>
  );
}
