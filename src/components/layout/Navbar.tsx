"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sun,
  Moon,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useUser } from "@/components/providers/UserProvider";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import NotificationBellIsland from "@/components/notifications/NotificationBellIsland";

interface NavbarProps {
  collapsed?: boolean;
  onToggleMobile?: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  "/home": "Home",
  "/discover": "Discover",
  "/events/create": "Create Event",
  "/events/create/ai": "Create with AI",
  "/events/create/new": "Manual Event Form",
  "/events/mine/myEvents": "My Events",
  "/events/saved": "Saved Events",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/profile": "Profile",
  "/dashboard/events": "Event Dashboard",
};

export default function Navbar({ collapsed = false, onToggleMobile }: NavbarProps) {
  const { isDark, activeAccent, toggleTheme } = useAppearance();
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();

  // Compute breadcrumb screen title
  let screenTitle = "Home";
  if (ROUTE_TITLES[pathname]) {
    screenTitle = ROUTE_TITLES[pathname];
  } else if (pathname?.startsWith("/events/create")) {
    screenTitle = "Create Event";
  } else if (pathname?.startsWith("/events/") && pathname?.includes("/quiz")) {
    screenTitle = "Live Quiz";
  } else if (pathname?.startsWith("/events/")) {
    screenTitle = "Event Details";
  } else if (pathname?.startsWith("/dashboard/")) {
    screenTitle = "Event Dashboard";
  } else if (pathname?.startsWith("/profile/")) {
    screenTitle = "User Profile";
  }

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        router.push("/discover");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);


  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const avatarUrl = profile?.avatar_url || (profile as any)?.avatarUrl || null;
  const profileHref = profile?.id ? `/profile/${profile.id}` : "/profile";

  return (
    <header
      className="sticky top-0 z-50 h-16 w-full flex items-center justify-between gap-4 px-4 md:px-7 border-b transition-colors duration-300"
      style={{
        background: "var(--chrome)",
        borderColor: "var(--border)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: isDark
          ? "0 4px 24px -2px rgba(0, 0, 0, 0.45)"
          : "0 4px 20px -2px rgba(15, 23, 42, 0.06)",
      }}
    >
      {/* LEFT: Mobile Menu + Breadcrumbs */}
      <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
        {onToggleMobile && (
          <button
            onClick={onToggleMobile}
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: "var(--muted)" }}
            title="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 text-sm whitespace-nowrap">
          <span className="hidden sm:inline font-medium" style={{ color: "var(--subtle)" }}>
            Workspace
          </span>
          <ChevronRight className="hidden sm:inline w-4 h-4" style={{ color: "var(--subtle)" }} />
          <span
            className="font-bricolage font-bold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            {screenTitle}
          </span>
        </div>
      </div>

      {/* RIGHT: Theme Toggle, Notifications, Avatar */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors"
          style={{
            background: "var(--input)",
            borderColor: "var(--border)",
            color: "var(--muted)",
          }}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" style={{ color: "var(--accent)" }} />
          )}
        </button>

        {/* Notifications Bell with Apple Glass Dynamic Island */}
        <NotificationBellIsland href="/notifications" />

        {/* Profile Avatar */}
        <Link
          href={profileHref}
          title={profile?.name || "View Profile"}
          className="w-9 h-9 rounded-full overflow-hidden border flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
          style={{
            background: `linear-gradient(135deg, var(--accent), var(--accent2))`,
            borderColor: "var(--border)",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={profile?.name || "User"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-xs font-bold">
              {getInitials(profile?.name)}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
