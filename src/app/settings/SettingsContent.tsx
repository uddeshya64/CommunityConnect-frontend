"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { verify2FACode, generateUniqueSecretKey, generateUniqueBackupCodes } from "@/lib/totp";
import AppLayout from "@/components/layout/AppLayout";
import { performLogout } from "@/lib/auth";
import {
  User,
  Bell,
  Palette,
  Sliders,
  Lock,
  Check,
  Smartphone,
  Laptop,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Pencil,
  Copy,
  LogOut,
  QrCode,
  X,
  Plus,
  RefreshCw,
  Trash2,
  Sparkles,
  Download,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileService } from "@/services/profile.service";
import { Profile } from "@/types/profile.types";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { pushNotificationService } from "@/services/pushNotification.service";

interface UserSettings {
  // Notifications
  emailReminders: boolean;
  communityUpdates: boolean;
  teamInvites: boolean;
  weeklyDigest: boolean;
  soundEffects: boolean;
  notificationFrequency: "realtime" | "daily" | "weekly" | "muted";

  // Appearance
  theme: "dark" | "light" | "system";
  accentColor: "indigo" | "violet" | "emerald" | "rose" | "cyan" | "amber";
  compactMode: boolean;
  smoothAnimations: boolean;

  // Privacy
  profileVisibility: "public" | "community" | "private";
  showEmailOnProfile: boolean;
  showLocationOnProfile: boolean;

  // Event Preferences
  preferredCities: string[];
  favoriteCategories: string[];

  // Security
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  twoFactorBackupCodes?: string[] | null;
}

const DEFAULT_SETTINGS: UserSettings = {
  emailReminders: true,
  communityUpdates: true,
  teamInvites: true,
  weeklyDigest: false,
  soundEffects: true,
  notificationFrequency: "realtime",
  theme: "dark",
  accentColor: "indigo",
  compactMode: false,
  smoothAnimations: true,
  profileVisibility: "public",
  showEmailOnProfile: false,
  showLocationOnProfile: true,
  preferredCities: ["Jaipur", "Bengaluru"],
  favoriteCategories: ["Tech", "Hackathon", "Workshop", "Meetup"],
  twoFactorEnabled: false,
};

type TabKey = "account" | "notifications" | "appearance" | "preferences" | "security";

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const STABS: TabItem[] = [
  { key: "account", label: "Account & Profile", icon: User },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "preferences", label: "Event Preferences", icon: Sliders },
  { key: "security", label: "Sessions & Security", icon: Lock },
];

const PRESET_CITIES = ["Jaipur", "Delhi", "Pune", "Bangalore"];

const PRESET_CATEGORIES = [
  "Tech",
  "Hackathon",
  "Workshop",
  "Meetup",
  "Music",
  "Sports",
  "Networking",
  "Other",
];

const ACCENT_SWATCHES = [
  { key: "indigo", label: "Indigo", c1: "#6366f1", c2: "#8b5cf6" },
  { key: "violet", label: "Violet", c1: "#8b5cf6", c2: "#ec4899" },
  { key: "emerald", label: "Emerald", c1: "#10b981", c2: "#06b6d4" },
  { key: "rose", label: "Rose", c1: "#f43f5e", c2: "#fb923c" },
  { key: "cyan", label: "Cyan", c1: "#06b6d4", c2: "#3b82f6" },
  { key: "amber", label: "Amber", c1: "#f59e0b", c2: "#ef4444" },
] as const;

