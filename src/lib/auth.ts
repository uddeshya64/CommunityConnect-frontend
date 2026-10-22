import axios from "axios";
import { API_BASE_URL } from "@/config/env";

export interface StoredTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

const AUTH_KEYS = [
  "accessToken",
  "refreshToken",
  "token",
  "user",
  "userName",
  "userEmail",
  "cc_user_profile",
  "cc_user_id",
  "cc_user_settings",
] as const;

/**
 * Retrieve active tokens from localStorage safely
 */
export function getStoredTokens(): StoredTokens {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null };
  }
  return {
    accessToken: localStorage.getItem("accessToken") || localStorage.getItem("token") || null,
    refreshToken: localStorage.getItem("refreshToken") || null,
  };
}

/**
 * Check if the browser currently holds an active access token or refresh token
 */
export function hasStoredSession(): boolean {
  if (typeof window === "undefined") return false;
  const { accessToken, refreshToken } = getStoredTokens();
  return Boolean(accessToken || refreshToken);
}

/**
 * Persist tokens to localStorage & synchronize session cookie for instant tab-reopen detection
 */
export function setStoredTokens(accessToken: string, refreshToken?: string | null): void {
  if (typeof window === "undefined") return;

  if (accessToken) {
    localStorage.setItem("accessToken", accessToken);
    // Backward compatibility for components checking "token"
    localStorage.setItem("token", accessToken);
    // 30 days session indicator cookie
    document.cookie = `cc_auth=1; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `accessToken=${encodeURIComponent(accessToken)}; path=/; max-age=2592000; SameSite=Lax`;
  }

  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }

  // Notify all listening components and other tabs
  window.dispatchEvent(new Event("cc_auth_changed"));
}

/**
 * Cleanly wipe all authentication tokens, cookies, and cached user states
 */
export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;

  AUTH_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });

  // Clear session cookies
  document.cookie = "cc_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

  window.dispatchEvent(new Event("cc_auth_changed"));
}

/**
 * Production-grade logout:
 * Notifies the backend to revoke session, but ALWAYS clears local state
 * even if the network or backend is unreachable.
 */
export async function performLogout(redirectTo: string = "/login"): Promise<void> {
  const { accessToken } = getStoredTokens();

  if (accessToken) {
    try {
      await axios.post(
        `${API_BASE_URL}/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 4000,
        }
      );
    } catch {
      // Backend session cleanup failed or token already expired; continue local cleanup
    }
  }

  clearStoredAuth();

  if (typeof window !== "undefined" && redirectTo) {
    if (window.location.pathname !== redirectTo) {
      window.location.href = redirectTo;
    }
  }
}
