import { useState } from "react";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export interface MyProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  profession: string | null;
  skills: string[];
  github: string | null;
  linkedin: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface MyProfileResponse {
  success: boolean;
  data: MyProfile;
}

export function useMyProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMyProfile = async (): Promise<MyProfile> => {
    setIsLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem("accessToken");

      const { data } = await axios.get<MyProfileResponse>(
        `${API_BASE_URL}/profile/me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return data.data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to load profile.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { getMyProfile, isLoading, error };
}

export function useProfileById() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProfileById = async (profileId: string | number): Promise<MyProfile> => {
    setIsLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem("accessToken");

      const { data } = await axios.get<MyProfileResponse>(
        `${API_BASE_URL}/profile/${profileId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return data.data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Profile not found.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { getProfileById, isLoading, error };
}