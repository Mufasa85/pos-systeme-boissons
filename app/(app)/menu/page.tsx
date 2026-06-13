"use client";

import { useMemo, useState } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { PosShell } from "@/components/pos-shell";
import { CategoryTabs } from "@/components/category-tabs";
import { DrinkCard } from "@/components/drink-card";
import { useCatalog } from "@/lib/use-catalog";
import type { CategoryId, Drink } from "@/lib/types";

export default function MenuPage() {
  const { drinks, categories, loading, error, refetch } = useCatalog();
  const [category, setCategory] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return drinks.filter((d) => {
      const matchesCat = category === "all" || d.category === category;
      const q = query.trim().toLowerCase();
      const matchesQuery = q === "" || d.name.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [drinks, category, query]);

  return (
    <PosShell active="menu" title="Menu">
      <div className="glass rounded-3xl p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CategoryTabs
            categories={categories}
            active={category}
            onChange={setCategory}
          />
          <div className="text-sm text-muted-foreground">
            {filtered.length} item{filtered.length > 1 ? "s" : ""}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="menu-search" className="sr-only">
            Search drinks
          </label>
          <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-3 py-2">
            <input
              id="menu-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une boisson..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="glass mt-4 flex flex-col items-center gap-3 rounded-3xl p-10 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-semibold text-foreground">
            Catalogue indisponible
          </p>
          <p className="max-w-sm">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer
          </button>
        </div>
      ) : loading && drinks.length === 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass h-56 animate-pulse rounded-3xl"
              aria-hidden
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.length > 0 ? (
            filtered.map((drink: Drink) => (
              <DrinkCard key={drink.id} drink={drink} />
            ))
          ) : (
            <div className="glass col-span-full rounded-3xl p-8 text-center text-sm text-muted-foreground">
              Aucun produit ne correspond à votre recherche.
              {loading ? (
                <Loader2 className="mx-auto mt-2 h-4 w-4 animate-spin" />
              ) : null}
            </div>
          )}
        </div>
      )}
    </PosShell>
  );
}
