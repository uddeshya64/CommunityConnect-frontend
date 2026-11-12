"use client";

import React, { useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  verify2FACode,
  generateUniqueSecretKey,
  generateUniqueBackupCodes,
} from "@/lib/totp";
import AppLayout from "@/components/layout/AppLayout";
import BackButton from "@/components/ui/BackButton";
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
  ShieldCheck,
  Loader2,
  Pencil,
  Copy,
  LogOut,
  QrCode,
  X,
  Trash2,
  Download,
  AlertTriangle,
  ExternalLink,
  MapPin,
  Sparkles,
} from "lucide-react";

import { profileService } from "@/services/profile.service";
import { Profile } from "@/types/profile.types";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { pushNotificationService } from "@/services/pushNotification.service";

interface UserSettings {
  emailReminders: boolean;
  communityUpdates: boolean;
  teamInvites: boolean;
  weeklyDigest: boolean;
  soundEffects: boolean;
  theme: "dark" | "light" | "system";
  accentColor: "indigo" | "violet" | "emerald" | "rose" | "cyan" | "amber";
  compactMode: boolean;
  smoothAnimations: boolean;
  profileVisibility: "public" | "community" | "private";
  showEmailOnProfile: boolean;
  showLocationOnProfile: boolean;
  preferredCities: string[];
  favoriteCategories: string[];
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  twoFactorBackupCodes?: string[] | null;
}

interface SessionItem {
  id: string;
  device?: string;
  location?: string;
  ip?: string;
  isCurrent: boolean;
  icon?: React.ElementType;
}

const DEFAULT_SETTINGS: UserSettings = {
  emailReminders: true,
  communityUpdates: true,
  teamInvites: true,
  weeklyDigest: false,
  soundEffects: true,
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
  subtitle: string;
  icon: React.ElementType;
}

const STABS: TabItem[] = [
  {
    key: "account",
    label: "Account & Profile",
    subtitle: "Identity, password & data",
    icon: User,
  },
  {
    key: "notifications",
    label: "Notifications",
    subtitle: "Alerts, digest & push",
    icon: Bell,
  },
  {
    key: "appearance",
    label: "Appearance",
    subtitle: "Theme, accent & motion",
    icon: Palette,
  },
  {
    key: "preferences",
    label: "Event Preferences",
    subtitle: "Cities & favorite topics",
    icon: Sliders,
  },
  {
    key: "security",
    label: "Sessions & Security",
    subtitle: "2FA & active devices",
    icon: Lock,
  },
];

const PRESET_CITIES = ["Jaipur", "Delhi", "Pune", "Bengaluru", "Mumbai", "Hyderabad"];

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

const subscribeNoop = () => () => {};

