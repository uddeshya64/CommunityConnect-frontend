"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Compass,
  CalendarDays,
  Bookmark,
  Bell,
  PlusCircle,
  LayoutDashboard,
  Zap,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { useUser } from "@/components/providers/UserProvider";
import { useLogout } from "@/hooks/authHooks";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { notificationService } from "@/services/notification.service";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed?: boolean;
  setCollapsed?: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOpen?: boolean;
  setMobileOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Sidebar({
  collapsed: propCollapsed,
  setCollapsed: propSetCollapsed,
  mobileOpen: propMobileOpen,
  setMobileOpen: propSetMobileOpen,
}: SidebarProps = {}) {
  const { isDark, activeAccent, toggleTheme, theme } = useAppearance();
  const pathname = usePathname();
  const router = useRouter();

  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const mobileOpen = propMobileOpen ?? internalMobileOpen;
  const setMobileOpen = propSetMobileOpen ?? setInternalMobileOpen;

  const collapsed = propCollapsed ?? internalCollapsed;
  const setCollapsed = propSetCollapsed ?? setInternalCollapsed;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { profile, clearProfile } = useUser();
  const { logout, isLoading: isLoggingOut } = useLogout();

  // Fetch unread notifications count
  useEffect(() => {
    let isSubscribed = true;
    const fetchUnread = async () => {
      try {
        const res = await notificationService.getUnreadCount();
        if (isSubscribed && typeof (res as any)?.count === "number") {
          setUnreadCount((res as any).count);
        }
      } catch (e) {
        // Fallback default
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

  const handleConfirmLogout = async () => {
    try {
      await logout();
      clearProfile();
    } catch {
      clearProfile();
    } finally {
      setShowLogoutConfirm(false);
      router.push("/login");
    }
  };

  const navGroups: NavGroup[] = [
    {
      label: "Explore",
      items: [
        { label: "Home", href: "/home", icon: Home },
        { label: "Discover", href: "/discover", icon: Compass },
        { label: "My Events", href: "/events/mine/myEvents", icon: CalendarDays },
        { label: "Saved Events", href: "/events/saved", icon: Bookmark },
      ],
    },
  ];

  const renderContent = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden no-scrollbar">
      {/* Top brand + Navigation */}
      <div className="flex flex-col gap-1">
        {/* Brand Logo */}
        <div
          className={`flex items-center h-10 px-2 mb-3 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <Link
            href="/home"
            className="flex items-center gap-2.5 font-extrabold text-base tracking-tight hover:opacity-90 transition-opacity"
          >
            <div
              className="w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center text-white font-extrabold text-sm shadow-md transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(135deg, var(--accent), var(--accent2))`,
                boxShadow: `0 6px 18px -6px var(--accent)`,
              }}
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 5h14M5 12h9M5 19h14" />
                <circle cx="18" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            {!isCollapsed && (
              <span
                className="font-bricolage text-[17px] font-bold tracking-tight whitespace-nowrap"
                style={{ color: "var(--text)" }}
              >
                Event<span style={{ color: "var(--accent)" }}>rix</span>
              </span>
            )}
          </Link>
        </div>

        {/* Navigation Groups */}
        {navGroups.map((group, gIdx) => (
          <div key={group.label} className={gIdx > 0 ? "mt-4" : ""}>
            {!isCollapsed && (
              <div
                className="text-[10.5px] font-bold uppercase tracking-wider px-3.5 py-1.5 font-mono"
                style={{ color: "var(--subtle)" }}
              >
                {group.label}
              </div>
            )}
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/home" && pathname?.startsWith(`${item.href}`));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`flex items-center gap-3 h-10 px-3.5 rounded-full text-sm font-medium transition-all ${
                      isCollapsed ? "justify-center px-0" : ""
                    }`}
                    style={
                      isActive
                        ? {
                            background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                            color: "var(--accent)",
                            fontWeight: 600,
                          }
                        : {
                            background: "transparent",
                            color: "var(--muted)",
                          }
                    }
                  >
                    <Icon
                      className="w-5 h-5 shrink-0 transition-colors"
                      style={isActive ? { color: "var(--accent)" } : undefined}
                    />
                    {!isCollapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {!isCollapsed && item.badge !== undefined && (
                      <span
                        className="min-w-[18px] h-[18px] px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "var(--accent)" }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isCollapsed && item.badge !== undefined && (
                      <span
                        className="absolute top-2 right-2 w-2 h-2 rounded-full"
                        style={{ backgroundColor: "var(--accent)" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Create Event CTA Pill */}
        <div className="mt-4 px-1">
          <Link
            href="/events/create"
            title="Create Event"
            className={`flex items-center justify-center gap-2 h-11 rounded-full text-sm font-semibold text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform ${
              isCollapsed ? "w-10 h-10 mx-auto p-0" : "w-full px-4"
            }`}
            style={{
              background: `linear-gradient(135deg, var(--accent), var(--accent2))`,
              boxShadow: `0 8px 20px -8px var(--accent)`,
            }}
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Create Event</span>}
          </Link>
        </div>
      </div>

      {/* Bottom Controls: Settings, Logout, Collapse */}
      <div
        className="pt-3 border-t flex flex-col gap-1 mt-auto"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Settings */}
        <Link
          href="/settings"
          title="Settings"
          className={`flex items-center gap-3 h-10 px-3.5 rounded-full text-sm font-medium transition-colors ${
            isCollapsed ? "justify-center px-0" : ""
          }`}
          style={
            pathname?.startsWith("/settings")
              ? {
                  background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                  color: "var(--accent)",
                  fontWeight: 600,
                }
              : {
                  background: "transparent",
                  color: "var(--muted)",
                }
          }
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="flex-1 truncate">Settings</span>}
        </Link>

        {/* Log Out */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          title="Log out"
          className={`flex items-center gap-3 h-10 px-3.5 rounded-full text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors ${
            isCollapsed ? "justify-center px-0" : ""
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="flex-1 text-left truncate">Log out</span>}
        </button>

        {/* Collapse Sidebar Button (Desktop Only) */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`hidden md:flex items-center justify-center w-8 h-8 mt-1 rounded-full transition-colors ${
            isCollapsed ? "self-center" : "self-end mr-1"
          }`}
          style={{ color: "var(--subtle)" }}
        >
          {isCollapsed ? (
            <ChevronsRight className="w-4 h-4" />
          ) : (
            <ChevronsLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (Stationary across all pages) */}
      <aside
        className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 h-screen shrink-0 border-r p-3 z-40 transition-[width] duration-250 ease-out"
        style={{
          width: collapsed ? "76px" : "248px",
          background: "var(--chrome)",
          borderColor: "var(--border)",
          backdropFilter: "blur(24px)",
        }}
      >
        {renderContent(collapsed)}
      </aside>

      {/* Desktop spacer to preserve layout flow and prevent content overlap */}
      <div
        className="hidden md:block shrink-0 transition-[width] duration-250 ease-out"
        style={{
          width: collapsed ? "76px" : "248px",
        }}
        aria-hidden="true"
      />

      {/* Mobile Drawer Overlay & Sliding Panel */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="relative w-72 max-w-[85vw] h-full border-r p-4 z-50 flex flex-col justify-between shadow-2xl"
              style={{
                background: "var(--chrome)",
                borderColor: "var(--border)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div
                className="flex items-center justify-between pb-3 border-b mb-2"
                style={{ borderColor: "var(--border)" }}
              >
                <span
                  className="font-bricolage text-sm font-bold"
                  style={{ color: "var(--text)" }}
                >
                  Navigation
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: "var(--muted)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">{renderContent(false)}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bricolage text-lg font-bold text-white">
                    Sign Out?
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Are you sure you want to end your session?
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLogout}
                  disabled={isLoggingOut}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isLoggingOut && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
