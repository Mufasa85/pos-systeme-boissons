"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { Branding } from "@/lib/types"

const defaultBranding: Branding = {
  companyName: "Purr Coffee",
  tagline: "Specialty drinks & more",
  logoText: "Purr",
  logoImage: "",
  primaryColor: "#f6905f",
  secondaryColor: "#fdebe1",
}

interface BrandingContextValue {
  branding: Branding
  setBranding: (b: Partial<Branding>) => void
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

/** Pick a readable foreground (black/white) for a given hex background. */
function readableForeground(hex: string): string {
  const c = hex.replace("#", "")
  const full =
    c.length === 3
      ? c
          .split("")
          .map((x) => x + x)
          .join("")
      : c
  const r = Number.parseInt(full.slice(0, 2), 16)
  const g = Number.parseInt(full.slice(2, 4), 16)
  const b = Number.parseInt(full.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff"
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBrandingState] = useState<Branding>(defaultBranding)

  const setBranding = useCallback((b: Partial<Branding>) => {
    setBrandingState((prev) => ({ ...prev, ...b }))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--brand", branding.primaryColor)
    root.style.setProperty(
      "--brand-foreground",
      readableForeground(branding.primaryColor),
    )
    root.style.setProperty("--brand-secondary", branding.secondaryColor)

    // Persist branding to localStorage so user settings survive reloads.
    try {
      localStorage.setItem("branding", JSON.stringify(branding))
    } catch (e) {
      // ignore
    }
  }, [branding])

  // Load persisted branding on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("branding")
      if (raw) {
        const parsed = JSON.parse(raw)
        setBrandingState((prev) => ({ ...prev, ...parsed }))
      }
    } catch (e) {
      // ignore
    }
  }, [])

  const value = useMemo(() => ({ branding, setBranding }), [branding, setBranding])

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  )
}

export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider")
  return ctx
}
