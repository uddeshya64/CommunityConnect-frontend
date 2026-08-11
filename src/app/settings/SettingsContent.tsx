"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { verify2FACode, generateUniqueSecretKey, generateUniqueBackupCodes } from "@/lib/totp";
import { EVENT_TEMPLATES } from "@/lib/eventTemplates";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Shield,
  Sliders,
  Lock,
  Check,
  ChevronRight,
  ArrowLeft,
  Monitor,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Smartphone,
  Laptop,
  Globe,
  RefreshCw,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Circle,
  Key,
  Download,
  Trash2,
  ShieldCheck,
  Activity,
  Search,
  X,
  Loader2,
  Pencil,
  CheckSquare,
  Square,
  MapPin,
  Copy,
  LogOut,
  QrCode,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileService } from "@/services/profile.service";
import { Profile } from "@/types/profile.types";
import { useAppearance, ACCENT_COLORS_CONFIG as ACCENT_COLORS } from "@/components/providers/AppearanceProvider";
import { useToast } from "@/components/providers/ToastProvider";

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
  allowDirectMessages: "everyone" | "attendees" | "nobody";

  // Event Preferences
  defaultCity: string;
  favoriteCategories: string[];
  calendarFormat: "google" | "ical" | "outlook";

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
  allowDirectMessages: "attendees",
  defaultCity: "San Francisco, CA",
  favoriteCategories: ["Technical Conferences", "Hackathons and Competitions"],
  calendarFormat: "google",
  twoFactorEnabled: false,
};

const CATEGORIES_LIST = [
  ...EVENT_TEMPLATES.map((t) => t.label),
  "Other",
];



type TabKey = "account" | "notifications" | "appearance" | "privacy" | "preferences" | "security";

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TABS: TabItem[] = [
  { key: "account", label: "Account & Profile", icon: User, description: "Manage profile snapshot, email, and account actions" },
  { key: "notifications", label: "Notifications", icon: Bell, description: "Configure alerts, digests, and audio feedback" },
  { key: "appearance", label: "Appearance", icon: Palette, description: "Customize themes, accent colors, and UI density" },
  { key: "privacy", label: "Privacy & Visibility", icon: Shield, description: "Control who sees your profile and information" },
  { key: "preferences", label: "Event Preferences", icon: Sliders, description: "Set location defaults and favorite categories" },
  { key: "security", label: "Sessions & Security", icon: Lock, description: "Manage 2FA, passwords, and active devices" },
];