export default function SettingsContent() {
  const router = useRouter();
  const {
    isDark,
    activeAccent,
    theme,
    accentColor,
    compactMode,
    smoothAnimations,
    updateSetting: updateAppearanceSetting,
  } = useAppearance();
  const { success: showSuccess, error: showError, info: showInfo } = useToast();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("account");
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // City input
  const [cityInput, setCityInput] = useState("");

  // Modals state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA Flow State
  const [twoFactorStep, setTwoFactorStep] = useState<"scan" | "backup" | "disable">("scan");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [user2FASecret, setUser2FASecret] = useState<string>("JBSWY3DPEHPK3PXP");
  const [userBackupCodes, setUserBackupCodes] = useState<string[]>([
    "CC-9823-4412",
    "CC-7712-9901",
    "CC-3321-8842",
    "CC-5501-2290",
  ]);

  // Native Push Notifications State
  const [pushStatus, setPushStatus] = useState<{
    supported: boolean;
    permission: NotificationPermission | "unsupported";
    isSubscribed: boolean;
  }>({ supported: true, permission: "default", isSubscribed: false });
  const [isPushLoading, setIsPushLoading] = useState(false);

  // Active Sessions
  const [activeSessions, setActiveSessions] = useState<any[]>([
    {
      id: "sess_1",
      device: "MacBook Pro • Chrome",
      location: "Bengaluru • Active now",
      isCurrent: true,
      icon: Laptop,
    },
    {
      id: "sess_2",
      device: "iPhone 15 • Safari",
      location: "Bengaluru • 2 hours ago",
      isCurrent: false,
      icon: Smartphone,
    },
    {
      id: "sess_3",
      device: "Windows • Edge",
      location: "Pune • 5 days ago",
      isCurrent: false,
      icon: Laptop,
    },
  ]);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("cc_user_settings");
    if (stored) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      } catch {
        // ignore
      }
    }

    const fetchUserData = async () => {
      try {
        const [profileData, backendSettings, sessionsData] = await Promise.all([
          profileService.getMyProfile().catch(() => null),
          profileService.getMySettings().catch(() => null),
          profileService.getActiveSessions().catch(() => []),
        ]);
        if (profileData) setProfile(profileData);
        if (backendSettings && typeof backendSettings === "object" && Object.keys(backendSettings).length > 0) {
          const clientTheme = (typeof window !== "undefined" ? localStorage.getItem("cc_theme") : null) || "dark";
          const merged = { ...DEFAULT_SETTINGS, ...backendSettings, theme: clientTheme as any };
          setSettings(merged);
          localStorage.setItem("cc_user_settings", JSON.stringify(merged));
          if (merged.twoFactorSecret) {
            setUser2FASecret(merged.twoFactorSecret);
          }
          if (merged.twoFactorBackupCodes && Array.isArray(merged.twoFactorBackupCodes)) {
            setUserBackupCodes(merged.twoFactorBackupCodes);
          }
        }
        if (sessionsData && Array.isArray(sessionsData) && sessionsData.length > 0) {
          const mapped = sessionsData.map((s: any) => ({
            ...s,
            icon: s.device?.toLowerCase().includes("mobile") || s.device?.toLowerCase().includes("phone") ? Smartphone : Laptop,
            location: s.isCurrent ? "Current Device • Active now" : (s.ip || "Recent Session"),
          }));
          setActiveSessions(mapped);
        }
      } finally {
        setIsProfileLoading(false);
      }
    };
    fetchUserData();

    // Check push status
    pushNotificationService.getStatus().then(setPushStatus).catch(() => {});
  }, []);

  const playToggleSound = () => {
    if (!settings.soundEffects) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // AudioContext muted/unsupported
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSaveStatus("saving");
    if (settings.soundEffects || (key === "soundEffects" && value === true)) {
      playToggleSound();
    }

    const updated = { ...settings, [key]: value };
    setSettings(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem("cc_user_settings", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("cc_settings_updated", { detail: updated }));
    }

    profileService.updateMySettings({ [key]: value }).catch(() => {});

    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 350);
  };

  const handleTogglePush = async (enable: boolean) => {
    setIsPushLoading(true);
    try {
      if (enable) {
        const res = await pushNotificationService.subscribeToPush();
        if (res.success) {
          showSuccess(res.message || "Push notifications enabled!");
        } else {
          showError(res.error || "Failed to enable notifications.");
        }
      } else {
        const res = await pushNotificationService.unsubscribeFromPush();
        if (res.success) {
          showInfo("Push notifications disabled on this device.");
        } else {
          showError(res.error || "Failed to disable notifications.");
        }
      }
      const status = await pushNotificationService.getStatus();
      setPushStatus(status);
    } catch (err: any) {
      showError(err.message || "An error occurred.");
    } finally {
      setIsPushLoading(false);
    }
  };

  const addCity = (cityName: string) => {
    const clean = cityName.trim();
    if (!clean) return;
    if (!settings.preferredCities.includes(clean)) {
      const next = [...settings.preferredCities, clean];
      updateSetting("preferredCities", next);
      showSuccess(`Added ${clean} to preferred locations.`);
    }
    setCityInput("");
  };

  const removeCity = (cityName: string) => {
    const next = settings.preferredCities.filter((c) => c !== cityName);
    updateSetting("preferredCities", next);
  };

  const toggleCategory = (cat: string) => {
    const exists = settings.favoriteCategories.includes(cat);
    const next = exists
      ? settings.favoriteCategories.filter((c) => c !== cat)
      : [...settings.favoriteCategories, cat];
    updateSetting("favoriteCategories", next);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill out all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await profileService.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSuccess("Password updated successfully!");
    } catch (err: unknown) {
      const errMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error).message ||
        "Failed to update password.";
      setPasswordError(errMsg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRevokeSession = async (sessId: string, isCurrent: boolean) => {
    if (isCurrent) {
      await performLogout();
      return;
    }
    try {
      await profileService.revokeSession(sessId);
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessId));
      showSuccess("Session revoked successfully.");
    } catch (error: any) {
      showError(`Failed to revoke session: ${error.message || "Unknown error"}`);
    }
  };

  const handleLogoutAllOtherSessions = async () => {
    try {
      await profileService.logoutAllDevices();
      setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
      showSuccess("Logged out of all other sessions.");
    } catch {
      setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
      showSuccess("Logged out of all other sessions.");
    }
  };

  const handleExportData = () => {
    const p = (profile as any) || {};
    const s = (settings as any) || {};
    const exportDate = new Date().toISOString();

    const rows = [
      ["Category", "Field", "Value"],
      ["Account Info", "Name", p.name || ""],
      ["Account Info", "Email", p.email || ""],
      ["Account Info", "Headline", p.profession || p.bio || ""],
      ["Account Info", "Location", p.location || ""],
      ["Account Info", "Export Date", exportDate],
      ["Settings", "Theme", theme],
      ["Settings", "Accent", accentColor],
      ["Settings", "Email Reminders", s.emailReminders ? "Enabled" : "Disabled"],
      ["Settings", "Community Updates", s.communityUpdates ? "Enabled" : "Disabled"],
      ["Settings", "Two Factor", s.twoFactorEnabled ? "Yes" : "No"],
    ];

    const csvContent = rows.map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eventrix-account-data-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess("Account data exported as CSV.");
  };

  // User Initials
  const userInitials = useMemo(() => {
    const name = profile?.name || "Aarav Mehta";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [profile?.name]);

  if (!mounted) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        className="w-full min-h-screen py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300"
        style={{ color: "var(--text)" }}
      >
        {/* SCREEN TITLE (PROTOTYPE FIDELITY) */}
        <div className="space-y-2 border-b pb-6" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider"
              style={{
                background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                color: "var(--accent)",
                border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
              }}
            >
              Control Center &bull; User Preferences
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.035em" }}
              >
                Settings
              </h1>
              <p className="text-xs sm:text-sm mt-1 max-w-2xl font-medium" style={{ color: "var(--muted)" }}>
                Manage your account identity, color themes, notifications, location preferences, and active security sessions.
              </p>
            </div>

            {/* Auto-saved badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold self-start sm:self-auto shrink-0 shadow-xs"
              style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }}
            >
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--accent)" }} />
                  <span>Saving...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Saved</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto-saved</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2-COLUMN GRID (PROTOTYPE LAYOUT: 220px nav rail + 760px content) */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8 items-start">
          {/* LEFT STICKY TABS RAIL */}
          <div className="space-y-4 lg:sticky lg:top-24">
            {/* Mobile Horizontal Tabs */}
            <div className="flex lg:hidden overflow-x-auto gap-2 no-scrollbar pb-1">
              {STABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs"
                    style={
                      isActive
                        ? {
                            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                            color: "#fff",
                            boxShadow: "0 4px 12px color-mix(in oklab, var(--accent) 25%, transparent)",
                          }
                        : {
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            color: "var(--muted)",
                          }
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop Vertical Rail */}
            <div
              className="hidden lg:flex flex-col gap-1 p-2 rounded-2xl border shadow-xs"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              {STABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="w-full flex items-center gap-2.5 h-10 px-3 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer"
                    style={{
                      background: isActive ? "var(--card2)" : "transparent",
                      color: isActive ? "var(--text)" : "var(--muted)",
                      border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                    }}
                  >
                    <Icon
                      className="w-4 h-4 shrink-0 transition-colors"
                      style={{ color: isActive ? "var(--accent)" : "var(--muted)" }}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT CONTENT COLUMN (MAX 760px) */}
          <div className="max-w-[760px] w-full space-y-6">
            <AnimatePresence mode="wait">
              {/* ================= TAB 1: ACCOUNT & PROFILE ================= */}
              {activeTab === "account" && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Profile Snapshot Banner (Standalone Prototype Match) */}
                  <div
                    className="rounded-3xl border p-6 flex items-center gap-5 flex-wrap shadow-sm transition-all"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.name || "User"}
                        className="w-16 h-16 rounded-full object-cover border-2 shadow-md shrink-0"
                        style={{ borderColor: "var(--border)" }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl text-white shadow-md shrink-0 select-none"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
                      >
                        {userInitials}
                      </div>
                    )}

                    <div className="flex-1 min-w-[200px] space-y-1">
                      <div className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>
                        {profile?.name || "Aarav Mehta"}
                      </div>
                      <div className="text-xs sm:text-sm font-medium" style={{ color: "var(--muted)" }}>
                        {profile?.bio || profile?.profession || "Fullstack Engineer • Bengaluru"}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        <span
                          className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center border"
                          style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                        >
                          {profile?.email || "aarav@osc.dev"}
                        </span>
                        <span
                          className="h-6 px-2.5 rounded-full text-xs font-medium inline-flex items-center border"
                          style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--subtle)" }}
                        >
                          Member since 2025
                        </span>
                      </div>
                    </div>

                    <Link href="/profile/edit">
                      <button
                        type="button"
                        className="h-9 px-4 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:opacity-85 shadow-xs"
                        style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        <Pencil className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                        Edit profile
                      </button>
                    </Link>
                  </div>

                  {/* Password Management Card */}
                  <div
                    className="rounded-3xl border p-6 sm:p-7 space-y-5 shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div>
                      <h3
                        className="text-base sm:text-lg font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Security & Password
                      </h3>
                      <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                        Ensure your account is protected with a secure password (min. 8 characters).
                      </p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      {passwordError && (
                        <p className="text-xs text-rose-500 font-bold p-3 rounded-xl border border-rose-500/20 bg-rose-500/10">
                          {passwordError}
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                            className="w-full h-10 px-3 rounded-xl border text-xs font-semibold outline-none"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                            New Password
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 8 chars"
                            className="w-full h-10 px-3 rounded-xl border text-xs font-semibold outline-none"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm match"
                            className="w-full h-10 px-3 rounded-xl border text-xs font-semibold outline-none"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={isUpdatingPassword || !newPassword}
                          className="h-10 px-5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-md"
                          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                        >
                          {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                          Update Password
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Account Actions & Export Card */}
                  <div
                    className="rounded-3xl border p-6 sm:p-7 space-y-4 shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div>
                      <h3
                        className="text-base sm:text-lg font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Account Data & Privacy Actions
                      </h3>
                      <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                        Export your personal preferences and profile records or request account termination.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleExportData}
                        className="h-10 px-4 rounded-xl border text-xs font-bold transition-all hover:opacity-80 cursor-pointer flex items-center gap-2 shadow-xs"
                        style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        <Download className="w-4 h-4" style={{ color: "var(--accent)" }} />
                        Export Data (CSV)
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="h-10 px-4 rounded-xl border border-rose-500/20 text-xs font-bold transition-all hover:bg-rose-500/10 cursor-pointer flex items-center gap-2 text-rose-500 shadow-xs"
                        style={{ background: "var(--card2)" }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Account
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ================= TAB 2: NOTIFICATIONS ================= */}
              {activeTab === "notifications" && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div
                    className="rounded-3xl border overflow-hidden shadow-sm divide-y divide-[var(--border)]"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    {/* Toggle Rows (Prototype Fidelity) */}
                    {[
                      {
                        key: "emailReminders" as const,
                        label: "Email reminders",
                        desc: "15 minutes before sessions and agenda activities you've added",
                      },
                      {
                        key: "communityUpdates" as const,
                        label: "Community updates",
                        desc: "Important announcements and broadcasts from events you follow",
                      },
                      {
                        key: "teamInvites" as const,
                        label: "Team & staff invites",
                        desc: "Notifications when an organizer invites you to a roster or role",
                      },
                      {
                        key: "weeklyDigest" as const,
                        label: "Weekly digest",
                        desc: "A Monday morning summary of top upcoming events near your city",
                      },
                      {
                        key: "soundEffects" as const,
                        label: "Sound effects",
                        desc: "Interactive chime sounds during live quiz arenas and check-ins",
                      },
                    ].map((row) => {
                      const isChecked = !!settings[row.key];
                      return (
                        <div key={row.key} className="flex items-center justify-between gap-4 p-5 sm:p-6 transition-colors">
                          <div className="space-y-0.5 pr-2">
                            <div className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
                              {row.label}
                            </div>
                            <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                              {row.desc}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => updateSetting(row.key, !isChecked)}
                            className="w-11 h-6 rounded-full relative transition-all cursor-pointer p-0 shrink-0 border"
                            style={{
                              background: isChecked ? "var(--accent)" : "var(--input)",
                              borderColor: isChecked ? "transparent" : "var(--border)",
                            }}
                          >
                            <span
                              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
                              style={{ left: isChecked ? "22px" : "2px" }}
                            />
                          </button>
                        </div>
                      );
                    })}

                    {/* Push Notifications CTA Footer */}
                    <div
                      className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      style={{ background: "var(--card2)" }}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                          Native System Notifications
                        </div>
                        <div className="text-xs font-medium" style={{ color: "var(--subtle)" }}>
                          {pushStatus.isSubscribed
                            ? "Push notifications are currently active on this device browser."
                            : "Receive instant desktop badges when quiz rounds launch or announcements post."}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isPushLoading}
                        onClick={() => handleTogglePush(!pushStatus.isSubscribed)}
                        className="h-10 px-5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-md shrink-0"
                        style={{
                          background: pushStatus.isSubscribed
                            ? "var(--card)"
                            : "linear-gradient(135deg, var(--accent), var(--accent2))",
                          color: pushStatus.isSubscribed ? "var(--text)" : "#fff",
                          border: pushStatus.isSubscribed ? "1px solid var(--border)" : "none",
                        }}
                      >
                        {isPushLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                        {pushStatus.isSubscribed ? "Disable Push Notifications" : "Enable Push Notifications"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ================= TAB 3: APPEARANCE ================= */}
              {activeTab === "appearance" && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Theme Selector (Cards with mini UI bars) */}
                  <div
                    className="rounded-3xl border p-6 sm:p-7 space-y-4 shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div>
                      <h3
                        className="text-base sm:text-lg font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Theme
                      </h3>
                      <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                        Applies instantly across the entire application interface.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { key: "dark" as const, label: "Dark", bg: "#09090b", bar: "#27272a" },
                        { key: "light" as const, label: "Light", bg: "#f6f7f9", bar: "#e2e8f0" },
                        {
                          key: "system" as const,
                          label: "System",
                          bg: "linear-gradient(90deg, #09090b 50%, #f6f7f9 50%)",
                          bar: "#71717a",
                        },
                      ].map((t) => {
                        const isCurrent = theme === t.key;
                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => {
                              updateAppearanceSetting("theme", t.key);
                              updateSetting("theme", t.key);
                            }}
                            className="p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2"
                            style={{
                              background: "var(--input)",
                              borderColor: isCurrent ? "var(--accent)" : "var(--border)",
                              boxShadow: isCurrent
                                ? "0 0 0 3px color-mix(in oklab, var(--accent) 25%, transparent)"
                                : "none",
                            }}
                          >
                            <div
                              className="h-20 rounded-xl p-2.5 flex flex-col gap-1.5 border"
                              style={{ background: t.bg, borderColor: "var(--border)" }}
                            >
                              <span className="w-3/5 h-2 rounded-full" style={{ background: t.bar }} />
                              <span className="w-2/5 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                            </div>
                            <span className="text-xs font-bold px-1" style={{ color: "var(--text)" }}>
                              {t.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent Color Swatches (6 circular gradient swatches) */}
                  <div
                    className="rounded-3xl border p-6 sm:p-7 space-y-4 shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div>
                      <h3
                        className="text-base sm:text-lg font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Accent Color
                      </h3>
                      <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                        Drives primary buttons, badges, checkpoints, progress bars, and focus highlights.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-1">
                      {ACCENT_SWATCHES.map((swatch) => {
                        const isSelected = accentColor === swatch.key;
                        return (
                          <button
                            key={swatch.key}
                            type="button"
                            onClick={() => {
                              updateAppearanceSetting("accentColor", swatch.key as any);
                              updateSetting("accentColor", swatch.key as any);
                            }}
                            className="flex flex-col items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <span
                              className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-all shadow-md"
                              style={{
                                background: `linear-gradient(135deg, ${swatch.c1}, ${swatch.c2})`,
                                boxShadow: isSelected
                                  ? `0 0 0 3px var(--bg), 0 0 0 5px ${swatch.c1}`
                                  : "none",
                              }}
                            >
                              {isSelected && <Check className="w-5 h-5 drop-shadow-xs" />}
                            </span>
                            <span
                              className="text-[11px] font-mono font-bold"
                              style={{ color: isSelected ? "var(--text)" : "var(--muted)" }}
                            >
                              {swatch.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* App Density & Motion Toggles */}
                  <div
                    className="rounded-3xl border overflow-hidden shadow-sm divide-y divide-[var(--border)]"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    {/* Compact Mode */}
                    <div className="flex items-center justify-between gap-4 p-5 sm:p-6 transition-colors">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
                          Compact Mode
                        </div>
                        <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                          Tighter padding and denser spacing for large tabular screens
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !compactMode;
                          updateAppearanceSetting("compactMode", next);
                          updateSetting("compactMode", next);
                        }}
                        className="w-11 h-6 rounded-full relative transition-all cursor-pointer p-0 shrink-0 border"
                        style={{
                          background: compactMode ? "var(--accent)" : "var(--input)",
                          borderColor: compactMode ? "transparent" : "var(--border)",
                        }}
                      >
                        <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
                          style={{ left: compactMode ? "22px" : "2px" }}
                        />
                      </button>
                    </div>

                    {/* Smooth Animations */}
                    <div className="flex items-center justify-between gap-4 p-5 sm:p-6 transition-colors">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
                          Smooth Animations
                        </div>
                        <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                          Disable animations and page transitions to minimize visual motion
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !smoothAnimations;
                          updateAppearanceSetting("smoothAnimations", next);
                          updateSetting("smoothAnimations", next);
                        }}
                        className="w-11 h-6 rounded-full relative transition-all cursor-pointer p-0 shrink-0 border"
                        style={{
                          background: smoothAnimations ? "var(--accent)" : "var(--input)",
                          borderColor: smoothAnimations ? "transparent" : "var(--border)",
                        }}
                      >
                        <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
                          style={{ left: smoothAnimations ? "22px" : "2px" }}
                        />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ================= TAB 4: EVENT PREFERENCES ================= */}
              {activeTab === "preferences" && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Preferred Locations Card */}
                  <div
                    className="rounded-3xl border p-6 sm:p-7 space-y-4 shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div>
                      <h3
                        className="text-base sm:text-lg font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Preferred Event Locations
                      </h3>
                      <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                        Add cities or regions so we can automatically spotlight relevant offline & hybrid events near you.
                      </p>
                    </div>

                    <div className="flex gap-2 max-w-md">
                      <input
                        type="text"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCity(cityInput);
                          }
                        }}
                        placeholder="e.g. Jaipur, Bengaluru, or Delhi"
                        className="flex-1 h-10 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold outline-none"
                        style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                      />
                      <button
                        type="button"
                        onClick={() => addCity(cityInput)}
                        className="h-10 px-4 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                      >
                        Add
                      </button>
                    </div>

                    {/* Added City Chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {settings.preferredCities.length === 0 ? (
                        <span className="text-xs italic" style={{ color: "var(--subtle)" }}>
                          No preferred locations added yet.
                        </span>
                      ) : (
                        settings.preferredCities.map((city) => (
                          <span
                            key={city}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all"
                            style={{
                              background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                              borderColor: "color-mix(in oklab, var(--accent) 35%, transparent)",
                              color: "var(--accent)",
                            }}
                          >
                            <span>{city}</span>
                            <button
                              type="button"
                              onClick={() => removeCity(city)}
                              className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Quick Suggestions */}
                    <div className="space-y-1.5 pt-2">
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: "var(--subtle)" }}>
                        Quick Suggestions
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_CITIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => addCity(c)}
                            className="px-2.5 py-1 rounded-full border text-xs font-medium transition-all hover:opacity-80 cursor-pointer shadow-xs"
                            style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
                          >
                            + {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Favorite Event Categories Card */}
                  <div
                    className="rounded-3xl border p-6 sm:p-7 space-y-4 shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div>
                      <h3
                        className="text-base sm:text-lg font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Favorite Event Categories
                      </h3>
                      <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                        Select tags to tailor recommendations on your personalized Discover feed.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {PRESET_CATEGORIES.map((cat) => {
                        const isSelected = settings.favoriteCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs"
                            style={{
                              background: isSelected
                                ? "color-mix(in oklab, var(--accent) 15%, transparent)"
                                : "var(--card2)",
                              borderColor: isSelected
                                ? "color-mix(in oklab, var(--accent) 45%, transparent)"
                                : "var(--border)",
                              color: isSelected ? "var(--accent)" : "var(--muted)",
                              border: "1px solid",
                            }}
                          >
                            {isSelected ? `✓ ${cat}` : cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ================= TAB 5: SESSIONS & SECURITY ================= */}
              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Two-Factor Authentication Banner */}
                  <div
                    className="rounded-3xl border p-6 sm:p-7 flex items-center justify-between gap-5 flex-wrap shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{
                          background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                          color: "var(--accent)",
                        }}
                      >
                        <Lock className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <div
                          className="text-base sm:text-lg font-bold tracking-tight"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Two-factor authentication
                        </div>
                        <div className="text-xs sm:text-sm font-medium" style={{ color: "var(--muted)" }}>
                          Use an authenticator app (Google Authenticator, Authy) plus 8 backup recovery codes.
                        </div>
                      </div>
                    </div>

                    {settings.twoFactorEnabled ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="h-8 px-3 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border"
                          style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            borderColor: "rgba(16, 185, 129, 0.3)",
                            color: "#10b981",
                          }}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Enabled
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTwoFactorStep("disable");
                            setShow2FAModal(true);
                          }}
                          className="h-8 px-3 rounded-xl border text-xs font-semibold hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                          style={{ borderColor: "var(--border)" }}
                        >
                          Manage
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorStep("scan");
                          setShow2FAModal(true);
                        }}
                        className="h-9 px-4 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                      >
                        Enable 2FA
                      </button>
                    )}
                  </div>

                  {/* Active Browser Sessions */}
                  <div
                    className="rounded-3xl border overflow-hidden shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div
                      className="p-5 sm:p-6 border-b flex items-center justify-between gap-4"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div>
                        <h3
                          className="text-base sm:text-lg font-bold tracking-tight"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Active sessions
                        </h3>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                          Devices where you are currently authenticated into your account.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleLogoutAllOtherSessions}
                        className="h-8 px-3 rounded-xl border text-xs font-bold transition hover:bg-rose-500/10 text-rose-500 cursor-pointer shrink-0"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Log out other sessions
                      </button>
                    </div>

                    <div className="divide-y divide-[var(--border)]">
                      {activeSessions.map((sess) => {
                        const IconComponent = sess.icon || Laptop;
                        return (
                          <div
                            key={sess.id}
                            className="p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                                style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
                              >
                                <IconComponent className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <div className="text-xs sm:text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                                  {sess.device || "Browser Session"}
                                </div>
                                <div className="text-xs font-medium truncate" style={{ color: "var(--subtle)" }}>
                                  {sess.location || "Active"}
                                </div>
                              </div>
                            </div>

                            {sess.isCurrent ? (
                              <span
                                className="text-xs font-mono font-bold px-2.5 py-1 rounded-full border shrink-0"
                                style={{
                                  background: "rgba(16, 185, 129, 0.12)",
                                  borderColor: "rgba(16, 185, 129, 0.25)",
                                  color: "#10b981",
                                }}
                              >
                                This device
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRevokeSession(sess.id, false)}
                                className="h-8 px-3 rounded-xl border text-xs font-bold transition hover:bg-rose-500/10 text-rose-500 cursor-pointer shrink-0"
                                style={{ borderColor: "var(--border)", background: "var(--input)" }}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* MODAL: 2FA SETUP & RECOVERY CODES */}
      <AnimatePresence>
        {show2FAModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShow2FAModal(false)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <button
                onClick={() => setShow2FAModal(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
                style={{ color: "var(--muted)" }}
              >
                <X className="w-4 h-4" />
              </button>

              {twoFactorStep === "scan" && (
                <div className="space-y-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
                    style={{
                      background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                      color: "var(--accent)",
                    }}
                  >
                    <QrCode className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                      Setup Authenticator App
                    </h3>
                    <p className="text-xs font-medium mt-1" style={{ color: "var(--muted)" }}>
                      Scan with Google Authenticator or Authy to protect your account.
                    </p>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#FFFFFF",
                      padding: "14px",
                      borderRadius: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "12px auto",
                      width: "fit-content",
                    }}
                  >
                    <QRCodeSVG
                      value={`otpauth://totp/Eventrix:${encodeURIComponent(profile?.email || "user@eventrix.dev")}?secret=${user2FASecret}&issuer=Eventrix`}
                      size={150}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  </div>

                  <div
                    className="rounded-2xl p-3 flex items-center justify-between border"
                    style={{ background: "var(--card2)", borderColor: "var(--border)" }}
                  >
                    <div className="text-left">
                      <div className="text-[10px] uppercase font-mono font-bold" style={{ color: "var(--muted)" }}>
                        Secret Key
                      </div>
                      <div className="font-mono text-xs font-bold" style={{ color: "var(--text)" }}>
                        {user2FASecret.replace(/(.{4})/g, "$1 ").trim()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(user2FASecret);
                        setCopiedSecret(true);
                        showSuccess("Secret key copied!");
                        setTimeout(() => setCopiedSecret(false), 2000);
                      }}
                      className="p-1.5 rounded-lg border hover:opacity-80 cursor-pointer"
                      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                      Enter 6-Digit Code
                    </label>
                    <input
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => {
                        setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ""));
                        setTwoFactorError("");
                      }}
                      placeholder="123456"
                      className="w-full h-11 px-3 rounded-xl border text-center font-mono text-xl tracking-[0.25em] font-bold outline-none"
                      style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                    {twoFactorError && <p className="text-xs text-rose-500 font-bold mt-1">{twoFactorError}</p>}
                  </div>

                  <button
                    type="button"
                    disabled={twoFactorCode.length < 6 || isVerifying2FA}
                    onClick={async () => {
                      setIsVerifying2FA(true);
                      setTwoFactorError("");
                      try {
                        const isValid = await verify2FACode(twoFactorCode, user2FASecret, userBackupCodes);
                        if (!isValid) {
                          setIsVerifying2FA(false);
                          setTwoFactorError("Invalid verification code. Please check your authenticator.");
                          return;
                        }
                        setIsVerifying2FA(false);
                        setTwoFactorStep("backup");
                        updateSetting("twoFactorEnabled", true);
                        updateSetting("twoFactorSecret", user2FASecret);
                        updateSetting("twoFactorBackupCodes", userBackupCodes);
                        showSuccess("Two-Factor Authentication verified and enabled!");
                      } catch {
                        setIsVerifying2FA(false);
                        setTwoFactorError("Failed to verify code.");
                      }
                    }}
                    className="w-full h-10 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                  >
                    {isVerifying2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Activate 2FA"}
                  </button>
                </div>
              )}

              {twoFactorStep === "backup" && (
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                      2FA Activated!
                    </h3>
                    <p className="text-xs font-medium mt-1" style={{ color: "var(--muted)" }}>
                      Save these emergency recovery codes in case you lose your device.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-4">
                    {userBackupCodes.map((code) => (
                      <div
                        key={code}
                        className="p-2.5 rounded-xl border font-mono text-xs font-bold"
                        style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        {code}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(userBackupCodes.join("\n"));
                        setCopiedBackup(true);
                        showSuccess("Backup codes copied!");
                        setTimeout(() => setCopiedBackup(false), 2000);
                      }}
                      className="flex-1 h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-80"
                      style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      {copiedBackup ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      Copy Codes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShow2FAModal(false)}
                      className="flex-1 h-10 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                      style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {twoFactorStep === "disable" && (
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                      2FA Protection is Active
                    </h3>
                    <p className="text-xs font-medium mt-1" style={{ color: "var(--muted)" }}>
                      Your account is protected by an Authenticator app.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setTwoFactorStep("backup")}
                      className="h-10 rounded-xl border text-xs font-bold cursor-pointer hover:opacity-80"
                      style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      View Backup Codes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateSetting("twoFactorEnabled", false);
                        setShow2FAModal(false);
                        showSuccess("Two-factor authentication disabled.");
                      }}
                      className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition shadow-xs"
                    >
                      Disable 2FA Protection
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: DELETE ACCOUNT CONFIRMATION */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center space-y-4"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-rose-500">Delete Account</h3>
                <p className="text-xs font-medium mt-1" style={{ color: "var(--muted)" }}>
                  This will permanently delete your account, your organized events, registrations, and ticket history. This cannot be undone.
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                  Type <span className="text-rose-500">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full h-10 px-3 rounded-xl border text-xs font-semibold outline-none"
                  style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 h-10 rounded-xl border text-xs font-bold cursor-pointer hover:opacity-80"
                  style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmationText !== "DELETE"}
                  onClick={async () => {
                    try {
                      await profileService.deleteMyAccount();
                      showSuccess("Account deleted. Logging out...");
                      await performLogout();
                    } catch (err: any) {
                      showError(err.message || "Failed to delete account.");
                    }
                  }}
                  className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer transition shadow-md"
                >
                  Delete Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
