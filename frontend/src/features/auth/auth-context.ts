import { createContext } from "react";

import type { LoginCredentials } from "../../lib/auth";
import type { User } from "../../types";

export type AuthStatus = "initializing" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<User>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
