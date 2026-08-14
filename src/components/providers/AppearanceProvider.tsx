"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from "react";
import { profileService } from "@/services/profile.service";
import { pushNotificationService } from "@/services/pushNotification.service";

export interface UserSettings {
  emailReminders: boolean;
  communityUpdates: boolean;
  teamInvites: boolean;
  weeklyDigest: boolean;
  soundEffects: boolean;
  notificationFrequency: "realtime" | "daily" | "weekly" | "muted";
  theme: "dark" | "light" | "system";
  accentColor: "indigo" | "violet" | "emerald" | "rose" | "cyan" | "amber";
  compactMode: boolean;
  smoothAnimations: boolean;
  profileVisibility: "public" | "community" | "private";
  showEmailOnProfile: boolean;
  showLocationOnProfile: boolean;
  allowDirectMessages: "everyone" | "attendees" | "nobody";
  preferredCities: string[];
  favoriteCategories: string[];
  calendarFormat: "google" | "ical" | "outlook";
  twoFactorEnabled: boolean;
  searchPreferences: string[];
}

export const DEFAULT_SETTINGS: UserSettings = {
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
  preferredCities: [],
  favoriteCategories: ["Tech & AI", "Meetups", "Workshops"],
  calendarFormat: "google",
  twoFactorEnabled: false,
  searchPreferences: [],
};

export interface AccentColorConfig {
  id: "indigo" | "violet" | "emerald" | "rose" | "cyan" | "amber";
  name: string;
  bg: string;
  border: string;
  text: string;
  hex: string;
  rgb: string;
  ring: string;
  gradient: string;
  shadow: string;
  badgeBg: string;
  badgeText: string;
}

export const ACCENT_COLORS_CONFIG: AccentColorConfig[] = [
  {
    id: "indigo",
    name: "Indigo",
    bg: "bg-indigo-600",
    border: "border-indigo-500",
    text: "text-indigo-400",
    hex: "#6366f1",
    rgb: "99, 102, 241",
    ring: "focus:ring-indigo-500",
    gradient: "from-indigo-600 to-violet-600",
    shadow: "shadow-indigo-500/20",
    badgeBg: "bg-indigo-500/10",
    badgeText: "text-indigo-400",
  },
  {
    id: "violet",
    name: "Violet",
    bg: "bg-violet-600",
    border: "border-violet-500",
    text: "text-violet-400",
    hex: "#8b5cf6",
    rgb: "139, 92, 246",
    ring: "focus:ring-violet-500",
    gradient: "from-violet-600 to-fuchsia-600",
    shadow: "shadow-violet-500/20",
    badgeBg: "bg-violet-500/10",
    badgeText: "text-violet-400",
  },
  {
    id: "emerald",
    name: "Emerald",
    bg: "bg-emerald-600",
    border: "border-emerald-500",
    text: "text-emerald-400",
    hex: "#10b981",
    rgb: "16, 185, 129",
    ring: "focus:ring-emerald-500",
    gradient: "from-emerald-600 to-teal-600",
    shadow: "shadow-emerald-500/20",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
  },
  {
    id: "rose",
    name: "Rose",
    bg: "bg-rose-600",
    border: "border-rose-500",
    text: "text-rose-400",
    hex: "#f43f5e",
    rgb: "244, 63, 94",
    ring: "focus:ring-rose-500",
    gradient: "from-rose-600 to-pink-600",
    shadow: "shadow-rose-500/20",
    badgeBg: "bg-rose-500/10",
    badgeText: "text-rose-400",
  },
  {
    id: "cyan",
    name: "Cyan",
    bg: "bg-cyan-600",
    border: "border-cyan-500",
    text: "text-cyan-400",
    hex: "#06b6d4",
    rgb: "6, 182, 212",
    ring: "focus:ring-cyan-500",
    gradient: "from-cyan-600 to-blue-600",
    shadow: "shadow-cyan-500/20",
    badgeBg: "bg-cyan-500/10",
    badgeText: "text-cyan-400",
  },
  {
    id: "amber",
    name: "Amber",
    bg: "bg-amber-600",
    border: "border-amber-500",
    text: "text-amber-400",
    hex: "#f59e0b",
    rgb: "245, 158, 11",
    ring: "focus:ring-amber-500",
    gradient: "from-amber-600 to-orange-600",
    shadow: "shadow-amber-500/20",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
  },
];

