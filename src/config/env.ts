/**
 * Centralized Environment Configuration for CommunityConnect Frontend
 *
 * All URLs and environment variables are centralized here.
 * DO NOT hardcode backend, socket, or frontend URLs anywhere in the app.
 *
 * For Localhost Development (in .env.local):
 *   NEXT_PUBLIC_API_URL="http://localhost:3000/api"
 *   NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
 *   NEXT_PUBLIC_APP_URL="http://localhost:3001"
 *
 * For Production / Staging:
 *   NEXT_PUBLIC_API_URL="https://your-backend-api.com/api"
 *   NEXT_PUBLIC_SOCKET_URL="https://your-backend-api.com"
 *   NEXT_PUBLIC_APP_URL="https://your-frontend-domain.com"
 */

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

// API Base URL (e.g. http://localhost:3000/api or https://api.mysite.com/api)
const rawApiUrl =
  (typeof window !== "undefined" && (window as any)._env_?.NEXT_PUBLIC_API_URL) ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000/api";

export const API_BASE_URL = stripTrailingSlash(rawApiUrl);

// Socket Server URL (e.g. http://localhost:3000 or https://api.mysite.com)
const rawSocketUrl =
  (typeof window !== "undefined" && (window as any)._env_?.NEXT_PUBLIC_SOCKET_URL) ||
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  API_BASE_URL.replace(/\/api\/?$/, "");

export const SOCKET_URL = stripTrailingSlash(rawSocketUrl || "http://localhost:3000");

// Frontend App URL (e.g. http://localhost:3001 or https://mysite.com)
export const APP_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "http://localhost:3001")
);

// Payment Gateway (Razorpay)
export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

// Speech Recognition Default Language for AI Event Creator
export const AI_SPEECH_LANG = process.env.NEXT_PUBLIC_AI_SPEECH_LANG || "en-IN";

export const config = {
  API_BASE_URL,
  SOCKET_URL,
  APP_URL,
  RAZORPAY_KEY_ID,
  AI_SPEECH_LANG,
};

export default config;
