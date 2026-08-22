import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { apiClient } from "../../lib/api-client";
import { authApi, type LoginCredentials } from "../../lib/auth";
import type { User } from "../../types";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./auth-context";

interface AuthProviderProps extends PropsWithChildren {
  initializeSession?: boolean;
}

export function AuthProvider({ children, initializeSession = true }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(
    initializeSession ? "initializing" : "unauthenticated",
  );
  const [user, setUser] = useState<User | null>(null);

  const clearSession = useCallback(() => {
    apiClient.setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    apiClient.onSessionExpired(clearSession);
    return () => apiClient.onSessionExpired(null);
  }, [clearSession]);

  useEffect(() => {
    if (!initializeSession) return;
    let active = true;
    void authApi
      .restore()
      .then((result) => {
        if (active) {
          setUser(result.user);
          setStatus("authenticated");
        }
      })
      .catch(() => {
        if (active) clearSession();
      });
    return () => {
      active = false;
    };
  }, [clearSession, initializeSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await authApi.login(credentials);
    setUser(result.user);
    setStatus("authenticated");
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refresh = useCallback(async () => {
    const result = await authApi.restore();
    setUser(result.user);
    setStatus("authenticated");
    return result.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout, refresh }),
    [status, user, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
