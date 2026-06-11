"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { PosShell } from "@/components/pos-shell"
import { DrinkCard } from "@/components/drink-card"
import { CategoryTabs } from "@/components/category-tabs"
import { drinks } from "@/lib/data"
import type { CategoryId, Drink } from "@/lib/types"

export default function MenuPage() {
  const [category, setCategory] = useState<CategoryId>("all")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    return drinks.filter((d) => {
      const matchesCat = category === "all" || d.category === category
      const q = query.trim().toLowerCase()
      const matchesQuery = q === "" || d.name.toLowerCase().includes(q)
      return matchesCat && matchesQuery
    })
  }, [category, query])

  return (
    <PosShell active="menu" title="Menu">
      <div className="glass rounded-3xl p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CategoryTabs active={category} onChange={setCategory} />
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
              placeholder="Search drinks..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.length > 0 ? (
          filtered.map((drink: Drink) => <DrinkCard key={drink.id} drink={drink} />)
        ) : (
          <div className="glass col-span-full rounded-3xl p-8 text-center text-sm text-muted-foreground">
            Aucun produit ne correspond à votre recherche.
          </div>
        )}
      </div>
    </PosShell>
  )
}

