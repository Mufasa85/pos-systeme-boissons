"use client";

import { useEffect, useState } from "react";

import {
  ApiCategory,
  ApiProduct,
  fetchCategories,
  fetchProducts,
} from "@/lib/api";
import type { Category, Drink } from "@/lib/types";

// ============================================================
// useCatalog — single source of truth for the product / category
// catalog. Fetches both lists from the API on first mount, caches
// them in module-level state, and exposes the data in BOTH:
//   • the raw API shape (apiProducts) for stock / admin screens
//   • the local mapped shape (drinks / categories) for the POS
// ============================================================

const ALL_CATEGORY: Category = { id: "all", label: "All" };

interface CatalogState {
  categories: Category[];
  apiCategories: ApiCategory[];
  drinks: Drink[];
  apiProducts: ApiProduct[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
}

type CachedCatalog = {
  categories: Category[];
  apiCategories: ApiCategory[];
  apiProducts: ApiProduct[];
  drinks: Drink[];
  loaded: true;
};

let cache: CachedCatalog | null = null;
let inflight: Promise<void> | null = null;
const subscribers = new Set<(s: CatalogState) => void>();

function notify(state: CatalogState) {
  for (const cb of subscribers) cb(state);
}

function setState(partial: Partial<CatalogState>) {
  const next: CatalogState = {
    categories: cache?.categories ?? [],
    apiCategories: cache?.apiCategories ?? [],
    apiProducts: cache?.apiProducts ?? [],
    drinks: cache?.drinks ?? [],
    loading: false,
    error: null,
    loaded: !!cache,
    ...partial,
  };
  notify(next);
}

async function loadFromApi() {
  setState({ loading: true, error: null });
  try {
    const [apiCategories, apiProducts] = await Promise.all([
      fetchCategories(),
      fetchProducts({ limit: 200 }),
    ]);
    const apiProductsList = apiProducts.rows;
    cache = {
      categories: mapCategories(apiCategories),
      apiCategories,
      apiProducts: apiProductsList,
      drinks: apiProductsList.map(mapProduct),
      loaded: true,
    };
    setState({ loading: false, error: null, loaded: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Impossible de charger le catalogue";
    setState({ loading: false, error: message });
  }
}

function ensureLoaded() {
  if (cache) return Promise.resolve();
  if (inflight) return inflight;
  inflight = loadFromApi().finally(() => {
    inflight = null;
  });
  return inflight;
}

// ---------- Mappers (API → local types) ----------

function mapCategories(api: ApiCategory[]): Category[] {
  const real = api
    .map((c) => ({ id: c.slug as Category["id"], label: c.label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [ALL_CATEGORY, ...real];
}

function mapProduct(p: ApiProduct): Drink {
  const price = typeof p.price === "string" ? parseFloat(p.price) : p.price;
  const sizes = p.sizes?.map((s) => s.label);
  return {
    id: String(p.id),
    name: p.name,
    description: p.description ?? "",
    price: Number.isFinite(price) ? (price as number) : 0,
    category: ((p.category?.slug ?? "") as unknown) as Drink["category"],
    image: p.imageUrl || "/drinks/placeholder.png",
    stock: p.stockQuantity ?? 0,
    popularity: p.popularity ?? 0,
    ...(sizes && sizes.length ? { sizes } : {}),
  };
}

// ---------- Hook ----------

export function useCatalog(): CatalogState & { refetch: () => void } {
  const [state, setLocal] = useState<CatalogState>(() => ({
    categories: cache?.categories ?? [],
    apiCategories: cache?.apiCategories ?? [],
    apiProducts: cache?.apiProducts ?? [],
    drinks: cache?.drinks ?? [],
    loading: !cache,
    error: null,
    loaded: !!cache,
  }));

  useEffect(() => {
    const cb = (s: CatalogState) => setLocal(s);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  useEffect(() => {
    if (!cache) {
      ensureLoaded();
    }
  }, []);

  return {
    ...state,
    refetch: () => {
      cache = null;
      ensureLoaded();
    },
  };
}
