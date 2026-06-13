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
import { fetchBranding, type ApiBranding } from "@/lib/api";
import type { Branding } from "@/lib/types";

const defaultBranding: Branding = {
  companyName: "JOAC",
  tagline: "Specialty drinks & more",
  logoText: "J",
  logoImage: "",
  primaryColor: "#f6905f",
  secondaryColor: "#fdebe1",
};

interface BrandingContextValue {
  branding: Branding;
  setBranding: (b: Partial<Branding>) => void;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

/** Pick a readable foreground (black/white) for a given hex background. */
function readableForeground(hex: string): string {
  const c = hex.replace("#", "");
  const full =
    c.length === 3
      ? c
          .split("")
          .map((x) => x + x)
          .join("")
      : c;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}

function apiBrandingToLocal(api: ApiBranding): Branding {
  return {
    companyName: api.companyName,
    tagline: api.tagline,
    logoText: api.logoText,
    logoImage: api.logoImage ?? "",
    primaryColor: api.primaryColor,
    secondaryColor: api.secondaryColor,
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  // Start with the bundled default so SSR / first paint is stable.
  const [branding, setBrandingState] = useState<Branding>(defaultBranding);

  const setBranding = useCallback((b: Partial<Branding>) => {
    setBrandingState((prev) => ({ ...prev, ...b }));
  }, []);

  // Pull the official branding from the API on mount, then apply
  // the user's local overrides (if any) on top. This way the
  // company name, address, ID Nat, etc. shown in invoices are
  // always the ones stored in the database, not hard-coded mocks.
  useEffect(() => {
    let cancelled = false;
    fetchBranding()
      .then((api) => {
        if (cancelled) return;
        setBrandingState(apiBrandingToLocal(api));
      })
      .catch(() => {
        // Silent fallback to the bundled default if the API is
        // unreachable (e.g. during a network blip at boot).
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist the live value so subsequent mount can use it.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--brand", branding.primaryColor);
    root.style.setProperty(
      "--brand-foreground",
      readableForeground(branding.primaryColor),
    );
    root.style.setProperty("--brand-secondary", branding.secondaryColor);
  }, [branding]);

  const value = useMemo<BrandingContextValue>(
    () => ({ branding, setBranding }),
    [branding, setBranding],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
}
