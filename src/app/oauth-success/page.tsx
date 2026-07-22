"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function OAuthSuccessClient() {
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

  return (
    <div className="flex h-screen items-center justify-center">
      <h1>Logging you in...</h1>
    </div>
  );
}

export default function OAuthSuccess() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Logging you in...</div>}>
      <OAuthSuccessClient />
    </Suspense>
  );
}
