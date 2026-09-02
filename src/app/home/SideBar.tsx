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
import { useUser } from "@/components/providers/UserProvider";
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
  { label: "Saved", href: "/events/saved", icon: Bookmark },
];

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
  const { isDark, activeAccent } = useAppearance();
  const pathname = usePathname();
  const router = useRouter();

  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const mobileOpen = propMobileOpen ?? internalMobileOpen;
  const setMobileOpen = propSetMobileOpen ?? setInternalMobileOpen;

  const collapsed = propCollapsed ?? internalCollapsed;
  const setCollapsed = propSetCollapsed ?? setInternalCollapsed;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { profile, clearProfile } = useUser();
  const { logout, isLoading: isLoggingOut } = useLogout();

  const userName = profile?.name || "there";

  const handleConfirmLogout = async () => {
    try {
      await logout();
      clearProfile();
    } catch {
      // Tokens are cleared inside the hook on success; still redirect
      // even on failure so the user isn't stuck.
      clearProfile();
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
            {!isCollapsed}
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
                    className={`relative flex items-center rounded-full text-sm font-semibold text-zinc-400 cursor-not-allowed opacity-60 ${isCollapsed ? "justify-center px-0 py-2.5 w-11 h-11 mx-auto" : "gap-3 px-4 py-2.5"
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
                  className={`relative flex items-center rounded-full text-sm font-semibold transition-colors ${isCollapsed ? "justify-center px-0 py-2.5 w-11 h-11 mx-auto" : "gap-3 px-4 py-2.5"
                    } ${isActive
                      ? `${activeAccent.text} font-bold`
                      : `${isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"}`
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className={`absolute inset-0 rounded-full ${isDark ? "bg-white/10" : activeAccent.badgeBg} ${activeAccent.border} shadow-sm`}
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
            className={`mt-6 flex items-center justify-center gap-2 rounded-full ${activeAccent.bg} text-white hover:opacity-90 shadow-md ${activeAccent.shadow} text-sm font-semibold transition-all hover:scale-[1.02] ${isCollapsed ? "w-11 h-11 mx-auto p-0" : "w-full px-4 py-3"
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
            className={`relative flex items-center rounded-full text-sm font-semibold transition-colors ${isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-4 py-2.5"
              } ${pathname === "/settings"
                ? `${activeAccent.text} font-bold ${isDark ? "bg-white/10" : activeAccent.badgeBg} ${activeAccent.border}`
                : `${isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"}`
              }`}
          >
            <Settings className="w-4.5 h-4.5 shrink-0" strokeWidth={2.2} />
            {!isCollapsed && "Settings"}
          </div>
        </Link>
        <button
          title={isCollapsed ? "Log out" : undefined}
          className={`flex items-center rounded-full text-sm font-semibold transition-colors ${isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-4 py-2.5"
            } ${isDark
              ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-300"
              : "text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700"
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
      {/* Desktop sidebar placeholder spacer */}
      <motion.div
        animate={{ width: collapsed ? 88 : 256 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="hidden md:block shrink-0 h-screen"
      />

      {/* Desktop sidebar - fixed to viewport */}
      <motion.aside
        animate={{ width: collapsed ? 88 : 256 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className={`hidden md:flex md:flex-col fixed top-0 left-0 bottom-0 z-30 px-4 py-6 border-r ${isDark ? "border-white/5 bg-zinc-950/80 text-white" : "border-zinc-200/70 bg-white/70 text-zinc-900"} backdrop-blur-xl overflow-hidden transition-colors duration-300`}
      >
        {renderSidebarContent(collapsed)}
      </motion.aside>

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
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-600"
                  }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-zinc-900"} mb-2`}>Log out?</h2>
                <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-600"} font-medium mb-6`}>
                  Are you sure you want to log out of your account? You&apos;ll need to sign in again to continue.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    disabled={isLoggingOut}
                    className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer ${isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmLogout}
                    disabled={isLoggingOut}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-60 cursor-pointer"
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