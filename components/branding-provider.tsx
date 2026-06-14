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
import {
  ApiError,
  fetchBranding,
  resetBranding as apiResetBranding,
  updateBranding,
  type ApiBranding,
} from "@/lib/api";
import type { Branding } from "@/lib/types";

const defaultBranding: Branding = {
  companyName: "JOAC",
  tagline: "Specialty drinks & more",
  logoText: "J",
  logoImage: "",
  primaryColor: "#f6905f",
  secondaryColor: "#fdebe1",
};

/**
 * Full editable form for the branding / company-info panel.
 * Mirrors the columns of the server `Branding` model so the
 * settings dialog can persist every field (including the fiscal
 * info shown on the printed receipt).
 */
export interface BrandingForm extends Branding {
  idNat: string;
  rccm: string;
  taxNumber: string;
  address: string;
  phone: string;
  email: string;
}

interface BrandingContextValue {
  branding: BrandingForm;
  setBranding: (b: Partial<BrandingForm>) => void;
  /** Push the current local state to the server and refresh the
   *  cache on success. Resolves with the saved record. */
  saveBranding: () => Promise<BrandingForm>;
  /** Reset the local state and the server row to the factory defaults. */
  resetBranding: () => Promise<BrandingForm>;
  /** True while the initial GET /branding is in flight. */
  loading: boolean;
  /** True while a save / reset is in flight. */
  saving: boolean;
  /** Last error from the API (save / reset), or null. */
  error: string | null;
  /** Re-fetch from the server and replace the local state. */
  refresh: () => Promise<void>;
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

function apiBrandingToLocal(api: ApiBranding): BrandingForm {
  return {
    companyName: api.companyName,
    tagline: api.tagline,
    logoText: api.logoText,
    logoImage: api.logoImage ?? "",
    primaryColor: api.primaryColor,
    secondaryColor: api.secondaryColor,
    idNat: api.idNat,
    rccm: api.rccm,
    taxNumber: api.taxNumber,
    address: api.address,
    phone: api.phone,
    email: api.email,
  };
}

function localToApiPayload(b: BrandingForm): Partial<ApiBranding> {
  return {
    companyName: b.companyName,
    tagline: b.tagline,
    logoText: b.logoText,
    logoImage: b.logoImage || null,
    primaryColor: b.primaryColor,
    secondaryColor: b.secondaryColor,
    idNat: b.idNat,
    rccm: b.rccm,
    taxNumber: b.taxNumber,
    address: b.address,
    phone: b.phone,
    email: b.email,
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  // Start with the bundled default so SSR / first paint is stable.
  const [branding, setBrandingState] = useState<BrandingForm>({
    ...defaultBranding,
    idNat: "",
    rccm: "",
    taxNumber: "",
    address: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setBranding = useCallback((b: Partial<BrandingForm>) => {
    setBrandingState((prev) => ({ ...prev, ...b }));
  }, []);

  // Pull the official branding from the API on mount, then apply
  // the user's local overrides (if any) on top. This way the
  // company name, address, ID Nat, etc. shown in invoices are
  // always the ones stored in the database, not hard-coded mocks.
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const api = await fetchBranding();
      setBrandingState(apiBrandingToLocal(api));
      setError(null);
    } catch (err) {
      // Silent fallback to the bundled default if the API is
      // unreachable (e.g. during a network blip at boot).
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Impossible de charger le branding",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveBranding = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateBranding(localToApiPayload(branding));
      const next = apiBrandingToLocal(saved);
      setBrandingState(next);
      return next;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Impossible d'enregistrer le branding";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [branding]);

  const resetBranding = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await apiResetBranding();
      const next = apiBrandingToLocal(saved);
      setBrandingState(next);
      return next;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Impossible de réinitialiser le branding";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
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
    () => ({
      branding,
      setBranding,
      saveBranding,
      resetBranding,
      loading,
      saving,
      error,
      refresh,
    }),
    [
      branding,
      setBranding,
      saveBranding,
      resetBranding,
      loading,
      saving,
      error,
      refresh,
    ],
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
