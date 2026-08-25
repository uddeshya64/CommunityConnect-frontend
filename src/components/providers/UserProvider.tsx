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

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (): Promise<Profile | null> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      setProfile(null);
      setIsLoading(false);
      return null;
    }

    try {
      setError(null);
      const data = await profileService.getMyProfile();
      setProfile(data);
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
      setIsLoading(true);
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
