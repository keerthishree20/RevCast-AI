"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface User {
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<(AuthState & AuthActions) | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("revcast_token");
    const storedUser = localStorage.getItem("revcast_user");
    if (stored && storedUser) {
      setToken(stored);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("revcast_token");
        localStorage.removeItem("revcast_user");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("revcast_token", data.token);
    localStorage.setItem("revcast_user", JSON.stringify(data.user));
  }, []);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Registration failed" }));
      throw new Error(err.detail || "Registration failed");
    }
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("revcast_token", data.token);
    localStorage.setItem("revcast_user", JSON.stringify(data.user));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("revcast_token");
    localStorage.removeItem("revcast_user");
  }, []);

  return (
    <AuthCtx.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
