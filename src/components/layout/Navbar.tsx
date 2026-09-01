"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, User } from "lucide-react";
import { useUser } from "@/components/providers/UserProvider";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { notificationService } from "@/services/notification.service";

interface NavbarProps {
  collapsed?: boolean;
  onToggleMobile?: () => void;
}

export default function Navbar({ collapsed = false, onToggleMobile }: NavbarProps) {
  const { isDark, activeAccent } = useAppearance();
  const pathname = usePathname();
  const { profile } = useUser();
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchNotifications = async () => {
      try {
        const notifs = await notificationService.getNotifications();
        if (isMounted && Array.isArray(notifs)) {
          setHasNotifications(notifs.length > 0);
        }
      } catch (err) {
        if (isMounted) setHasNotifications(false);
      }
    };

    fetchNotifications();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const avatarUrl = profile?.avatar_url || (profile as any)?.avatarUrl || null;
  const profileHref = profile?.id ? `/profile/${profile.id}` : "/profile";
  const isNotificationsActive = pathname === "/notifications";

  return (
    <header
      className={`sticky top-0 z-40 w-full h-16 border-b backdrop-blur-xl transition-all duration-300 ${isDark
        ? "bg-zinc-950/80 border-white/10 text-white"
        : "bg-white/80 border-zinc-200/70 text-zinc-900"
        }`}
    >
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* LEFT SECTION */}
        <div className="flex items-center gap-3">
          {/* Mobile view: Hamburger Menu trigger */}
          {onToggleMobile && (
            <button
              onClick={onToggleMobile}
              className={`md:hidden p-2 rounded-xl flex items-center justify-center transition-colors ${isDark
                ? "text-zinc-300 hover:text-white hover:bg-white/10"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Mobile view: Project Logo */}
          <Link
            href="/home"
            className="md:hidden flex items-center gap-2 font-extrabold text-lg group"
          >
            <div
              className={`w-8 h-8 rounded-xl bg-gradient-to-br ${activeAccent.gradient} shadow-sm flex items-center justify-center`}
            >
              <span className="text-white text-xs font-black">CC</span>
            </div>
            <span className={`font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              CommunityConnect
            </span>
          </Link>

          {/* Desktop Website view: Project Name */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/home"
              className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
            >
              <span
                className={`font-black text-xl tracking-tight ${isDark ? "text-white" : "text-zinc-900"
                  }`}
              >
                Community<span className={activeAccent.text}>Connect 360</span>
              </span>
            </Link>
          </div>
        </div>

        {/* RIGHT SECTION: Notification Bell + Profile Icon */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Notification Bell */}
          <Link href="/notifications">
            <div
              className={`relative p-2.5 rounded-full transition-all ${isNotificationsActive
                ? `${activeAccent.text} ${isDark ? "bg-white/10" : "bg-indigo-50"} ${activeAccent.border}`
                : `${isDark
                  ? "text-zinc-300 hover:text-white hover:bg-white/10"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                }`
                }`}
              title="Notifications"
            >
              <Bell className="w-5 h-5" strokeWidth={2.2} />
              {/* Notification dot indicator: only rendered if there are unread/pending notifications */}
              {hasNotifications && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950" />
              )}
            </div>
          </Link>

          {/* Profile Icon / Avatar */}
          <Link href={profileHref}>
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 ${isDark
                ? "border-zinc-700 hover:border-white"
                : "border-white hover:border-indigo-400"
                } shadow-md transition-all hover:scale-105 bg-gradient-to-br ${activeAccent.gradient
                } flex items-center justify-center shrink-0`}
              title={profile?.name || "Profile"}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile?.name || "Profile"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xs sm:text-sm">
                  {getInitials(profile?.name)}
                </span>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
