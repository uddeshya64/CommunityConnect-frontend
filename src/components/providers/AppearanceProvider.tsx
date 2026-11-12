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

export const THEMES = {
  dark: {
    "--bg": "#09090b",
    "--chrome": "rgba(12,12,14,.72)",
    "--card": "rgba(24,24,27,.72)",
    "--card2": "rgba(39,39,42,.55)",
    "--text": "#f4f4f5",
    "--muted": "#a1a1aa",
    "--subtle": "#71717a",
    "--border": "rgba(255,255,255,.08)",
    "--input": "rgba(255,255,255,.04)",
  },
  light: {
    "--bg": "#f6f7f9",
    "--chrome": "rgba(255,255,255,.78)",
    "--card": "rgba(255,255,255,.92)",
    "--card2": "#eef1f5",
    "--text": "#0f172a",
    "--muted": "#334155",
    "--subtle": "#64748b",
    "--border": "rgba(15,23,42,.14)",
    "--input": "#ffffff",
  },
} as const;

export const ACCENT_PAIRS: Record<string, [string, string]> = {
  indigo: ["#6366f1", "#8b5cf6"],
  violet: ["#8b5cf6", "#d946ef"],
  emerald: ["#10b981", "#14b8a6"],
  rose: ["#f43f5e", "#ec4899"],
  cyan: ["#06b6d4", "#3b82f6"],
  amber: ["#f59e0b", "#ea580c"],
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
  gradientEnd: string;
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
    gradientEnd: "#8b5cf6",
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
    gradientEnd: "#d946ef",
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
    gradientEnd: "#14b8a6",
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
    gradientEnd: "#ec4899",
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
    gradientEnd: "#3b82f6",
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
    gradientEnd: "#ea580c",
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
  toggleTheme: () => void;
  resetToDefaults: () => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [systemPreferDark, setSystemPreferDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedTheme = localStorage.getItem("cc_theme") as "dark" | "light" | "system" | null;
      const stored = localStorage.getItem("cc_user_settings");
      let loadedSettings = DEFAULT_SETTINGS;
      if (stored) {
        loadedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
      if (storedTheme && ["dark", "light", "system"].includes(storedTheme)) {
        loadedSettings.theme = storedTheme;
      } else {
        loadedSettings.theme = loadedSettings.theme || "dark";
      }
      setSettings(loadedSettings);
    } catch (err) {
      console.error("Failed to load appearance settings:", err);
    }

    if (window.matchMedia) {
      setSystemPreferDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      pushNotificationService.registerServiceWorker().catch(() => {});
    }

    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPreferDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const fetchRemoteSettings = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          const localTheme = (localStorage.getItem("cc_theme") as any) || "dark";
          setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, theme: localTheme }));
          return;
        }
        const remote = await profileService.getMySettings();
        if (remote && Object.keys(remote).length > 0) {
          setSettings((prev) => {
            const clientTheme = (localStorage.getItem("cc_theme") as any) || prev.theme || "dark";
            const merged = { ...prev, ...remote, theme: clientTheme };
            localStorage.setItem("cc_user_settings", JSON.stringify(merged));
            return merged;
          });
        }
      } catch {
        // Guest or offline
      }
    };
    fetchRemoteSettings();

    const handleAuthChanged = () => {
      fetchRemoteSettings();
    };

    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<UserSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        const stored = localStorage.getItem("cc_user_settings");
        if (stored) {
          try {
            setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
          } catch {}
        }
      }
    };

    window.addEventListener("cc_auth_changed", handleAuthChanged);
    window.addEventListener("cc_settings_updated", handleSettingsUpdated);
    window.addEventListener("storage", handleSettingsUpdated);
    return () => {
      window.removeEventListener("cc_auth_changed", handleAuthChanged);
      window.removeEventListener("cc_settings_updated", handleSettingsUpdated);
      window.removeEventListener("storage", handleSettingsUpdated);
    };
  }, []);

  const isDark = useMemo(() => {
    if (!mounted) return true;
    if (settings.theme === "dark") return true;
    if (settings.theme === "light") return false;
    return systemPreferDark;
  }, [settings.theme, systemPreferDark, mounted]);

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

  // Apply complete CSS variable token engine to document.documentElement
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const currentThemeMode = isDark ? "dark" : "light";

    // 1. Set all core theme design tokens
    const tokens = THEMES[currentThemeMode];
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // 2. Set dynamic accents
    const pair = ACCENT_PAIRS[settings.accentColor] || ACCENT_PAIRS.indigo;
    root.style.setProperty("--accent", pair[0]);
    root.style.setProperty("--accent2", pair[1]);
    root.style.setProperty("--accent-hex", pair[0]);
    root.style.setProperty("--accent-rgb", activeAccent.rgb);
    root.style.setProperty("--accent-color", pair[0]);

    // 3. Set standard colorScheme
    root.style.colorScheme = currentThemeMode;

    // 4. Update DOM classes and data attributes
    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }

    root.setAttribute("data-accent", settings.accentColor);

    // 5. Density and animation modes
    if (settings.compactMode) {
      root.classList.add("compact-mode");
      root.style.setProperty("--pad", "14px");
      root.style.setProperty("--gap", "12px");
    } else {
      root.classList.remove("compact-mode");
      root.style.setProperty("--pad", "20px");
      root.style.setProperty("--gap", "18px");
    }

    if (!settings.smoothAnimations) {
      root.classList.add("no-animations");
      root.classList.add("no-anim");
    } else {
      root.classList.remove("no-animations");
      root.classList.remove("no-anim");
    }
  }, [isDark, activeAccent, settings.compactMode, settings.smoothAnimations, settings.accentColor]);

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    if (typeof window !== "undefined") {
      if (key === "theme") {
        localStorage.setItem("cc_theme", String(value));
        window.dispatchEvent(
          new CustomEvent("cc_theme_changed", { detail: value })
        );
      }
      localStorage.setItem("cc_user_settings", JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("cc_settings_updated", { detail: updated })
      );
    }
    profileService.updateMySettings({ [key]: value }).catch(() => {});
  };

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    updateSetting("theme", next);
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    if (typeof window !== "undefined") {
      localStorage.setItem("cc_theme", "dark");
      localStorage.setItem("cc_user_settings", JSON.stringify(DEFAULT_SETTINGS));
      window.dispatchEvent(
        new CustomEvent("cc_settings_updated", { detail: DEFAULT_SETTINGS })
      );
      window.dispatchEvent(
        new CustomEvent("cc_theme_changed", { detail: "dark" })
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
        toggleTheme,
        resetToDefaults,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

const DEFAULT_APPEARANCE_CONTEXT: AppearanceContextType = {
  settings: DEFAULT_SETTINGS,
  theme: "dark",
  accentColor: "indigo",
  compactMode: false,
  smoothAnimations: true,
  isDark: true,
  activeAccent: ACCENT_COLORS_CONFIG[0],
  updateSetting: () => {},
  toggleTheme: () => {},
  resetToDefaults: () => {},
};

export function useAppearance(): AppearanceContextType {
  const context = useContext(AppearanceContext);
  return context || DEFAULT_APPEARANCE_CONTEXT;
}
