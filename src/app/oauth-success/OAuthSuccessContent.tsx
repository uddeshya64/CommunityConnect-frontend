"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function OAuthSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const accessToken =
      searchParams.get("accessToken");

    const refreshToken =
      searchParams.get("refreshToken");

    const name =
      searchParams.get("name");

    const email =
      searchParams.get("email");

    console.log(
      "OAuth Success Page"
    );

    console.log(
      "Access Token:",
      accessToken
        ? "FOUND"
        : "NOT FOUND"
    );

    console.log(
      "Refresh Token:",
      refreshToken
        ? "FOUND"
        : "NOT FOUND"
    );

    // ============================================
    // SAVE ACCESS TOKEN
    // ============================================

    if (accessToken) {
      localStorage.setItem(
        "accessToken",
        accessToken
      );
    }

    // ============================================
    // SAVE REFRESH TOKEN
    // ============================================

    if (refreshToken) {
      localStorage.setItem(
        "refreshToken",
        refreshToken
      );
    }

    // ============================================
    // SAVE USER NAME
    // ============================================

    if (name) {
      localStorage.setItem(
        "userName",
        name
      );
    }

    // ============================================
    // SAVE USER EMAIL
    // ============================================

    if (email) {
      localStorage.setItem(
        "userEmail",
        email
      );
    }

    // ============================================
    // CHECK IF ACCESS TOKEN EXISTS
    // ============================================

    const storedAccessToken =
      accessToken ||
      localStorage.getItem(
        "accessToken"
      );

    if (!storedAccessToken) {
      console.error(
        "OAuth authentication failed: Access token missing"
      );

      router.replace(
        "/login?error=oauth_failed"
      );

      return;
    }

    console.log(
      "OAuth authentication successful"
    );

    // ============================================
    // REDIRECT TO HOME
    // ============================================

    router.replace("/home");

  }, [
    searchParams,
    router,
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">

        <div className="w-12 h-12 border-4 border-zinc-700 border-t-indigo-500 rounded-full animate-spin mx-auto" />

        <h1 className="mt-6 text-xl font-semibold text-white">
          Authentication Successful
        </h1>

        <p className="mt-2 text-zinc-400">
          Redirecting you to CommunityConnect...
        </p>

      </div>
    </div>
  );
}