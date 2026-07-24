"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function OAuthSuccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const userId = searchParams.get("userId");
    const returnUrl = searchParams.get("returnUrl");

    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
    }

    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }

    if (userId) {
      localStorage.setItem("userId", userId);
    }

    const redirectTo = returnUrl
      ? returnUrl
      : userId
      ? `/profile/${userId}`
      : "/home";

    if (accessToken && refreshToken) {
      router.replace(redirectTo);
    }
  }, [router, searchParams]);

  return null;
}

export default function OAuthSuccess() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Suspense fallback={<div>Loading...</div>}>
        <OAuthSuccessHandler />
      </Suspense>
      <h1 className="text-xl font-bold text-zinc-800">
        Logging you in...
      </h1>
    </div>
  );
}