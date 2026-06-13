"use client";

import { useEffect, useState } from "react";

import { ApiBranding, fetchBranding } from "@/lib/api";

// ============================================================
// useFiscalInfo — fetches the company fiscal details (ID Nat,
// RCCM, address, etc.) from the API. Independent of the visual
// `Branding` context so a user-customised logo / color never
// overwrites the official invoice header.
// ============================================================

interface FiscalState {
  data: ApiBranding | null;
  loading: boolean;
  error: string | null;
}

let cache: ApiBranding | null = null;
let inflight: Promise<void> | null = null;
const subscribers = new Set<(s: FiscalState) => void>();

function notify(s: FiscalState) {
  for (const cb of subscribers) cb(s);
}

async function load() {
  notify({ data: cache, loading: true, error: null });
  try {
    const api = await fetchBranding();
    cache = api;
    notify({ data: api, loading: false, error: null });
  } catch (err) {
    notify({
      data: cache,
      loading: false,
      error: err instanceof Error ? err.message : "Erreur de chargement",
    });
  }
}

function ensureLoaded() {
  if (cache) return Promise.resolve();
  if (inflight) return inflight;
  inflight = load().finally(() => {
    inflight = null;
  });
  return inflight;
}

export function useFiscalInfo(): FiscalState & { refetch: () => void } {
  const [state, setState] = useState<FiscalState>(() => ({
    data: cache,
    loading: !cache,
    error: null,
  }));

  useEffect(() => {
    const cb = (s: FiscalState) => setState(s);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  useEffect(() => {
    if (!cache) ensureLoaded();
  }, []);

  return {
    ...state,
    refetch: () => {
      cache = null;
      ensureLoaded();
    },
  };
}