export interface AppearanceContextType {
  settings: UserSettings;
  theme: "dark" | "light" | "system";
  accentColor: "indigo" | "violet" | "emerald" | "rose" | "cyan" | "amber";
  compactMode: boolean;
  smoothAnimations: boolean;
  isDark: boolean;
  activeAccent: AccentColorConfig;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  resetToDefaults: () => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("cc_user_settings");
        if (stored) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
      } catch (err) {
        console.error("Failed to load appearance settings:", err);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [systemPreferDark, setSystemPreferDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  // Listen for OS system dark mode changes and register Service Worker for Push
  useEffect(() => {
    // Register Service Worker for Background Push Notifications
    if (typeof window !== "undefined") {
      pushNotificationService.registerServiceWorker().catch(() => {});
    }

    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPreferDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Sync settings from localStorage and backend
  useEffect(() => {
    const fetchRemoteSettings = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const remote = await profileService.getMySettings();
        if (remote && Object.keys(remote).length > 0) {
          setSettings((prev) => {
            const merged = { ...prev, ...remote };
            // localStorage.setItem("cc_user_settings", JSON.stringify(merged));
            return merged;
          });
        }
      } catch {
        // Guest or offline
      }
    };
    fetchRemoteSettings();

    // Listen for custom settings update events (e.g. from Settings page)
    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<UserSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        const stored = localStorage.getItem("cc_user_settings");
        if (stored) {
          try {
            setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
          } catch {
            // Ignore parse error
          }
        }
      }
    };

    window.addEventListener("cc_settings_updated", handleSettingsUpdated);
    window.addEventListener("storage", handleSettingsUpdated);
    return () => {
      window.removeEventListener("cc_settings_updated", handleSettingsUpdated);
      window.removeEventListener("storage", handleSettingsUpdated);
    };
  }, []);

  const isDark = useMemo(() => {
    if (settings.theme === "dark") return true;
    if (settings.theme === "light") return false;
    return systemPreferDark;
  }, [settings.theme, systemPreferDark]);

  const activeAccent = useMemo(() => {
    const base =
      ACCENT_COLORS_CONFIG.find((c) => c.id === settings.accentColor) ||
      ACCENT_COLORS_CONFIG[0];

    const lightTextMap: Record<string, string> = {
      indigo: "text-indigo-700",
      violet: "text-violet-700",
      emerald: "text-emerald-800",
      rose: "text-rose-700",
      cyan: "text-cyan-800",
      amber: "text-amber-800",
    };

    const darkTextMap: Record<string, string> = {
      indigo: "text-indigo-400",
      violet: "text-violet-400",
      emerald: "text-emerald-400",
      rose: "text-rose-400",
      cyan: "text-cyan-400",
      amber: "text-amber-400",
    };

    const lightBadgeBgMap: Record<string, string> = {
      indigo: "bg-indigo-100",
      violet: "bg-violet-100",
      emerald: "bg-emerald-100",
      rose: "bg-rose-100",
      cyan: "bg-cyan-100",
      amber: "bg-amber-100",
    };

    return {
      ...base,
      text: isDark ? darkTextMap[base.id] : lightTextMap[base.id],
      badgeText: isDark ? darkTextMap[base.id] : lightTextMap[base.id],
      badgeBg: isDark ? base.badgeBg : lightBadgeBgMap[base.id],
    };
  }, [settings.accentColor, isDark]);

  // Apply classes and CSS variables to document.documentElement (<html>)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Apply dark/light theme classes and data-theme attribute
    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }

    // Apply accent data attribute & CSS variables
    root.setAttribute("data-accent", settings.accentColor);
    root.style.setProperty("--accent-hex", activeAccent.hex);
    root.style.setProperty("--accent-rgb", activeAccent.rgb);
    root.style.setProperty("--accent-color", activeAccent.hex);

    // Apply compact mode
    if (settings.compactMode) {
      root.classList.add("compact-mode");
    } else {
      root.classList.remove("compact-mode");
    }

    // Apply smooth animations
    if (!settings.smoothAnimations) {
      root.classList.add("no-animations");
    } else {
      root.classList.remove("no-animations");
    }
  }, [isDark, activeAccent, settings.compactMode, settings.smoothAnimations, settings.accentColor]);

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    if (typeof window !== "undefined") {
      // localStorage.setItem("cc_user_settings", JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("cc_settings_updated", { detail: updated })
      );
    }
    profileService.updateMySettings({ [key]: value }).catch(() => {
      // Silently ignore if offline
    });
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    if (typeof window !== "undefined") {
      // localStorage.setItem("cc_user_settings", JSON.stringify(DEFAULT_SETTINGS));
      window.dispatchEvent(
        new CustomEvent("cc_settings_updated", { detail: DEFAULT_SETTINGS })
      );
    }
    profileService.updateMySettings(DEFAULT_SETTINGS).catch(() => {});
  };

  return (
    <AppearanceContext.Provider
      value={{
        settings,
        theme: settings.theme,
        accentColor: settings.accentColor,
        compactMode: settings.compactMode,
        smoothAnimations: settings.smoothAnimations,
        isDark,
        activeAccent,
        updateSetting,
        resetToDefaults,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

const DEFAULT_APPEARANCE_CONTEXT: AppearanceContextType = {
  settings: DEFAULT_SETTINGS,
  theme: "system",
  accentColor: "indigo",
  compactMode: false,
  smoothAnimations: true,
  isDark: true,
  activeAccent: ACCENT_COLORS_CONFIG[0],
  updateSetting: () => {},
  resetToDefaults: () => {},
};

export function useAppearance(): AppearanceContextType {
  const context = useContext(AppearanceContext);
  return context || DEFAULT_APPEARANCE_CONTEXT;
}
