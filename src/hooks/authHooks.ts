import { useState } from "react";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export interface RegisterInitPayload {
  email: string;
  password: string;
  context: "REGISTER";
}

export interface RegisterInitResponse {
  success: boolean;
  message: string;
}

export interface RegisterVerifyPayload {
  name: string;
  email: string;
  otp: string;
  context: "REGISTER";
}

export interface RegisterVerifyResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  message: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
}

export function useRegisterInit() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerInit = async (
    email: string,
    password: string
  ): Promise<RegisterInitResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await axios.post<RegisterInitResponse>(
        `${API_BASE_URL}/auth/register/init`,
        {
          email,
          password,
          context: "REGISTER",
        } satisfies RegisterInitPayload
      );

      return data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to send verification code. Please try again.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { registerInit, isLoading, error };
}

export function useVerifyRegister() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyRegister = async (
    name: string,
    email: string,
    otp: string
  ): Promise<RegisterVerifyResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await axios.post<RegisterVerifyResponse>(
        `${API_BASE_URL}/auth/register/verify`,
        {
          name,
          email,
          otp,
          context: "REGISTER",
        } satisfies RegisterVerifyPayload
      );

      return data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Invalid OTP. Please try again.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { verifyRegister, isLoading, error };
}

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await axios.post<LoginResponse>(
        `${API_BASE_URL}/auth/login`,
        {
          email,
          password,
        } satisfies LoginPayload
      );

      return data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Invalid email or password. Please try again.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async (): Promise<LogoutResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem("accessToken");

      const { data } = await axios.post<LogoutResponse>(
        `${API_BASE_URL}/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Clear stored tokens regardless of response shape
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      return data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to logout. Please try again.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { logout, isLoading, error };
}

export function useSendResetOtp() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendResetOtp = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/register/init`,
        {
          email,
          context: "RESET",
        }
      );

      return data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to send reset code.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { sendResetOtp, isLoading, error };
}

export function useVerifyResetOtp() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyResetOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/register/verify`,
        {
          email,
          otp,
          context: "RESET",
        }
      );

      return data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Invalid reset code.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { verifyResetOtp, isLoading, error };
}

export function useResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = async (
    token: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/reset-password`,
        {
          token,
          newPassword,
          confirmPassword,
        }
      );

      return data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to reset password.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { resetPassword, isLoading, error };
}