// Standalone Toggle Switch Component outside of render cycle to prevent re-creation glitches
const ToggleSwitch = ({
  checked,
  onChange,
  id,
  disabled = false,
  activeBg = "bg-indigo-600",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
  disabled?: boolean;
  activeBg?: string;
}) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 ${
      checked ? activeBg : "bg-zinc-800"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <motion.span
      initial={false}
      animate={{ x: checked ? 20 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0"
    />
  </button>
);

export default function SettingsContent() {
  const { isDark, activeAccent } = useAppearance();
  const { success: showSuccess, info: showInfo, error: showError } = useToast();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [activeTab, setActiveTab] = useState<TabKey>("account");
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Delete Account State
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const router = useRouter();

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

  // Active Browser Sessions State
  const [activeSessions, setActiveSessions] = useState([
    {
      id: "sess-1",
      device: "Windows",
      browser: "Chrome",
      location: "Current Device",
      ip: "192.168.1.100",
      lastActive: "Active now",
      isCurrent: true,
      icon: Laptop,
    },
    {
      id: "sess-2",
      device: "iOS",
      browser: "Safari",
      location: "San Francisco, CA",
      ip: "172.16.0.45",
      lastActive: "Last active 2 days ago",
      isCurrent: false,
      icon: Smartphone,
    },
    {
      id: "sess-3",
      device: "macOS",
      browser: "Firefox",
      location: "New York, NY",
      ip: "10.0.0.12",
      lastActive: "Last active 5 days ago",
      isCurrent: false,
      icon: Laptop,
    },
  ]);

  // Load Settings from localStorage & Fetch Profile/Settings from backend API
  useEffect(() => {
    // 1. Load localStorage settings instantly for zero flicker
    const stored = localStorage.getItem("cc_user_settings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        // Fallback to default settings if JSON parsing fails
      }
    }

    // 2. Fetch User Profile and Settings from Backend API
    const fetchUserData = async () => {
      try {
        const [profileData, backendSettings] = await Promise.all([
          profileService.getMyProfile().catch(() => null),
          profileService.getMySettings().catch(() => null),
        ]);
        if (profileData) setProfile(profileData);
        if (backendSettings && typeof backendSettings === "object" && Object.keys(backendSettings).length > 0) {
          const merged = { ...DEFAULT_SETTINGS, ...backendSettings };
          setSettings(merged);
          // localStorage.setItem("cc_user_settings", JSON.stringify(merged));
          // localStorage.setItem("cc_2fa_enabled", merged.twoFactorEnabled ? "true" : "false");
          if (merged.twoFactorSecret) {
            setUser2FASecret(merged.twoFactorSecret);
            // localStorage.setItem("cc_2fa_secret", merged.twoFactorSecret);
          }
          if (merged.twoFactorBackupCodes && Array.isArray(merged.twoFactorBackupCodes)) {
            setUserBackupCodes(merged.twoFactorBackupCodes);
            // localStorage.setItem("cc_2fa_backup_codes", JSON.stringify(merged.twoFactorBackupCodes));
          }
        }
      } finally {
        setIsProfileLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Web Audio UI feedback beep
  const playToggleSound = () => {
    if (!settings.soundEffects) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio context might be blocked or unsupported
    }
  };

  // Helper to update setting field & persist
  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSaveStatus("saving");
    if (key === "soundEffects" && value === true) {
      playToggleSound();
    } else if (settings.soundEffects) {
      playToggleSound();
    }

    const updated = { ...settings, [key]: value };
    setSettings(updated);

    // localStorage.setItem("cc_user_settings", JSON.stringify(updated));
    if (key === "twoFactorEnabled") {
      // localStorage.setItem("cc_2fa_enabled", value ? "true" : "false");
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cc_settings_updated", { detail: updated })
      );
    }
    profileService.updateMySettings({ [key]: value }).catch(() => {
      // Silently ignore if guest or offline
    });

    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }, 400);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    showSuccess(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    // localStorage.setItem("cc_user_settings", JSON.stringify(DEFAULT_SETTINGS));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cc_settings_updated", { detail: DEFAULT_SETTINGS })
      );
    }
    profileService.updateMySettings(DEFAULT_SETTINGS).catch(() => {});
    showToast("Settings reset to default values.");
  };

  const handleExportData = () => {
    const exportData = {
      profile: profile || {
        name: "CommunityConnect User",
        email: "user@communityconnect.io",
      },
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `communityconnect-settings-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Account data exported successfully!");
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
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully!");
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

  // Password strength meter helper
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "None", color: "bg-zinc-700" };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 3, label: "Good", color: "bg-indigo-500" };
    if (score >= 4) return { score: 4, label: "Strong", color: "bg-emerald-500" };
    return { score: 0, label: "None", color: "bg-zinc-700" };
  };

  // Filter tabs if search query is entered
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return TABS;
    const q = searchQuery.toLowerCase();
    return TABS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (q.includes("pass") && t.key === "account") ||
        (q.includes("theme") && t.key === "appearance") ||
        (q.includes("email") && t.key === "account") ||
        (q.includes("sound") && t.key === "notifications") ||
        (q.includes("2fa") && t.key === "security") ||
        (q.includes("city") && t.key === "preferences")
    );
  }, [searchQuery]);



  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 relative z-10 flex items-center justify-center min-h-[50vh]">
          <div className="w-10 h-10 border-4 border-zinc-800 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"} font-sans selection:bg-indigo-500/30 pb-24 relative overflow-hidden transition-colors duration-300`}>
      {/* Dynamic Ambient Background Glow */}
      <div className={`fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${isDark ? "from-indigo-900/20 via-zinc-950 to-zinc-950" : "from-indigo-200/40 via-zinc-50 to-zinc-50"} pointer-events-none`} />
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Sticky Nav Bar */}
      <nav className={`sticky top-0 z-50 w-full backdrop-blur-xl ${isDark ? "bg-zinc-950/70 border-white/5" : "bg-white/80 border-zinc-200"} border-b shadow-md transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/home"
              className="group flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <span className="hidden sm:inline">Back</span>
            </Link>

            <div className="h-6 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-br ${activeAccent.gradient} flex items-center justify-center text-white shadow-lg ${activeAccent.shadow}`}
              >
                <SettingsIcon className="w-4 h-4" />
              </div>
              <h1 className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-900"} tracking-tight`}>
                Settings
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Status Badge */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full ${isDark ? "bg-white/5 border border-white/10 text-zinc-300" : "bg-zinc-100 border border-zinc-200 text-zinc-600"} text-xs font-semibold`}>
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className={`w-3.5 h-3.5 animate-spin ${activeAccent.text}`} />
                  <span>Saving...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Saved</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto-saved</span>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className={`rounded-full ${isDark ? "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white" : "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900"} font-medium text-xs px-3.5`}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reset Defaults
            </Button>

            <Link href="/profile/edit">
              <Button
                size="sm"
                className={`rounded-full bg-gradient-to-r ${activeAccent.gradient} hover:opacity-95 text-white font-semibold text-xs px-4 shadow-lg ${activeAccent.shadow} transition-all hover:scale-105`}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 border border-white/10 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-zinc-400 hover:text-white ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Settings Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 relative z-10">
        {/* Search Bar & Page Overview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Account Settings
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Customize your notifications, security, themes, and community preferences.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              id="settings-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="pl-10 pr-9 bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-500 rounded-full h-11 text-sm focus:ring-2 focus:ring-white/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Layout Grid: Sidebar Tabs + Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar / Mobile Tabs */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 space-y-1">
              {/* Mobile Horizontal Scrollable Tabs */}
              <div className="flex lg:hidden overflow-x-auto pb-2 gap-2 no-scrollbar">
                {filteredTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-semibold shrink-0 transition-all ${
                        isActive
                          ? `bg-gradient-to-r ${activeAccent.gradient || "from-indigo-600 to-violet-600"} text-white shadow-lg ${activeAccent.shadow || "shadow-indigo-500/20"}`
                          : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Desktop Sidebar Rail */}
              <div className="hidden lg:flex flex-col gap-1.5 bg-zinc-900/40 border border-white/5 p-2 rounded-3xl backdrop-blur-xl">
                {filteredTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`group relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left transition-all ${
                        isActive
                          ? "text-white font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-white/5 font-medium"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-setting-tab"
                          className={`absolute inset-0 rounded-2xl bg-white/10 ${activeAccent.border}`}
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                      <div
                        className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                          isActive
                            ? `${activeAccent.bg} text-white shadow-md ${activeAccent.shadow || "shadow-indigo-500/20"}`
                            : `${isDark ? "bg-zinc-800/80 text-zinc-400 group-hover:bg-zinc-800 group-hover:text-white" : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-900"}`
                        }`}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="relative z-10 flex-1">
                        <div className={`text-sm leading-none ${isActive ? `${activeAccent.text} font-bold` : isDark ? "text-white" : "text-zinc-900"}`}>{tab.label}</div>
                        <div className={`text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-400"} mt-1 line-clamp-1`}>
                          {tab.description}
                        </div>
                      </div>
                      <ChevronRight
                        className={`relative z-10 w-4 h-4 transition-transform ${
                          isActive
                            ? `${activeAccent.text} translate-x-0.5`
                            : "text-zinc-600 group-hover:text-zinc-400"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Quick Profile Summary Badge in Sidebar */}
              <div className="hidden lg:block mt-4 p-4 rounded-3xl bg-zinc-100/60 border border-zinc-200 backdrop-blur-xl">
                {isProfileLoading ? (
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-zinc-200 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-zinc-200 rounded w-2/3" />
                      <div className="h-3 bg-zinc-200 rounded w-full" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${activeAccent.gradient} flex items-center justify-center text-white font-extrabold text-sm shrink-0`}>
                      {profile?.name
                        ? profile.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "CC"}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-bold text-white truncate">
                        {profile?.name || "Community Connect Member"}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {profile?.email || "user@communityconnect.io"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Settings Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {isProfileLoading ? (
              <div className="space-y-6">
                {/* Skeleton Card 1 */}
                <div className={`rounded-3xl p-6 sm:p-8 space-y-6 animate-pulse ${isDark ? "bg-zinc-900/40 border border-white/5" : "bg-white border border-zinc-200 shadow-sm"}`}>
                  <div className="space-y-2">
                    <div className="h-6 bg-zinc-200 rounded-md w-1/4 animate-pulse" />
                    <div className="h-4 bg-zinc-200/50 rounded-md w-1/2 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-zinc-200 rounded w-1/3 animate-pulse" />
                        <div className="h-11 bg-zinc-200 rounded-2xl w-full animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skeleton Card 2 */}
                <div className={`rounded-3xl p-6 sm:p-8 space-y-6 animate-pulse ${isDark ? "bg-zinc-900/40 border border-white/5" : "bg-white border border-zinc-200 shadow-sm"}`}>
                  <div className="space-y-2">
                    <div className="h-6 bg-zinc-200 rounded-md w-1/4 animate-pulse" />
                    <div className="h-4 bg-zinc-200/50 rounded-md w-1/2 animate-pulse" />
                  </div>
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex justify-between items-center py-3 border-b border-zinc-200/10">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-zinc-200 rounded w-1/4 animate-pulse" />
                          <div className="h-3 bg-zinc-200/50 rounded w-1/2 animate-pulse" />
                        </div>
                        <div className="w-10 h-6 bg-zinc-200 rounded-full animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
              {/* TAB 1: ACCOUNT & PROFILE */}
              {activeTab === "account" && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Card 1: Profile Snapshot Card */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          {profile?.avatar_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={profile.avatar_url}
                              alt={profile.name}
                              className={`w-16 h-16 rounded-2xl object-cover ring-2 ${activeAccent.border}`}
                            />
                          ) : (
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activeAccent.gradient} flex items-center justify-center text-white font-black text-xl shadow-lg ${activeAccent.shadow}`}>
                              {profile?.name
                                ? profile.name
                                    .split(" ")
                                    .map((w) => w[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)
                                : "CC"}
                            </div>
                          )}
                          <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-zinc-900 flex items-center justify-center"
                            title="Online & Active"
                          >
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white">
                              {profile?.name || "Community Connect Member"}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full ${activeAccent.badgeBg} border border-white/10 ${activeAccent.badgeText} text-xs font-semibold`}>
                              Pro Member
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 mt-1">
                            {profile?.profession || "Community Member & Event Enthusiast"}
                          </p>
                          {profile?.location && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-2">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{profile.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link href="/profile/edit">
                          <Button className="rounded-2xl bg-white text-zinc-900 hover:bg-zinc-100 font-semibold px-5 shadow-lg shadow-black/20">
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Email & Verification */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Email Address</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Your verified email address is used for event notifications, sign-ins, and account recovery.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                      <div className="flex-1 relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <Input
                          id="settings-email-input"
                          readOnly
                          value={profile?.email || "user@communityconnect.io"}
                          className="pl-10 bg-zinc-950/60 border-white/10 text-white rounded-2xl h-11 font-medium text-sm cursor-default"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verified Email</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Password & Security */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">Password & Authentication</h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          Protect your account by using a strong, unique password.
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setShowPasswordModal(true)}
                        className="rounded-2xl border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white font-semibold"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                    </div>

                    <div className="border-t border-white/5 pt-4 flex items-center justify-between text-xs text-zinc-400">
                      <span>Last changed: 30 days ago</span>
                      <span className="text-emerald-400 font-semibold">Security Level: High</span>
                    </div>
                  </div>

                  {/* Card 4: Danger Zone */}
                  <div className="bg-rose-950/10 border border-rose-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Danger Zone
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Export your account data or permanently delete your account and all associated events.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        variant="outline"
                        onClick={handleExportData}
                        className="rounded-2xl border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white font-semibold flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Account Data
                      </Button>

                      <Button
                        onClick={() => setShowDeleteModal(true)}
                        className="rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Event & Community Notifications</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Control when and how you receive updates from community organizers and attendees.
                      </p>
                    </div>

                    <div className="space-y-5 divide-y divide-white/5">
                      {/* Event Reminders Toggle */}
                      <div className="pt-5 first:pt-0 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="toggle-emailReminders" className="text-sm font-bold text-white cursor-pointer">
                            Event Reminders
                          </Label>
                          <p className="text-xs text-zinc-400">
                            Receive reminders 24 hours before events you are attending start.
                          </p>
                        </div>
                        <ToggleSwitch
                          id="toggle-emailReminders"
                          checked={settings.emailReminders}
                          onChange={(val) => updateSetting("emailReminders", val)}
                          activeBg={activeAccent.bg}
                        />
                      </div>

                      {/* Community Updates Toggle */}
                      <div className="pt-5 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="toggle-communityUpdates" className="text-sm font-bold text-white cursor-pointer">
                            Community & Organizer Updates
                          </Label>
                          <p className="text-xs text-zinc-400">
                            Get alerted immediately when an organizer modifies an event date, time, or location.
                          </p>
                        </div>
                        <ToggleSwitch
                          id="toggle-communityUpdates"
                          checked={settings.communityUpdates}
                          onChange={(val) => updateSetting("communityUpdates", val)}
                          activeBg={activeAccent.bg}
                        />
                      </div>

                      {/* Team Invites Toggle */}
                      <div className="pt-5 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="toggle-teamInvites" className="text-sm font-bold text-white cursor-pointer">
                            Team & Staff Join Requests
                          </Label>
                          <p className="text-xs text-zinc-400">
                            Receive alerts when someone invites you to join their event staff or team.
                          </p>
                        </div>
                        <ToggleSwitch
                          id="toggle-teamInvites"
                          checked={settings.teamInvites}
                          onChange={(val) => updateSetting("teamInvites", val)}
                          activeBg={activeAccent.bg}
                        />
                      </div>

                      {/* Weekly Digest Toggle */}
                      <div className="pt-5 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="toggle-weeklyDigest" className="text-sm font-bold text-white cursor-pointer">
                            Weekly Community Digest
                          </Label>
                          <p className="text-xs text-zinc-400">
                            A curated newsletter of top trending events and networking opportunities near you.
                          </p>
                        </div>
                        <ToggleSwitch
                          id="toggle-weeklyDigest"
                          checked={settings.weeklyDigest}
                          onChange={(val) => updateSetting("weeklyDigest", val)}
                          activeBg={activeAccent.bg}
                        />
                      </div>
                    </div>
                  </div>

                  {/* UI Feedback & Audio Card */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Interface Audio & Micro-feedback</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Enhance your user experience with subtle audio cues and tactile animations.
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${activeAccent.badgeBg} ${activeAccent.badgeText} flex items-center justify-center shrink-0`}>
                          {settings.soundEffects ? (
                            <Volume2 className="w-5 h-5" />
                          ) : (
                            <VolumeX className="w-5 h-5 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <Label htmlFor="toggle-soundEffects" className="text-sm font-bold text-white cursor-pointer">
                            UI Sound Effects
                          </Label>
                          <p className="text-xs text-zinc-400">
                            Play subtle audio feedback when saving changes and clicking toggles.
                          </p>
                        </div>
                      </div>
                      <ToggleSwitch
                        id="toggle-soundEffects"
                        checked={settings.soundEffects}
                        onChange={(val) => updateSetting("soundEffects", val)}
                        activeBg={activeAccent.bg}
                      />
                    </div>

                    <div className="border-t border-white/5 pt-5">
                      <Label htmlFor="select-notificationFrequency" className="text-sm font-bold text-white block mb-2">
                        Email Digest Frequency
                      </Label>
                      <select
                        id="select-notificationFrequency"
                        value={settings.notificationFrequency}
                        onChange={(e) =>
                          updateSetting(
                            "notificationFrequency",
                            e.target.value as UserSettings["notificationFrequency"]
                          )
                        }
                        className="w-full max-w-xs bg-zinc-950 border border-white/10 text-white rounded-2xl h-11 px-4 text-sm focus:ring-2 focus:ring-white/20"
                      >
                        <option value="realtime">Real-time (Immediate notifications)</option>
                        <option value="daily">Daily summary</option>
                        <option value="weekly">Weekly digest</option>
                        <option value="muted">Muted (Do not send emails)</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: APPEARANCE & THEME */}
              {activeTab === "appearance" && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Theme Mode Selector */}
                  <div className={`rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6 border transition-colors ${isDark ? "bg-zinc-900/40 border-white/5" : "bg-white border-zinc-200 shadow-sm"}`}>
                    <div>
                      <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Color Mode</h3>
                      <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-1`}>
                        Select your preferred interface theme for CommunityConnect.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Dark Mode */}
                      <button
                        type="button"
                        onClick={() => updateSetting("theme", "dark")}
                        className={`group relative flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all ${
                          settings.theme === "dark"
                            ? `${activeAccent.border} ${isDark ? "bg-zinc-900/80" : "bg-zinc-50"} shadow-lg ${activeAccent.shadow}`
                            : `${isDark ? "border-white/5 bg-zinc-950/40 hover:border-white/20" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"}`
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Moon className="w-6 h-6" />
                        </div>
                        <span className={`text-sm font-bold ${settings.theme === "dark" ? activeAccent.text : isDark ? "text-white" : "text-zinc-900"}`}>Dark Mode</span>
                        <span className="text-xs text-zinc-500 mt-0.5">Sleek Obsidian</span>
                        {settings.theme === "dark" && (
                          <div className={`absolute top-3 right-3 ${activeAccent.text}`}>
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        )}
                      </button>

                      {/* Light Mode */}
                      <button
                        type="button"
                        onClick={() => updateSetting("theme", "light")}
                        className={`group relative flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all ${
                          settings.theme === "light"
                            ? `${activeAccent.border} ${isDark ? "bg-zinc-900/80" : "bg-zinc-50"} shadow-lg ${activeAccent.shadow}`
                            : `${isDark ? "border-white/5 bg-zinc-950/40 hover:border-white/20" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"}`
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Sun className="w-6 h-6" />
                        </div>
                        <span className={`text-sm font-bold ${settings.theme === "light" ? activeAccent.text : isDark ? "text-white" : "text-zinc-900"}`}>Light Mode</span>
                        <span className="text-xs text-zinc-500 mt-0.5">Clean Crisp</span>
                        {settings.theme === "light" && (
                          <div className={`absolute top-3 right-3 ${activeAccent.text}`}>
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        )}
                      </button>

                      {/* System Theme */}
                      <button
                        type="button"
                        onClick={() => updateSetting("theme", "system")}
                        className={`group relative flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all ${
                          settings.theme === "system"
                            ? `${activeAccent.border} ${isDark ? "bg-zinc-900/80" : "bg-zinc-50"} shadow-lg ${activeAccent.shadow}`
                            : `${isDark ? "border-white/5 bg-zinc-950/40 hover:border-white/20" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"}`
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Monitor className="w-6 h-6" />
                        </div>
                        <span className={`text-sm font-bold ${settings.theme === "system" ? activeAccent.text : isDark ? "text-white" : "text-zinc-900"}`}>System</span>
                        <span className="text-xs text-zinc-500 mt-0.5">Auto-sync OS</span>
                        {settings.theme === "system" && (
                          <div className={`absolute top-3 right-3 ${activeAccent.text}`}>
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Accent Color Picker */}
                  <div className={`rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6 border transition-colors ${isDark ? "bg-zinc-900/40 border-white/5" : "bg-white border-zinc-200 shadow-sm"}`}>
                    <div>
                      <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Accent Color Palette</h3>
                      <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-1`}>
                        Choose an accent color to personalize highlights and buttons across your experience.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      {ACCENT_COLORS.map((color) => {
                        const isSelected = settings.accentColor === color.id;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() =>
                              updateSetting(
                                "accentColor",
                                color.id as UserSettings["accentColor"]
                              )
                            }
                            className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                              isSelected
                                ? `${color.border} ${isDark ? "bg-white/5" : "bg-zinc-100"} shadow-lg`
                                : `${isDark ? "border-white/5 bg-zinc-950/40 hover:border-white/20" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"}`
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full ${color.bg} mb-2 shadow-md`} />
                            <span className={`text-xs font-bold ${isSelected ? color.text : isDark ? "text-white" : "text-zinc-900"}`}>{color.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interface Density & Animations */}
                  <div className={`rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6 border transition-colors ${isDark ? "bg-zinc-900/40 border-white/5" : "bg-white border-zinc-200 shadow-sm"}`}>
                    <div>
                      <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Interface Dynamics</h3>
                      <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-1`}>
                        Adjust layout density and subtle animations for optimal performance.
                      </p>
                    </div>

                    <div className={`space-y-5 divide-y ${isDark ? "divide-white/5" : "divide-zinc-200"}`}>
                      <div className="pt-5 first:pt-0 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="toggle-compactMode" className={`text-sm font-bold cursor-pointer ${settings.compactMode ? activeAccent.text : isDark ? "text-white" : "text-zinc-900"}`}>
                            Compact Grid Mode
                          </Label>
                          <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            Reduce card padding and spacing to show more events per view.
                          </p>
                        </div>
                        <ToggleSwitch
                          id="toggle-compactMode"
                          checked={settings.compactMode}
                          onChange={(val) => updateSetting("compactMode", val)}
                          activeBg={activeAccent.bg}
                        />
                      </div>

                      <div className="pt-5 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="toggle-smoothAnimations" className={`text-sm font-bold cursor-pointer ${settings.smoothAnimations ? activeAccent.text : isDark ? "text-white" : "text-zinc-900"}`}>
                            Smooth Micro-Animations
                          </Label>
                          <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            Enable fluid hover transitions and framer-motion layout animations.
                          </p>
                        </div>
                        <ToggleSwitch
                          id="toggle-smoothAnimations"
                          checked={settings.smoothAnimations}
                          onChange={(val) => updateSetting("smoothAnimations", val)}
                          activeBg={activeAccent.bg}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: PRIVACY & VISIBILITY */}
              {activeTab === "privacy" && (
                <motion.div
                  key="privacy"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Profile Visibility</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Control who can view your full profile and professional skills.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Public */}
                      <button
                        type="button"
                        onClick={() => updateSetting("profileVisibility", "public")}
                        className={`p-5 rounded-3xl border-2 text-left transition-all relative ${
                          settings.profileVisibility === "public"
                            ? `${activeAccent.border} bg-zinc-900/80 shadow-lg ${activeAccent.shadow}`
                            : "border-white/5 bg-zinc-950/40 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Globe className={`w-6 h-6 ${activeAccent.text}`} />
                          {settings.profileVisibility === "public" ? (
                            <CheckCircle2 className={`w-5 h-5 ${activeAccent.text}`} />
                          ) : (
                            <Circle className="w-5 h-5 text-zinc-600" />
                          )}
                        </div>
                        <div className="text-sm font-bold text-white">Public</div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Anyone on the web can discover your profile card.
                        </p>
                      </button>

                      {/* Community */}
                      <button
                        type="button"
                        onClick={() => updateSetting("profileVisibility", "community")}
                        className={`p-5 rounded-3xl border-2 text-left transition-all relative ${
                          settings.profileVisibility === "community"
                            ? `${activeAccent.border} bg-zinc-900/80 shadow-lg ${activeAccent.shadow}`
                            : "border-white/5 bg-zinc-950/40 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <User className="w-6 h-6 text-violet-400" />
                          {settings.profileVisibility === "community" ? (
                            <CheckCircle2 className={`w-5 h-5 ${activeAccent.text}`} />
                          ) : (
                            <Circle className="w-5 h-5 text-zinc-600" />
                          )}
                        </div>
                        <div className="text-sm font-bold text-white">Community Only</div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Visible only to logged-in CommunityConnect members.
                        </p>
                      </button>

                      {/* Private */}
                      <button
                        type="button"
                        onClick={() => updateSetting("profileVisibility", "private")}
                        className={`p-5 rounded-3xl border-2 text-left transition-all relative ${
                          settings.profileVisibility === "private"
                            ? `${activeAccent.border} bg-zinc-900/80 shadow-lg ${activeAccent.shadow}`
                            : "border-white/5 bg-zinc-950/40 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Lock className="w-6 h-6 text-emerald-400" />
                          {settings.profileVisibility === "private" ? (
                            <CheckCircle2 className={`w-5 h-5 ${activeAccent.text}`} />
                          ) : (
                            <Circle className="w-5 h-5 text-zinc-600" />
                          )}
                        </div>
                        <div className="text-sm font-bold text-white">Private</div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Only event organizers of your events can view details.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Profile Field Permissions */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Contact & Location Privacy</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Choose whether your personal email or location is displayed to attendees.
                      </p>
                    </div>

                    <div className="space-y-5 divide-y divide-white/5">
                      <div className="pt-5 first:pt-0 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="toggle-showEmailOnProfile" className="text-sm font-bold text-white cursor-pointer">
                            Show Email Address on Profile
                          </Label>
                          <p className="text-xs text-zinc-400">
                            Allow event organizers and attendees to contact you via email directly.
                          </p>
                        </div>
                        <ToggleSwitch
                          id="toggle-showEmailOnProfile"
                          checked={settings.showEmailOnProfile}
                          onChange={(val) => updateSetting("showEmailOnProfile", val)}
                          activeBg={activeAccent.bg}
                        />
                      </div>

                      <div className="pt-5 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="toggle-showLocationOnProfile" className="text-sm font-bold text-white cursor-pointer">
                            Show City / Location on Profile
                          </Label>
                          <p className="text-xs text-zinc-400">
                            Display your city so local community organizers can discover your skills.
                          </p>
                        </div>
                        <ToggleSwitch
                          id="toggle-showLocationOnProfile"
                          checked={settings.showLocationOnProfile}
                          onChange={(val) => updateSetting("showLocationOnProfile", val)}
                          activeBg={activeAccent.bg}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: EVENT PREFERENCES */}
              {activeTab === "preferences" && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Default Location */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Default Event Location</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Set your primary region so we can automatically show events near you.
                      </p>
                    </div>

                    <div className="max-w-md space-y-2">
                      <Label htmlFor="input-defaultCity" className="text-xs font-semibold text-zinc-300">
                        Primary City / Region
                      </Label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <Input
                          id="input-defaultCity"
                          value={settings.defaultCity}
                          onChange={(e) => updateSetting("defaultCity", e.target.value)}
                          placeholder="e.g. San Francisco, CA or London, UK"
                          className="pl-10 bg-zinc-950/80 border-white/10 text-white rounded-2xl h-11 text-sm focus:ring-2 focus:ring-white/20"
                        />
                      </div>
                    </div>

                    {/* Quick city suggestions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {["San Francisco, CA", "New York, NY", "London, UK", "Tokyo, JP", "Remote / Online"].map(
                        (city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => updateSetting("defaultCity", city)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                              settings.defaultCity === city
                                ? `${activeAccent.badgeBg} ${activeAccent.border} ${activeAccent.text}`
                                : "bg-zinc-800/60 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
                            }`}
                          >
                            {city}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Favorite Event Categories */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Favorite Event Categories</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Select tags to highlight relevant community meetups on your discover feed.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {CATEGORIES_LIST.map((cat) => {
                        const isFav = settings.favoriteCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              const newFavs = isFav
                                ? settings.favoriteCategories.filter((c) => c !== cat)
                                : [...settings.favoriteCategories, cat];
                              updateSetting("favoriteCategories", newFavs);
                            }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold border transition-all ${
                              isFav
                                ? `bg-gradient-to-r ${activeAccent.gradient} ${activeAccent.border} text-white shadow-md ${activeAccent.shadow}`
                                : "bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-900"
                            }`}
                          >
                            {isFav ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            <span>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Calendar Format */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Calendar Export Preference</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Choose which calendar application opens when you export an event.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { id: "google", label: "Google Calendar", desc: "Open in web browser" },
                        { id: "ical", label: "Apple iCal (.ics)", desc: "Download .ics file" },
                        { id: "outlook", label: "Microsoft Outlook", desc: "Open in Outlook app" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            updateSetting(
                              "calendarFormat",
                              item.id as UserSettings["calendarFormat"]
                            )
                          }
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            settings.calendarFormat === item.id
                              ? `${activeAccent.border} bg-zinc-900/80`
                              : "border-white/5 bg-zinc-950/40 hover:border-white/20"
                          }`}
                        >
                          <div className="text-sm font-bold text-white">{item.label}</div>
                          <div className="text-xs text-zinc-400 mt-1">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 6: SESSIONS & SECURITY */}
              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Two Factor Auth */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <ShieldCheck className={`w-5 h-5 ${activeAccent.text}`} />
                          Two-Factor Authentication (2FA)
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          Add an extra layer of security to your account with an authenticator app.
                        </p>
                      </div>

                      <Button
                        onClick={() => {
                          if (settings.twoFactorEnabled) {
                            setTwoFactorStep("disable");
                            setShow2FAModal(true);
                          } else {
                            const newSecret = generateUniqueSecretKey();
                            const newBackupCodes = generateUniqueBackupCodes(4);
                            setUser2FASecret(newSecret);
                            setUserBackupCodes(newBackupCodes);
                            setTwoFactorStep("scan");
                            setTwoFactorCode("");
                            setTwoFactorError("");
                            setShow2FAModal(true);
                          }
                        }}
                        className={`rounded-2xl font-semibold ${
                          settings.twoFactorEnabled
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : `${activeAccent.bg} hover:opacity-90 text-white`
                        }`}
                      >
                        {settings.twoFactorEnabled ? "Enabled (Manage)" : "Enable 2FA"}
                      </Button>
                    </div>

                    {settings.twoFactorEnabled && (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-sm text-emerald-300">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>
                          Two-factor authentication is active on your account using an Authenticator app.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Active Sessions */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">Active Browser Sessions</h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          Manage and revoke access from devices currently signed into your account.
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        disabled={activeSessions.length <= 1}
                        onClick={async () => {
                          try {
                            setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
                            await profileService.logoutAllDevices();
                            showToast("All other browser sessions have been revoked and logged out.");
                          } catch {
                            showToast("Failed to revoke sessions.");
                          }
                        }}
                        className="rounded-2xl border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Revoke All Other Sessions
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {activeSessions.map((sess) => {
                        const IconComponent = sess.icon;
                        return (
                          <div
                            key={sess.id}
                            className={`p-4 rounded-2xl ${
                              sess.isCurrent ? "bg-zinc-950/60 border border-white/10" : "bg-zinc-950/40 border border-white/5"
                            } flex items-center justify-between gap-4 transition-all`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl ${
                                  sess.isCurrent
                                    ? `${activeAccent.badgeBg} ${activeAccent.badgeText}`
                                    : "bg-zinc-800 text-zinc-400"
                                } flex items-center justify-center shrink-0`}
                              >
                                <IconComponent className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                  <span>{sess.device} • {sess.browser}</span>
                                  {sess.isCurrent && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold">
                                      Current Session
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-zinc-500 mt-0.5">
                                  {sess.location} • IP {sess.ip} • {sess.lastActive}
                                </div>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (sess.isCurrent) {
                                  showToast("Logging out of current device...");
                                  setTimeout(() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("user");
                                    router.push("/login");
                                  }, 800);
                                } else {
                                  setActiveSessions((prev) => prev.filter((s) => s.id !== sess.id));
                                  showToast(`Session (${sess.device} • ${sess.browser}) revoked and logged out successfully.`);
                                }
                              }}
                              className={`text-xs ${
                                sess.isCurrent
                                  ? "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                  : "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                              } rounded-xl gap-1.5`}
                            >
                              {sess.isCurrent ? (
                                <>
                                  <LogOut className="w-3.5 h-3.5" />
                                  Log Out Device
                                </>
                              ) : (
                                "Revoke"
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Login Activity */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Activity className={`w-5 h-5 ${activeAccent.text}`} />
                      Security Audit Log
                    </h3>

                    <div className="space-y-2 text-xs text-zinc-400">
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                        <span>Successful sign-in (Windows / Chrome)</span>
                        <span className="text-zinc-500">Just now</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                        <span>Profile details updated</span>
                        <span className="text-zinc-500">Yesterday</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span>Password verified</span>
                        <span className="text-zinc-500">3 days ago</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          </div>
        </div>
      </main>

      {/* MODAL 1: CHANGE PASSWORD */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPasswordModal(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl ${activeAccent.badgeBg} ${activeAccent.badgeText} flex items-center justify-center`}>
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Change Password</h3>
                  <p className="text-xs text-zinc-400">
                    Enter your current and new password below.
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="input-curr-pass" className="text-xs font-semibold text-zinc-300">
                    Current Password
                  </Label>
                  <Input
                    id="input-curr-pass"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1 bg-zinc-950/80 border-white/10 text-white rounded-2xl h-11"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <Label htmlFor="input-new-pass" className="text-xs font-semibold text-zinc-300">
                    New Password
                  </Label>
                  <Input
                    id="input-new-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 bg-zinc-950/80 border-white/10 text-white rounded-2xl h-11"
                    placeholder="At least 8 characters"
                  />
                  {/* Password Strength Meter */}
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Password strength:</span>
                        <span className="font-semibold text-white">
                          {getPasswordStrength(newPassword).label}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full ${
                            getPasswordStrength(newPassword).color
                          } transition-all duration-300`}
                          style={{
                            width: `${
                              (getPasswordStrength(newPassword).score / 4) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="input-confirm-pass" className="text-xs font-semibold text-zinc-300">
                    Confirm New Password
                  </Label>
                  <Input
                    id="input-confirm-pass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 bg-zinc-950/80 border-white/10 text-white rounded-2xl h-11"
                    placeholder="Repeat new password"
                  />
                </div>

                {passwordError && (
                  <p className="text-xs text-rose-400 font-semibold">{passwordError}</p>
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowPasswordModal(false)}
                    className="rounded-2xl text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className={`rounded-2xl ${activeAccent.bg} hover:opacity-90 text-white font-semibold`}
                  >
                    {isUpdatingPassword ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Update Password
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: DELETE ACCOUNT CONFIRMATION */}
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
              className="bg-zinc-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-extrabold text-white">Delete Account?</h3>
              <p className="text-sm text-zinc-400 mt-2">
                This action is permanent and cannot be undone. All your profile data, RSVP badges, and event history will be removed.
              </p>

              <div className="mt-4">
                <Label htmlFor="input-delete-confirm" className="text-xs font-semibold text-zinc-400 block mb-1.5">
                  Type <span className="font-mono text-rose-400 font-bold">DELETE</span> to confirm
                </Label>
                <Input
                  id="input-delete-confirm"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="DELETE"
                  className="bg-zinc-950 border-white/10 text-white rounded-2xl h-11"
                />
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmationText("");
                  }}
                  className="flex-1 rounded-2xl text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={deleteConfirmationText !== "DELETE"}
                  onClick={async () => {
                    setShowDeleteModal(false);
                    try {
                      await profileService.deleteMyAccount();
                      localStorage.removeItem("accessToken");
                      localStorage.removeItem("refreshToken");
                      localStorage.removeItem("cc_user_settings");
                      showToast("Account deleted successfully.");
                      setTimeout(() => {
                        window.location.href = "/";
                      }, 1000);
                    } catch (err: unknown) {
                      const errMsg =
                        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                        "Failed to delete account.";
                      showToast(errMsg);
                    }
                  }}
                  className="flex-1 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-50"
                >
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 3: INTERACTIVE 2FA SETUP & MANAGEMENT */}
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
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center"
            >
              <button
                onClick={() => setShow2FAModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {twoFactorStep === "scan" && (
                <div>
                  <div className={`w-12 h-12 rounded-2xl ${activeAccent.badgeBg} ${activeAccent.badgeText} flex items-center justify-center mx-auto mb-4`}>
                    <QrCode className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-bold text-white">Setup Authenticator App</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Scan this QR code with any Authenticator app (Google Authenticator, Authy, 1Password) to link <span className="text-white font-semibold">{profile?.email || "user@communityconnect.io"}</span>.
                  </p>

                  {/* Realistic Scannable SVG QR Code */}
                  <div
                    style={{
                      backgroundColor: "#FFFFFF",
                      padding: "16px",
                      borderRadius: "16px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                      border: "2px solid #e4e4e7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "20px auto",
                      width: "fit-content",
                    }}
                  >
                    <QRCodeSVG
                      value={`otpauth://totp/CommunityConnect:${encodeURIComponent(
                        profile?.email || "user@communityconnect.io"
                      )}?secret=${user2FASecret}&issuer=CommunityConnect`}
                      size={170}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                      includeMargin={false}
                    />
                  </div>

                  <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-3 mb-4 flex items-center justify-between gap-2">
                    <div className="text-left">
                      <div className="text-[10px] uppercase font-bold text-zinc-500">Secret Key</div>
                      <div className="font-mono text-xs text-zinc-200 font-bold tracking-wider">
                        {user2FASecret.replace(/(.{4})/g, "$1 ").trim()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(user2FASecret);
                        setCopiedSecret(true);
                        showToast("Secret key copied to clipboard!");
                        setTimeout(() => setCopiedSecret(false), 2000);
                      }}
                      className="text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="text-left mb-4">
                    <Label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                      Enter 6-Digit Verification Code
                    </Label>
                    <Input
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => {
                        setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ""));
                        setTwoFactorError("");
                      }}
                      placeholder="e.g. 123456"
                      className="bg-zinc-950 border-white/10 text-white rounded-2xl text-center font-mono text-xl tracking-[0.3em] font-bold h-12"
                    />
                    {twoFactorError && (
                      <p className="text-xs text-rose-400 mt-1 font-medium">{twoFactorError}</p>
                    )}
                  </div>

                  <Button
                    disabled={twoFactorCode.length < 6 || isVerifying2FA}
                    onClick={async () => {
                      setIsVerifying2FA(true);
                      setTwoFactorError("");
                      try {
                        const isValid = await verify2FACode(twoFactorCode, user2FASecret, userBackupCodes);
                        if (!isValid) {
                          setIsVerifying2FA(false);
                          setTwoFactorError("Invalid verification code. Please check your Authenticator app and try again.");
                          return;
                        }
                        setIsVerifying2FA(false);
                        setTwoFactorStep("backup");
                        updateSetting("twoFactorEnabled", true);
                        updateSetting("twoFactorSecret", user2FASecret);
                        updateSetting("twoFactorBackupCodes", userBackupCodes);
                        // localStorage.setItem("cc_2fa_secret", user2FASecret);
                        // localStorage.setItem("cc_2fa_backup_codes", JSON.stringify(userBackupCodes));
                        // localStorage.setItem("cc_2fa_enabled", "true");
                        showToast("Two-Factor Authentication verified and enabled!");
                      } catch {
                        setIsVerifying2FA(false);
                        setTwoFactorError("Failed to verify code. Please try again.");
                      }
                    }}
                    className={`w-full rounded-2xl ${activeAccent.bg} hover:opacity-90 text-white font-semibold h-11 shadow-lg`}
                  >
                    {isVerifying2FA ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Verifying Code...
                      </>
                    ) : (
                      "Verify & Activate 2FA"
                    )}
                  </Button>
                </div>
              )}

              {twoFactorStep === "backup" && (
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-bold text-white">2FA Activated Successfully!</h3>
                  <p className="text-sm text-zinc-400 mt-2">
                    Save these emergency recovery codes in a secure place (like 1Password). Each code can be used once if you lose your authenticator app.
                  </p>

                  <div className="grid grid-cols-2 gap-2 my-5">
                    {userBackupCodes.map((code) => (
                      <div
                        key={code}
                        className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 font-mono text-xs font-bold text-zinc-300"
                      >
                        {code}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(userBackupCodes.join("\n"));
                        setCopiedBackup(true);
                        showToast("All backup codes copied to clipboard!");
                        setTimeout(() => setCopiedBackup(false), 2000);
                      }}
                      className="flex-1 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold"
                    >
                      {copiedBackup ? (
                        <>
                          <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1.5" />
                          Copy Codes
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShow2FAModal(false)}
                      className={`flex-1 rounded-2xl ${activeAccent.bg} hover:opacity-90 text-white font-semibold`}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}

              {twoFactorStep === "disable" && (
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-bold text-white">2FA is Enabled</h3>
                  <p className="text-sm text-zinc-400 mt-2">
                    Your account is currently protected by an Authenticator app. You can view your emergency backup codes or turn off 2FA protection.
                  </p>

                  <div className="flex flex-col gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setTwoFactorStep("backup")}
                      className="w-full rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold h-11"
                    >
                      View Emergency Backup Codes
                    </Button>
                    <Button
                      onClick={() => {
                        updateSetting("twoFactorEnabled", false);
                        setShow2FAModal(false);
                        showToast("Two-Factor Authentication has been disabled.");
                      }}
                      className="w-full rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold h-11"
                    >
                      Disable 2FA Protection
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
