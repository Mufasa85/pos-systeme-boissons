"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ============================================================
// MobileSidebarContext
//
// Shared state for the slide-in sidebar drawer. The sidebar
// (in `sidebar.tsx`) reads `open` to know whether it should be
// visible on small screens, and the topbar exposes a burger
// button that calls `toggle()` / `setOpen()`.
//
// On `lg` screens and above the sidebar is rendered in the
// normal flex flow and the context is essentially a no-op.
// ============================================================

interface MobileSidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(
  null,
);

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
  }, []);

  const toggle = useCallback(() => {
    setOpenState((prev) => !prev);
  }, []);

  // Lock body scroll while the drawer is open on mobile so the
  // page underneath doesn't scroll.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenState(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-close when the viewport grows past the `lg` breakpoint.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1024px)");
    function onChange(e: MediaQueryListEvent) {
      if (e.matches) setOpenState(false);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const value = useMemo<MobileSidebarContextValue>(
    () => ({ open, setOpen, toggle }),
    [open, setOpen, toggle],
  );

  return (
    <MobileSidebarContext.Provider value={value}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx)
    throw new Error(
      "useMobileSidebar must be used within MobileSidebarProvider",
    );
  return ctx;
}
