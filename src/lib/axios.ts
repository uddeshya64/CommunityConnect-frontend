import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config/env";
import { getStoredTokens, setStoredTokens, clearStoredAuth } from "./auth";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to track whether an auth refresh request is currently in-flight
let isRefreshing = false;
// Queue of failed requests awaiting a new access token
let refreshSubscribers: Array<(token: string) => void> = [];

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const onTokenRefreshFailed = () => {
  refreshSubscribers = [];
};

// ==========================================
// REQUEST INTERCEPTOR
// ==========================================
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const currentHost = window.location.hostname;
      if (currentHost && currentHost !== "localhost" && currentHost !== "127.0.0.1") {
        if (config.baseURL && (config.baseURL.includes("localhost") || config.baseURL.includes("127.0.0.1"))) {
          config.baseURL = config.baseURL.replace(/localhost|127\.0\.0\.1/, currentHost);
        }
        if (config.url && (config.url.includes("localhost") || config.url.includes("127.0.0.1"))) {
          config.url = config.url.replace(/localhost|127\.0\.0\.1/, currentHost);
        }
      }

      const { accessToken } = getStoredTokens();
      if (accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// RESPONSE INTERCEPTOR (With Silent Token Refresh)
// ==========================================
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // If no response or not a 401, reject immediately
    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";

    // Do NOT attempt refresh for login, register, or refresh endpoints themselves
    if (
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    // If already retried once, do not loop
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    const { refreshToken } = getStoredTokens();

    // If there is no refreshToken stored, we cannot refresh
    if (!refreshToken) {
      handleUnauthorizedRedirect();
      return Promise.reject(error);
    }

    // If a refresh is already in progress, wait for it and then replay this request
    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshSubscribers.push((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Use clean standalone axios instance so it doesn't trigger interceptors
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } }
      );

      const newAccessToken =
        response.data?.accessToken ||
        response.data?.data?.accessToken ||
        null;
      const newRefreshToken =
        response.data?.refreshToken ||
        response.data?.data?.refreshToken ||
        refreshToken;

      if (!newAccessToken) {
        throw new Error("No access token returned from refresh endpoint");
      }

      // Persist the new tokens
      setStoredTokens(newAccessToken, newRefreshToken);

      // Notify any other pending requests that the token is ready
      onTokenRefreshed(newAccessToken);

      // Replay the original failed request
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      onTokenRefreshFailed();
      handleUnauthorizedRedirect();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

function handleUnauthorizedRedirect() {
  clearStoredAuth();

  if (typeof window !== "undefined") {
    const currentPath = window.location.pathname;
    const publicPaths = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

    if (!publicPaths.includes(currentPath)) {
      const redirectQuery = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirectQuery}`;
    }
  }
}
