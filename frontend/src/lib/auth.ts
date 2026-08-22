import { apiClient } from "./api-client";
import type { TokenResponse, User } from "../types";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpInput {
  employee_id: string;
  full_name: string;
  email: string;
  password: string;
  role: "EMPLOYEE";
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const result = await apiClient.request<TokenResponse>("/auth/login", {
      method: "POST",
      body: credentials,
      skipAuthRenewal: true,
    });
    apiClient.setAccessToken(result.access_token);
    return result;
  },

  restore: () => apiClient.refreshSession(),

  me: () => apiClient.request<User>("/auth/me"),

  signup: (input: SignUpInput) =>
    apiClient.request<User>("/auth/signup", {
      method: "POST",
      body: input,
      skipAuthRenewal: true,
    }),

  verifyEmail: (token: string) =>
    apiClient.request<{ detail: string }>("/auth/verify-email", {
      method: "POST",
      body: { token },
      skipAuthRenewal: true,
    }),

  forgotPassword: (email: string) =>
    apiClient.request<{ detail: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
      skipAuthRenewal: true,
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.request<{ detail: string }>("/auth/reset-password", {
      method: "POST",
      body: { token, new_password: newPassword },
      skipAuthRenewal: true,
    }),

  async logout(): Promise<void> {
    try {
      await apiClient.request<void>("/auth/logout", {
        method: "POST",
        skipAuthRenewal: true,
      });
    } finally {
      apiClient.setAccessToken(null);
    }
  },
};
