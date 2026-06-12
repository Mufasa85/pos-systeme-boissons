"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ApiError,
  Cashier,
  getStoredToken,
  loginRequest,
  setStoredToken,
} from "@/lib/api";

// ============================================================
// AuthProvider — single source of truth for the connected
// cashier. The token is persisted in localStorage so that
// a hard refresh keeps the user logged in.
// ============================================================

interface AuthContextValue {
  cashier: Cashier | null;
  token: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (code: string, password: string) => Promise<Cashier>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CASHIER_STORAGE_KEY = "pos-brikin:auth-cashier";

function readPersistedCashier(): Cashier | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CASHIER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Cashier;
  } catch {
    return null;
  }
}

function writePersistedCashier(c: Cashier | null) {
  if (typeof window === "undefined") return;
  if (c) window.localStorage.setItem(CASHIER_STORAGE_KEY, JSON.stringify(c));
  else window.localStorage.removeItem(CASHIER_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // On the very first render we don't know if a valid token
  // exists. We mark the status as `loading` and synchronise
  // the auth state in a `useEffect` so SSR and the first
  // client render agree.
  const [cashier, setCashier] = useState<Cashier | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  useEffect(() => {
    const t = getStoredToken();
    const c = readPersistedCashier();
    if (t && c) {
      setToken(t);
      setCashier(c);
      setStatus("authenticated");
    } else {
      setStatus("unauthenticated");
    }
  }, []);

  const login = useCallback(async (code: string, password: string) => {
    try {
      const result = await loginRequest(code, password);
      setStoredToken(result.token);
      writePersistedCashier(result.cashier);
      setToken(result.token);
      setCashier(result.cashier);
      setStatus("authenticated");
      return result.cashier;
    } catch (err) {
      // Make sure no stale credentials remain on failure.
      setStoredToken(null);
      writePersistedCashier(null);
      setToken(null);
      setCashier(null);
      setStatus("unauthenticated");
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        err instanceof Error ? err.message : "Login failed",
        0,
      );
    }
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    writePersistedCashier(null);
    setToken(null);
    setCashier(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ cashier, token, status, login, logout }),
    [cashier, token, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Convenience hook: returns true once we've finished checking
 * the persisted session on the client. While the auth provider
 * is still hydrating, components can render a loader to avoid
 * flashing the login page for already-authenticated users.
 */
export function useAuthReady() {
  const { status } = useAuth();
  return status !== "loading";
}