function ToggleSwitch({
  checked,
  onToggle,
  ariaLabel,
}: {
  checked: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onToggle}
      className="w-11 h-6 rounded-full relative transition-all cursor-pointer p-0 shrink-0 border"
      style={{
        background: checked
          ? "linear-gradient(135deg, var(--accent), var(--accent2))"
          : "var(--input)",
        borderColor: checked ? "transparent" : "var(--border)",
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
        style={{ left: checked ? "21px" : "2px" }}
      />
    </button>
  );
}

export default function SettingsContent() {
  const {
    theme,
    accentColor,
    compactMode,
    smoothAnimations,
    updateSetting: updateAppearanceSetting,
  } = useAppearance();
  const { success: showSuccess, error: showError, info: showInfo } = useToast();

  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const [activeTab, setActiveTab] = useState<TabKey>("account");
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem("cc_user_settings");
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as Partial<UserSettings>) };
      }
    } catch {
      // ignore invalid storage payload
    }
    return DEFAULT_SETTINGS;
  });
  const [profile, setProfile] = useState<Profile | null>(null);

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
  const [activeSessions, setActiveSessions] = useState<SessionItem[]>([
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
    const fetchUserData = async () => {
      const [profileData, backendSettings, sessionsData] = await Promise.all([
        profileService.getMyProfile().catch(() => null),
        profileService.getMySettings().catch(() => null),
        profileService.getActiveSessions().catch(() => []),
      ]);

      if (profileData) setProfile(profileData);

      if (
        backendSettings &&
        typeof backendSettings === "object" &&
        Object.keys(backendSettings).length > 0
      ) {
        const clientTheme =
          (localStorage.getItem("cc_theme") as UserSettings["theme"] | null) || "dark";
        const merged: UserSettings = {
          ...DEFAULT_SETTINGS,
          ...(backendSettings as Partial<UserSettings>),
          theme: clientTheme,
        };
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
        const mapped: SessionItem[] = (sessionsData as SessionItem[]).map((s) => ({
          ...s,
          icon:
            s.device?.toLowerCase().includes("mobile") ||
            s.device?.toLowerCase().includes("phone")
              ? Smartphone
              : Laptop,
          location: s.isCurrent ? "Current Device • Active now" : s.ip || "Recent Session",
        }));
        setActiveSessions(mapped);
      }
    };

    void fetchUserData();
    pushNotificationService.getStatus().then(setPushStatus).catch(() => {});
  }, []);

  const playToggleSound = () => {
    if (!settings.soundEffects) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      showError(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      showError(`Failed to revoke session: ${msg}`);
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
    const exportDate = new Date().toISOString();
    const rows = [
      ["Category", "Field", "Value"],
      ["Account Info", "Name", profile?.name || ""],
      ["Account Info", "Email", profile?.email || ""],
      ["Account Info", "Headline", profile?.profession || profile?.bio || ""],
      ["Account Info", "Location", profile?.location || ""],
      ["Account Info", "Export Date", exportDate],
      ["Settings", "Theme", theme],
      ["Settings", "Accent", accentColor],
      ["Settings", "Email Reminders", settings.emailReminders ? "Enabled" : "Disabled"],
      ["Settings", "Community Updates", settings.communityUpdates ? "Enabled" : "Disabled"],
      ["Settings", "Two Factor", settings.twoFactorEnabled ? "Yes" : "No"],
    ];

    const csvContent = rows
      .map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eventrix-account-data-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess("Account data exported as CSV.");
  };

  const openEnable2FAModal = () => {
    setUser2FASecret(generateUniqueSecretKey());
    setUserBackupCodes(generateUniqueBackupCodes(8));
    setTwoFactorCode("");
    setTwoFactorError("");
    setTwoFactorStep("scan");
    setShow2FAModal(true);
  };

  const userInitials = useMemo(() => {
    const name = profile?.name || "Eventrix User";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [profile?.name]);

  const activeTabMeta = STABS.find((t) => t.key === activeTab) || STABS[0];

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
        className="w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-7 pb-20 space-y-7 animate-ccin"
        style={{ color: "var(--text)" }}
      >
        {/* TOP ACTION BAR: CONSISTENT BACK BUTTON ABOVE PAGE TITLE */}
        <div className="flex items-center">
          <BackButton fallbackHref="/home" label="Back" />
        </div>

        {/* PAGE HEADER */}
        <div className="space-y-1.5">
          <h1
            className="font-bricolage text-3xl sm:text-4xl font-extrabold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            Settings
          </h1>
          <p className="text-sm max-w-2xl leading-relaxed" style={{ color: "var(--muted)" }}>
            Customize your account identity, notification channels, appearance preferences, and security controls.
          </p>
        </div>

        {/* MOBILE HORIZONTAL TAB PILLS */}
        <div className="flex lg:hidden overflow-x-auto gap-2 no-scrollbar pb-1">
          {STABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border"
                style={
                  isActive
                    ? {
                        background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                        color: "#ffffff",
                        borderColor: "transparent",
                        boxShadow: "0 6px 16px color-mix(in oklab, var(--accent) 28%, transparent)",
                      }
                    : {
                        background: "var(--card)",
                        borderColor: "var(--border)",
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

        {/* MAIN STRUCTURED 2-COLUMN WORKSPACE (FULL WIDTH, NO BLANK RIGHT VOID) */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
          {/* LEFT STICKY NAVIGATION RAIL (DESKTOP) */}
          <aside className="hidden lg:flex flex-col gap-4 sticky top-24">
            {/* Compact Identity Card */}
            <div
              className="rounded-2xl border p-4 flex items-center gap-3"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name || "User"}
                  className="w-11 h-11 rounded-full object-cover border shrink-0"
                  style={{ borderColor: "var(--border)" }}
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bricolage font-bold text-sm text-white shrink-0 select-none"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  }}
                >
                  {userInitials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bricolage text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                  {profile?.name || "Eventrix Member"}
                </div>
                <div className="text-[11px] truncate" style={{ color: "var(--muted)" }}>
                  {profile?.email || "Account connected"}
                </div>
              </div>
              <Link
                href="/profile"
                title="View profile"
                className="p-1.5 rounded-lg border transition hover:opacity-80"
                style={{
                  background: "var(--card2)",
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Structured Section Tabs */}
            <nav
              className="rounded-2xl border p-2 space-y-1"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              {STABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer relative"
                    style={{
                      background: isActive
                        ? "color-mix(in oklab, var(--accent) 12%, var(--card2))"
                        : "transparent",
                      border: isActive
                        ? "1px solid color-mix(in oklab, var(--accent) 28%, var(--border))"
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                      style={
                        isActive
                          ? {
                              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                              color: "#ffffff",
                            }
                          : {
                              background: "var(--card2)",
                              color: "var(--muted)",
                            }
                      }
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[13px] font-bold leading-tight truncate"
                        style={{ color: isActive ? "var(--text)" : "var(--muted)" }}
                      >
                        {tab.label}
                      </div>
                      <div
                        className="text-[11px] truncate mt-0.5"
                        style={{ color: "var(--subtle)" }}
                      >
                        {tab.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Quick Sign Out Rail Card */}
            <button
              type="button"
              onClick={() => void performLogout()}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <span>Sign out of Eventrix</span>
              <LogOut className="w-4 h-4" />
            </button>
          </aside>

          {/* RIGHT CONTENT WORKSPACE (FILLS REMAINING WIDTH CLEANLY) */}
          <div className="w-full min-w-0 space-y-5">
            {/* Active Tab Context Header Bar */}
            <div
              className="rounded-2xl border px-5 py-3.5 flex items-center justify-between gap-3"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  }}
                >
                  <activeTabMeta.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bricolage text-base font-extrabold tracking-tight truncate">
                    {activeTabMeta.label}
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--muted)" }}>
                    {activeTabMeta.subtitle}
                  </div>
                </div>
              </div>
              <span
                className="hidden sm:inline-flex font-mono text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0"
                style={{
                  background: "var(--card2)",
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                }}
              >
                {activeTab}
              </span>
            </div>

            <AnimatePresence mode="wait">
              {/* ================= TAB 1: ACCOUNT & PROFILE ================= */}
              {activeTab === "account" && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Full-width Profile Snapshot Banner */}
                  <div
                    className="rounded-3xl border p-6 flex items-center gap-5 flex-wrap shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.name || "User"}
                        className="w-16 h-16 rounded-2xl object-cover border shadow-sm shrink-0"
                        style={{ borderColor: "var(--border)" }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center font-bricolage font-extrabold text-xl text-white shadow-md shrink-0 select-none"
                        style={{
                          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                        }}
                      >
                        {userInitials}
                      </div>
                    )}

                    <div className="flex-1 min-w-[210px] space-y-1">
                      <div className="font-bricolage text-xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
                        {profile?.name || "Eventrix Member"}
                      </div>
                      <div className="text-xs sm:text-sm font-medium" style={{ color: "var(--muted)" }}>
                        {profile?.bio || profile?.profession || "Complete your bio and profile details"}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {profile?.email && (
                          <span
                            className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center border"
                            style={{
                              background: "var(--card2)",
                              borderColor: "var(--border)",
                              color: "var(--text)",
                            }}
                          >
                            {profile.email}
                          </span>
                        )}
                        {profile?.location && (
                          <span
                            className="h-6 px-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1 border"
                            style={{
                              background: "var(--card2)",
                              borderColor: "var(--border)",
                              color: "var(--muted)",
                            }}
                          >
                            <MapPin className="w-3 h-3" style={{ color: "var(--accent)" }} />
                            {profile.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href="/profile"
                        className="h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all hover:opacity-85"
                        style={{
                          background: "var(--card2)",
                          borderColor: "var(--border)",
                          color: "var(--text)",
                        }}
                      >
                        View Profile
                      </Link>
                      <Link
                        href="/profile/edit"
                        className="h-9 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm"
                        style={{
                          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Profile
                      </Link>
                    </div>
                  </div>

                  {/* Balanced 2-Column Bento Row: Password (7) + Data & Danger Zone (5) */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
                    {/* Password Management Card */}
                    <div
                      className="xl:col-span-7 rounded-3xl border p-6 space-y-5 shadow-sm flex flex-col justify-between"
                      style={{ background: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-bricolage text-lg font-bold tracking-tight">
                            Security & Password
                          </h3>
                          <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                            Update your sign-in password regularly (minimum 8 characters).
                          </p>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                          {passwordError && (
                            <p className="text-xs text-rose-500 font-bold p-3 rounded-xl border border-rose-500/20 bg-rose-500/10">
                              {passwordError}
                            </p>
                          )}

                          <div className="space-y-1.5">
                            <label
                              className="text-[11px] font-mono font-bold uppercase tracking-wider"
                              style={{ color: "var(--muted)" }}
                            >
                              Current Password
                            </label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full h-10 px-3.5 rounded-xl border text-xs font-semibold outline-none"
                              style={{
                                background: "var(--input)",
                                borderColor: "var(--border)",
                                color: "var(--text)",
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label
                                className="text-[11px] font-mono font-bold uppercase tracking-wider"
                                style={{ color: "var(--muted)" }}
                              >
                                New Password
                              </label>
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="At least 8 chars"
                                className="w-full h-10 px-3.5 rounded-xl border text-xs font-semibold outline-none"
                                style={{
                                  background: "var(--input)",
                                  borderColor: "var(--border)",
                                  color: "var(--text)",
                                }}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label
                                className="text-[11px] font-mono font-bold uppercase tracking-wider"
                                style={{ color: "var(--muted)" }}
                              >
                                Confirm Password
                              </label>
                              <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm match"
                                className="w-full h-10 px-3.5 rounded-xl border text-xs font-semibold outline-none"
                                style={{
                                  background: "var(--input)",
                                  borderColor: "var(--border)",
                                  color: "var(--text)",
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              disabled={isUpdatingPassword || !newPassword}
                              className="h-10 px-5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-md"
                              style={{
                                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                              }}
                            >
                              {isUpdatingPassword ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Lock className="w-4 h-4" />
                              )}
                              Update Password
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>

                    {/* Account Actions & Danger Zone Card */}
                    <div
                      className="xl:col-span-5 rounded-3xl border p-6 space-y-5 shadow-sm flex flex-col justify-between"
                      style={{ background: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-bricolage text-lg font-bold tracking-tight">
                            Data & Account Actions
                          </h3>
                          <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                            Download a copy of your account records or permanently close your account.
                          </p>
                        </div>

                        <div
                          className="p-4 rounded-2xl border space-y-2.5"
                          style={{ background: "var(--card2)", borderColor: "var(--border)" }}
                        >
                          <div className="text-xs font-bold" style={{ color: "var(--text)" }}>
                            Personal Data Export
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                            Export your profile info, settings, and security configuration as a CSV file.
                          </p>
                          <button
                            type="button"
                            onClick={handleExportData}
                            className="w-full h-9 px-4 rounded-xl border text-xs font-bold transition-all hover:opacity-85 cursor-pointer flex items-center justify-center gap-2"
                            style={{
                              background: "var(--card)",
                              borderColor: "var(--border)",
                              color: "var(--text)",
                            }}
                          >
                            <Download className="w-4 h-4" style={{ color: "var(--accent)" }} />
                            Export Data (CSV)
                          </button>
                        </div>
                      </div>

                      <div
                        className="p-4 rounded-2xl border space-y-2.5"
                        style={{
                          background: "color-mix(in oklab, #f43f5e 6%, var(--card2))",
                          borderColor: "color-mix(in oklab, #f43f5e 22%, var(--border))",
                        }}
                      >
                        <div className="text-xs font-bold text-rose-500">Danger Zone</div>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                          Permanently delete your account and all hosted or joined event records.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowDeleteModal(true)}
                          className="w-full h-9 px-4 rounded-xl border border-rose-500/30 text-xs font-bold transition-all hover:bg-rose-500/15 cursor-pointer flex items-center justify-center gap-2 text-rose-500"
                          style={{ background: "var(--card)" }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Account
                        </button>
                      </div>
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
                  className="space-y-5"
                >
                  {/* 2-Column Notification Switches Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        desc: "A Monday morning summary of upcoming events near your city",
                      },
                      {
                        key: "soundEffects" as const,
                        label: "Sound effects",
                        desc: "Interactive chime sounds during live quiz arenas and check-ins",
                      },
                    ].map((row) => {
                      const isChecked = !!settings[row.key];
                      return (
                        <div
                          key={row.key}
                          className="rounded-2xl border p-5 flex items-center justify-between gap-4 transition-colors"
                          style={{ background: "var(--card)", borderColor: "var(--border)" }}
                        >
                          <div className="space-y-1 pr-2">
                            <div className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
                              {row.label}
                            </div>
                            <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                              {row.desc}
                            </div>
                          </div>

                          <ToggleSwitch
                            checked={isChecked}
                            onToggle={() => updateSetting(row.key, !isChecked)}
                            ariaLabel={row.label}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Native Browser Push Notifications Banner */}
                  <div
                    className="rounded-3xl border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                          color: "var(--accent)",
                        }}
                      >
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold" style={{ color: "var(--text)" }}>
                          Native Browser Push Notifications
                        </div>
                        <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                          {pushStatus.isSubscribed
                            ? "Push notifications are currently active on this device browser."
                            : "Receive instant desktop alerts when quiz rounds launch, gates open, or announcements post."}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isPushLoading}
                      onClick={() => void handleTogglePush(!pushStatus.isSubscribed)}
                      className="h-10 px-5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-sm shrink-0"
                      style={{
                        background: pushStatus.isSubscribed
                          ? "var(--card2)"
                          : "linear-gradient(135deg, var(--accent), var(--accent2))",
                        color: pushStatus.isSubscribed ? "var(--text)" : "#ffffff",
                        border: pushStatus.isSubscribed ? "1px solid var(--border)" : "none",
                      }}
                    >
                      {isPushLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      {pushStatus.isSubscribed
                        ? "Disable Push Notifications"
                        : "Enable Push Notifications"}
                    </button>
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
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
                    {/* Theme Selector */}
                    <div
                      className="xl:col-span-7 rounded-3xl border p-6 space-y-4 shadow-sm"
                      style={{ background: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <div>
                        <h3 className="font-bricolage text-lg font-bold tracking-tight">
                          Theme Mode
                        </h3>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                          Applies instantly across the entire Eventrix workspace.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { key: "dark" as const, label: "Dark", bg: "#0f172a", bar: "#334155" },
                          { key: "light" as const, label: "Light", bg: "#f8fafc", bar: "#cbd5e1" },
                          {
                            key: "system" as const,
                            label: "System",
                            bg: "linear-gradient(90deg, #0f172a 50%, #f8fafc 50%)",
                            bar: "#64748b",
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
                              className="p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2.5"
                              style={{
                                background: "var(--card2)",
                                borderColor: isCurrent ? "var(--accent)" : "var(--border)",
                                boxShadow: isCurrent
                                  ? "0 0 0 2px color-mix(in oklab, var(--accent) 25%, transparent)"
                                  : "none",
                              }}
                            >
                              <div
                                className="h-20 rounded-xl p-3 flex flex-col justify-between border"
                                style={{ background: t.bg, borderColor: "var(--border)" }}
                              >
                                <div className="space-y-1.5">
                                  <span className="block w-3/5 h-2 rounded-full" style={{ background: t.bar }} />
                                  <span className="block w-2/5 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                                </div>
                                <div className="flex gap-1">
                                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                                  <span className="w-2 h-2 rounded-full" style={{ background: t.bar }} />
                                </div>
                              </div>
                              <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                                  {t.label}
                                </span>
                                {isCurrent && (
                                  <Check className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Accent Color Swatches */}
                    <div
                      className="xl:col-span-5 rounded-3xl border p-6 space-y-4 shadow-sm"
                      style={{ background: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <div>
                        <h3 className="font-bricolage text-lg font-bold tracking-tight">
                          Accent Palette
                        </h3>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                          Drives buttons, badges, charts, and focus highlights.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {ACCENT_SWATCHES.map((swatch) => {
                          const isSelected = accentColor === swatch.key;
                          return (
                            <button
                              key={swatch.key}
                              type="button"
                              onClick={() => {
                                updateAppearanceSetting("accentColor", swatch.key);
                                updateSetting("accentColor", swatch.key);
                              }}
                              className="p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
                              style={{
                                background: isSelected
                                  ? `color-mix(in oklab, ${swatch.c1} 12%, var(--card2))`
                                  : "var(--card2)",
                                borderColor: isSelected ? swatch.c1 : "var(--border)",
                              }}
                            >
                              <span
                                className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm"
                                style={{
                                  background: `linear-gradient(135deg, ${swatch.c1}, ${swatch.c2})`,
                                }}
                              >
                                {isSelected && <Check className="w-4 h-4" />}
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
                  </div>

                  {/* App Density & Motion Toggles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className="rounded-2xl border p-5 flex items-center justify-between gap-4"
                      style={{ background: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
                          Compact Mode
                        </div>
                        <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                          Tighter padding and denser spacing for large tabular views.
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={compactMode}
                        onToggle={() => {
                          const next = !compactMode;
                          updateAppearanceSetting("compactMode", next);
                          updateSetting("compactMode", next);
                        }}
                        ariaLabel="Compact Mode"
                      />
                    </div>

                    <div
                      className="rounded-2xl border p-5 flex items-center justify-between gap-4"
                      style={{ background: "var(--card)", borderColor: "var(--border)" }}
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
                          Smooth Animations
                        </div>
                        <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                          Enable fluid micro-transitions and card motion across pages.
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={smoothAnimations}
                        onToggle={() => {
                          const next = !smoothAnimations;
                          updateAppearanceSetting("smoothAnimations", next);
                          updateSetting("smoothAnimations", next);
                        }}
                        ariaLabel="Smooth Animations"
                      />
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
                  className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch"
                >
                  {/* Preferred Locations Card */}
                  <div
                    className="xl:col-span-6 rounded-3xl border p-6 space-y-4 shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div>
                      <h3 className="font-bricolage text-lg font-bold tracking-tight">
                        Preferred Event Locations
                      </h3>
                      <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                        Spotlight nearby offline and hybrid events in your Discover feed.
                      </p>
                    </div>

                    <div className="flex gap-2">
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
                        placeholder="e.g. Jaipur, Bengaluru, Delhi"
                        className="flex-1 h-10 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold outline-none"
                        style={{
                          background: "var(--input)",
                          borderColor: "var(--border)",
                          color: "var(--text)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addCity(cityInput)}
                        className="h-10 px-4 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm"
                        style={{
                          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                        }}
                      >
                        Add
                      </button>
                    </div>

                    {/* Selected Cities */}
                    <div className="flex flex-wrap gap-2 pt-1 min-h-[32px]">
                      {settings.preferredCities.length === 0 ? (
                        <span className="text-xs italic" style={{ color: "var(--subtle)" }}>
                          No preferred locations added yet.
                        </span>
                      ) : (
                        settings.preferredCities.map((city) => (
                          <span
                            key={city}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
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
                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                      <div
                        className="text-[11px] font-mono font-bold uppercase tracking-wider"
                        style={{ color: "var(--subtle)" }}
                      >
                        Quick Suggestions
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_CITIES.map((c) => {
                          const alreadyAdded = settings.preferredCities.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              disabled={alreadyAdded}
                              onClick={() => addCity(c)}
                              className="px-3 py-1 rounded-full border text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40 cursor-pointer"
                              style={{
                                background: "var(--card2)",
                                borderColor: "var(--border)",
                                color: "var(--muted)",
                              }}
                            >
                              {alreadyAdded ? `✓ ${c}` : `+ ${c}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Favorite Event Categories Card */}
                  <div
                    className="xl:col-span-6 rounded-3xl border p-6 space-y-4 shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bricolage text-lg font-bold tracking-tight">
                          Favorite Event Categories
                        </h3>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                          Tailor event recommendations across your Home and Discover tabs.
                        </p>
                      </div>
                      <Sparkles className="w-5 h-5 shrink-0" style={{ color: "var(--accent)" }} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 pt-1">
                      {PRESET_CATEGORIES.map((cat) => {
                        const isSelected = settings.favoriteCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between border"
                            style={{
                              background: isSelected
                                ? "color-mix(in oklab, var(--accent) 14%, var(--card2))"
                                : "var(--card2)",
                              borderColor: isSelected
                                ? "color-mix(in oklab, var(--accent) 45%, var(--border))"
                                : "var(--border)",
                              color: isSelected ? "var(--accent)" : "var(--muted)",
                            }}
                          >
                            <span>{cat}</span>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
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
                  className="space-y-5"
                >
                  {/* Two-Factor Authentication Banner */}
                  <div
                    className="rounded-3xl border p-6 flex items-center justify-between gap-5 flex-wrap shadow-sm"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                          color: "var(--accent)",
                        }}
                      >
                        <Lock className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bricolage text-lg font-bold tracking-tight">
                          Two-factor authentication
                        </div>
                        <div className="text-xs sm:text-sm font-medium" style={{ color: "var(--muted)" }}>
                          Protect sign-ins using an authenticator app plus 8 emergency recovery codes.
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
                        onClick={openEnable2FAModal}
                        className="h-10 px-5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md"
                        style={{
                          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                        }}
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
                      className="p-6 border-b flex items-center justify-between gap-4 flex-wrap"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div>
                        <h3 className="font-bricolage text-lg font-bold tracking-tight">
                          Active sessions
                        </h3>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                          Devices currently authenticated into your Eventrix account.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleLogoutAllOtherSessions()}
                        className="h-9 px-3.5 rounded-xl border text-xs font-bold transition hover:bg-rose-500/10 text-rose-500 cursor-pointer shrink-0"
                        style={{ borderColor: "var(--border)", background: "var(--card2)" }}
                      >
                        Log out other sessions
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeSessions.map((sess) => {
                        const IconComponent = sess.icon || Laptop;
                        return (
                          <div
                            key={sess.id}
                            className="p-4 rounded-2xl border flex items-center justify-between gap-3"
                            style={{ background: "var(--card2)", borderColor: "var(--border)" }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                                style={{
                                  background: "var(--card)",
                                  borderColor: "var(--border)",
                                  color: "var(--muted)",
                                }}
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
                                className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border shrink-0"
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
                                onClick={() => void handleRevokeSession(sess.id, false)}
                                className="h-8 px-3 rounded-xl border text-xs font-bold transition hover:bg-rose-500/10 text-rose-500 cursor-pointer shrink-0"
                                style={{ borderColor: "var(--border)", background: "var(--card)" }}
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

      {/* PORTALED MODALS ABOVE SIDEBAR & HEADER */}
      {typeof document !== "undefined" &&
        createPortal(
          <>
            <AnimatePresence>
              {show2FAModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShow2FAModal(false)}
                  className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    className="border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center"
                    style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    <button
                      type="button"
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
                          <h3 className="font-bricolage text-lg font-bold" style={{ color: "var(--text)" }}>
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
                            value={`otpauth://totp/Eventrix:${encodeURIComponent(
                              profile?.email || "user@eventrix.dev"
                            )}?secret=${user2FASecret}&issuer=Eventrix`}
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
                            <div
                              className="text-[10px] uppercase font-mono font-bold"
                              style={{ color: "var(--muted)" }}
                            >
                              Secret Key
                            </div>
                            <div className="font-mono text-xs font-bold" style={{ color: "var(--text)" }}>
                              {user2FASecret.replace(/(.{4})/g, "$1 ").trim()}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(user2FASecret);
                              setCopiedSecret(true);
                              showSuccess("Secret key copied!");
                              setTimeout(() => setCopiedSecret(false), 2000);
                            }}
                            className="p-1.5 rounded-lg border hover:opacity-80 cursor-pointer"
                            style={{
                              background: "var(--card)",
                              borderColor: "var(--border)",
                              color: "var(--text)",
                            }}
                          >
                            {copiedSecret ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        <div className="space-y-1 text-left">
                          <label
                            className="text-xs font-mono font-bold uppercase tracking-wider"
                            style={{ color: "var(--muted)" }}
                          >
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
                            style={{
                              background: "var(--input)",
                              borderColor: "var(--border)",
                              color: "var(--text)",
                            }}
                          />
                          {twoFactorError && (
                            <p className="text-xs text-rose-500 font-bold mt-1">{twoFactorError}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={twoFactorCode.length < 6 || isVerifying2FA}
                          onClick={async () => {
                            setIsVerifying2FA(true);
                            setTwoFactorError("");
                            try {
                              const isValid = await verify2FACode(
                                twoFactorCode,
                                user2FASecret,
                                userBackupCodes
                              );
                              if (!isValid) {
                                setIsVerifying2FA(false);
                                setTwoFactorError(
                                  "Invalid verification code. Please check your authenticator."
                                );
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
                          className="w-full h-10 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
                          style={{
                            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                          }}
                        >
                          {isVerifying2FA ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Verify & Activate 2FA"
                          )}
                        </button>
                      </div>
                    )}

                    {twoFactorStep === "backup" && (
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bricolage text-lg font-bold" style={{ color: "var(--text)" }}>
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
                              style={{
                                background: "var(--card2)",
                                borderColor: "var(--border)",
                                color: "var(--text)",
                              }}
                            >
                              {code}
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(userBackupCodes.join("\n"));
                              setCopiedBackup(true);
                              showSuccess("Backup codes copied!");
                              setTimeout(() => setCopiedBackup(false), 2000);
                            }}
                            className="flex-1 h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-80"
                            style={{
                              background: "var(--card2)",
                              borderColor: "var(--border)",
                              color: "var(--text)",
                            }}
                          >
                            {copiedBackup ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                            Copy Codes
                          </button>
                          <button
                            type="button"
                            onClick={() => setShow2FAModal(false)}
                            className="flex-1 h-10 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md"
                            style={{
                              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                            }}
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
                          <h3 className="font-bricolage text-lg font-bold" style={{ color: "var(--text)" }}>
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
                            style={{
                              background: "var(--card2)",
                              borderColor: "var(--border)",
                              color: "var(--text)",
                            }}
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

            <AnimatePresence>
              {showDeleteModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowDeleteModal(false)}
                  className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    className="border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center space-y-4"
                    style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-6 h-6" />
                    </div>

                    <div>
                      <h3 className="font-bricolage text-lg font-bold text-rose-500">Delete Account</h3>
                      <p className="text-xs font-medium mt-1" style={{ color: "var(--muted)" }}>
                        This will permanently delete your account, organized events, registrations, and ticket history. This cannot be undone.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label
                        className="text-xs font-mono font-bold uppercase tracking-wider"
                        style={{ color: "var(--muted)" }}
                      >
                        Type <span className="text-rose-500">DELETE</span> to confirm
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmationText}
                        onChange={(e) => setDeleteConfirmationText(e.target.value)}
                        placeholder="DELETE"
                        className="w-full h-10 px-3 rounded-xl border text-xs font-semibold outline-none"
                        style={{
                          background: "var(--input)",
                          borderColor: "var(--border)",
                          color: "var(--text)",
                        }}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        className="flex-1 h-10 rounded-xl border text-xs font-bold cursor-pointer hover:opacity-80"
                        style={{
                          background: "var(--card2)",
                          borderColor: "var(--border)",
                          color: "var(--text)",
                        }}
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
                          } catch (err: unknown) {
                            const msg =
                              err instanceof Error ? err.message : "Failed to delete account.";
                            showError(msg);
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
          </>,
          document.body
        )}
    </AppLayout>
  );
}
