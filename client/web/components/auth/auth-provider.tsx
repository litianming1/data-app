"use client";

import { apiFetch } from "@/lib/api";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthUser = {
  email: string;
  id: string;
  name: string;
  role: string;
};

type AuthContextValue = {
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  user: AuthUser | null;
};

type AuthSessionResponse = {
  user: AuthUser;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readAuthResponse(response: Response) {
  if (response.ok) {
    return;
  }

  let message = "认证请求失败";
  try {
    const payload = (await response.json()) as { detail?: string };
    message = payload.detail || message;
  } catch {
    // Keep the generic message when the response is not JSON.
  }

  throw new Error(message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const response = await apiFetch("/api/auth/me");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as AuthSessionResponse;
        if (isMounted) {
          setUser(payload.user);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiFetch("/api/auth/login", {
      body: JSON.stringify({ email, password }),
      method: "POST",
    });

    await readAuthResponse(response);
    const payload = (await response.json()) as AuthSessionResponse;
    setUser(payload.user);
    return payload.user;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ isLoading, login, logout, user }),
    [isLoading, login, logout, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}