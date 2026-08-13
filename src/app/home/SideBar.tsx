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
  Settings,
  LogOut,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useMyProfile } from "@/hooks/profileHooks";
import { useLogout } from "@/hooks/authHooks";
import { useAppearance } from "@/components/providers/AppearanceProvider";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "My Events", href: "/events/mine/myEvents", icon: CalendarDays },
  { label: "Saved", href: "/saved", icon: Bookmark, disabled: true },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

export default function Sidebar() {
  const { isDark, activeAccent } = useAppearance();
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { getMyProfile } = useMyProfile();
  const { logout, isLoading: isLoggingOut } = useLogout();

  useEffect(() => {
    const fetchName = async () => {
      try {
        const profile = await getMyProfile();
        setUserName(profile.name || "there");
      } catch {
        setUserName("there");
      }
    };
    fetchName();
  }, []);

  const handleConfirmLogout = async () => {
    try {
      await logout();
    } catch {
      // Tokens are cleared inside the hook on success; still redirect
      // even on failure so the user isn't stuck.
    } finally {
      setShowLogoutConfirm(false);
      router.push("/login");
    }
  };

  // `collapsed` only ever applies to the desktop rail — the mobile drawer
  // always renders expanded since it's already hidden until opened.
  const renderSidebarContent = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col justify-between">
      {/* Logo + Nav */}
      <div>
        <div className={`flex items-center mb-10 ${isCollapsed ? "flex-col gap-3" : "justify-between px-2"}`}>
          <Link
            href="/home"
            className={`flex items-center gap-2 font-extrabold text-xl ${isDark ? "text-white" : "text-zinc-900"} hover:opacity-80 transition-opacity`}
          >
            <div className={`w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br ${activeAccent.gradient} shadow-sm flex items-center justify-center`}>
              <span className="text-white text-xs font-black">CC</span>
            </div>
            {!isCollapsed && <span>360</span>}
          </Link>

          {/* Collapse toggle — desktop only, hidden inside the mobile drawer copy */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:flex w-8 h-8 shrink-0 rounded-full items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const isDisabled = item.disabled;
            const Icon = item.icon;

            if (isDisabled) {
              return (
                <div key={item.href} title={isCollapsed ? item.label : undefined}>
                  <div
                    className={`relative flex items-center rounded-full text-sm font-semibold text-zinc-400 cursor-not-allowed opacity-60 ${
                      isCollapsed ? "justify-center px-0 py-2.5 w-11 h-11 mx-auto" : "gap-3 px-4 py-2.5"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 relative z-10 shrink-0" strokeWidth={2.2} />
                    {!isCollapsed && <span className="relative z-10">{item.label}</span>}
                  </div>
                </div>
              );
            }

            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} title={isCollapsed ? item.label : undefined}>
                <div
                  className={`relative flex items-center rounded-full text-sm font-semibold transition-colors ${
                    isCollapsed ? "justify-center px-0 py-2.5 w-11 h-11 mx-auto" : "gap-3 px-4 py-2.5"
                  } ${
                    isActive
                      ? `${activeAccent.text} font-bold`
                      : `${isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"}`
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className={`absolute inset-0 rounded-full ${isDark ? "bg-white/10" : "bg-indigo-50"} ${activeAccent.border} shadow-sm`}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className="w-4.5 h-4.5 relative z-10 shrink-0" strokeWidth={2.2} />
                  {!isCollapsed && <span className="relative z-10">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <Link href="/events/create" onClick={() => setMobileOpen(false)} title={isCollapsed ? "Create Event" : undefined}>
          <button
            className={`mt-6 flex items-center justify-center gap-2 rounded-full ${activeAccent.bg} text-white hover:opacity-90 shadow-md ${activeAccent.shadow} text-sm font-semibold transition-all hover:scale-[1.02] ${
              isCollapsed ? "w-11 h-11 mx-auto p-0" : "w-full px-4 py-3"
            }`}
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            {!isCollapsed && "Create Event"}
          </button>
        </Link>
      </div>

      {/* Footer: settings/logout */}
      <div className="border-t border-zinc-200/70 pt-4 flex flex-col gap-1">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          title={isCollapsed ? "Settings" : undefined}
        >
          <div
            className={`relative flex items-center rounded-full text-sm font-semibold transition-colors ${
              isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-4 py-2.5"
            } ${
              pathname === "/settings"
                ? `${activeAccent.text} font-bold ${isDark ? "bg-white/10" : "bg-indigo-50"} ${activeAccent.border}`
                : `${isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"}`
            }`}
          >
            <Settings className="w-4.5 h-4.5 shrink-0" strokeWidth={2.2} />
            {!isCollapsed && "Settings"}
          </div>
        </Link>
        <button
          title={isCollapsed ? "Log out" : undefined}
          className={`flex items-center rounded-full text-sm font-semibold text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition-colors ${
            isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-4 py-2.5"
          }`}
          onClick={() => {
            setMobileOpen(false);
            setShowLogoutConfirm(true);
          }}
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" strokeWidth={2.2} />
          {!isCollapsed && "Log out"}
        </button>
      
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 88 : 256 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className={`hidden md:flex md:flex-col shrink-0 h-screen sticky top-0 px-4 py-6 border-r ${isDark ? "border-white/5 bg-zinc-950/80 text-white" : "border-zinc-200/70 bg-white/70 text-zinc-900"} backdrop-blur-xl overflow-hidden transition-colors duration-300`}
      >
        {renderSidebarContent(collapsed)}
      </motion.aside>

      {/* Mobile top bar trigger */}
      <div className={`md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-16 ${isDark ? "bg-zinc-950/80 border-white/5 text-white" : "bg-white/70 border-zinc-200/50 text-zinc-900"} backdrop-blur-xl border-b transition-colors duration-300`}>
        {/* Left: Hamburger menu */}
        <button
          onClick={() => setMobileOpen(true)}
          className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? "text-zinc-400 hover:bg-white/5" : "text-zinc-600 hover:bg-zinc-100"} transition-colors relative z-10`}
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Center: Centered Logo */}
        <div className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center pointer-events-none">
          <Link href="/home" className={`flex items-center gap-2 font-extrabold text-lg ${isDark ? "text-white" : "text-zinc-900"} pointer-events-auto`}>
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${activeAccent.gradient} flex items-center justify-center`}>
              <span className="text-white text-[10px] font-black">CC</span>
            </div>
            Circle
          </Link>
        </div>

        {/* Right: Placeholder to keep space clear for the fixed floating profile avatar */}
        <div className="w-9 h-9 shrink-0" />
      </div>

      {/* Mobile drawer — always renders expanded, regardless of desktop collapsed state */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 ${isDark ? "bg-zinc-950 text-white border-r border-white/10" : "bg-white text-zinc-900"} px-4 py-6 shadow-2xl transition-colors duration-300`}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-5 right-4 w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
              {renderSidebarContent(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
              className="fixed inset-0 z-[60] bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-sm ${isDark ? "bg-zinc-900 border border-white/10 text-white" : "bg-white text-zinc-900"} rounded-3xl shadow-2xl p-6`}
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-zinc-900"} mb-2`}>Log out?</h2>
                <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"} font-medium mb-6`}>
                  Are you sure you want to log out of your account? You'll need to sign in again to continue.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    disabled={isLoggingOut}
                    className="flex-1 rounded-xl py-3 text-sm font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmLogout}
                    disabled={isLoggingOut}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-60"
                  >
                    {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log out"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}