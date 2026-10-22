"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { profileService } from "@/services/profile.service";
import { Profile } from "@/types/profile.types";

interface UserContextType {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<Profile | null>;
  setProfileData: (profile: Profile | null) => void;
  clearProfile: () => void;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  isLoading: true,
  error: null,
  refreshProfile: async () => null,
  setProfileData: () => {},
  clearProfile: () => {},
});

import { getStoredTokens, clearStoredAuth } from "@/lib/auth";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("cc_user_profile");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (): Promise<Profile | null> => {
    const { accessToken, refreshToken } = getStoredTokens();
    if (!accessToken && !refreshToken) {
      setProfile(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("cc_user_profile");
      }
      setIsLoading(false);
      return null;
    }

    try {
      setError(null);
      const data = await profileService.getMyProfile();
      setProfile(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("cc_user_profile", JSON.stringify(data));
      }
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load user profile");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    if (typeof window === "undefined") return;

    const handleAuthChange = () => {
      fetchProfile();
    };

    window.addEventListener("cc_auth_changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("cc_auth_changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [fetchProfile]);

  const clearProfile = useCallback(() => {
    setProfile(null);
    clearStoredAuth();
  }, []);

  const setProfileData = useCallback((data: Profile | null) => {
    setProfile(data);
  }, []);

  return (
    <UserContext.Provider
      value={{
        profile,
        isLoading,
        error,
        refreshProfile: fetchProfile,
        setProfileData,
        clearProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
