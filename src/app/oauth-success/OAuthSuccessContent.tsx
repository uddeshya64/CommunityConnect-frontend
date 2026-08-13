"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function OAuthSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const name = searchParams.get("name");
    const email = searchParams.get("email");

    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
    }
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
    if (name) {
      localStorage.setItem("userName", name);
    }
    if (email) {
      localStorage.setItem("userEmail", email);
    }

    const storedAccessToken = accessToken || localStorage.getItem("accessToken");

    if (!storedAccessToken) {
      console.error("OAuth authentication failed: Access token missing");
      router.replace("/login?error=oauth_failed");
      return;
    }

    // REDIRECT TO RETURN URL (Event Dashboard) OR HOME
    const returnUrl = searchParams.get("returnUrl");
    if (returnUrl && returnUrl.startsWith("http")) {
      window.location.href = returnUrl;
    } else {
      router.replace("/home");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-zinc-700 border-t-indigo-500 rounded-full animate-spin mx-auto" />
        <h1 className="mt-6 text-xl font-semibold text-white">
          Authentication Successful
        </h1>
        <p className="mt-2 text-zinc-400">
          Redirecting you back to your Event Dashboard...
        </p>
      </div>
    </div>
  );
}
