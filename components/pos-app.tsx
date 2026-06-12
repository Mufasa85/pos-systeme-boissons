"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnalyticsBar } from "@/components/analytics-bar"
import { BrandingDialog } from "@/components/branding-dialog"
import { CartPanel } from "@/components/cart-panel"
import { CategoryTabs } from "@/components/category-tabs"
import { DrinkCard } from "@/components/drink-card"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { drinks } from "@/lib/data"
import type { CartItem, CategoryId, Drink } from "@/lib/types"

export function PosApp() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState("pos")
  const [category, setCategory] = useState<CategoryId>("all")
  const [query, setQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)

  const filtered = useMemo(() => {
    return drinks.filter((d) => {
      const matchesCat = category === "all" || d.category === category
      const matchesQuery =
        query.trim() === "" ||
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.description.toLowerCase().includes(query.toLowerCase())
      return matchesCat && matchesQuery
    })
  }, [category, query])

  function addToCart(drink: Drink, size: string) {
    // Bloque l'ajout si le stock est vide
    if (drink.stock <= 0) return

    setCart((prev) => {
      const existing = prev.find(
        (i) => i.drink.id === drink.id && i.size === size,
      )

      if (existing) {
        return prev.map((i) =>
          i.drink.id === drink.id && i.size === size
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        )
      }

      return [...prev, { drink, size, quantity: 1 }]
    })
  }

  function changeQty(id: string, size: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.drink.id === id && i.size === size
            ? { ...i, quantity: i.quantity + delta }
            : i,
        )
        .filter((i) => i.quantity > 0),
    )
  }

  function removeItem(id: string, size: string) {
    setCart((prev) => prev.filter((i) => !(i.drink.id === id && i.size === size)))
  }

  function qtyInCart(id: string) {
    return cart
      .filter((i) => i.drink.id === id)
      .reduce((s, i) => s + i.quantity, 0)
  }

  function handleNavChange(id: string) {
    setActiveNav(id)

    const nextPath =
      id === "pos"
        ? "/"
        : id === "dashboard"
        ? "/dashboard"
        : id === "menu"
        ? "/menu"
        : id === "stock"
        ? "/stock"
        : id === "reports"
        ? "/reports"
        : "/history"

    router.push(nextPath)
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        active={activeNav}
        onChange={handleNavChange}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:pl-0 overflow-hidden">
        <Topbar
          query={query}
          onQueryChange={setQuery}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenSidebarMobile={() => {}}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden xl:flex-row">
          {/* Main / menu column */}
          <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <AnalyticsBar />

              <CategoryTabs active={category} onChange={setCategory} />

              <div className="flex items-baseline justify-between">
                <h1 className="text-lg font-bold">Drinks menu</h1>
                <span className="text-sm text-muted-foreground">
                  {filtered.length} items
                </span>
              </div>

              {filtered.length === 0 ? (
                <div className="glass flex min-h-[360px] items-center justify-center rounded-3xl p-10 text-sm text-muted-foreground">
                  No drinks match your search.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
                  {filtered.map((drink) => (
                    <DrinkCard
                      key={drink.id}
                      drink={drink}
                      inCartQty={qtyInCart(drink.id)}
                      onAdd={addToCart}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* Cart column */}
          <CartPanel
            items={cart}
            onQty={changeQty}
            onRemove={removeItem}
            onClear={() => setCart([])}
          />
        </div>
      </div>

      <BrandingDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
