"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, X } from "lucide-react";
import { AnalyticsBar } from "@/components/analytics-bar";
import { BrandingDialog } from "@/components/branding-dialog";
import { CartPanel } from "@/components/cart-panel";
import { CategoryTabs } from "@/components/category-tabs";
import { DrinkCard } from "@/components/drink-card";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { drinks } from "@/lib/data";
import type { CartItem, CategoryId, Drink } from "@/lib/types";

export function PosApp() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("pos");
  const [category, setCategory] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    return drinks.filter((d) => {
      const matchesCat = category === "all" || d.category === category;
      const matchesQuery =
        query.trim() === "" ||
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.description.toLowerCase().includes(query.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [category, query]);

  function addToCart(drink: Drink, size: string) {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.drink.id === drink.id && i.size === size,
      );
      if (existing) {
        return prev.map((i) =>
          i.drink.id === drink.id && i.size === size
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...prev, { drink, size, quantity: 1 }];
    });
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
    );
  }

  function removeItem(id: string, size: string) {
    setCart((prev) =>
      prev.filter((i) => !(i.drink.id === id && i.size === size)),
    );
  }

  function qtyInCart(id: string) {
    return cart
      .filter((i) => i.drink.id === id)
      .reduce((s, i) => s + i.quantity, 0);
  }

  function handleNavChange(id: string) {
    setActiveNav(id);

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
                : "/history";

    router.push(nextPath);
  }

  // Cart stats for the floating button badge
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

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
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden xl:flex-row">
          {/* Main / menu column */}
          <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
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

          {/* Inline cart column — xl+ only */}
          <div className="hidden xl:flex xl:w-[24rem] xl:shrink-0">
            <CartPanel
              items={cart}
              onQty={changeQty}
              onRemove={removeItem}
              onClear={() => setCart([])}
            />
          </div>
        </div>
      </div>

      {/* Floating cart button — small screens only */}
      <button
        type="button"
        onClick={() => setCartSheetOpen(true)}
        aria-label={`Voir le panier (${cartCount} article${cartCount > 1 ? "s" : ""})`}
        className={cn(
          "fixed bottom-4 right-4 z-30 flex h-14 items-center gap-2.5 rounded-full border border-border/60 bg-background/90 pr-5 pl-3 shadow-2xl backdrop-blur transition-transform hover:scale-105 active:scale-95 xl:hidden",
        )}
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full brand-bg text-brand-foreground shadow-md">
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
              {cartCount}
            </span>
          ) : null}
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Panier
          </span>
          <span className="text-sm font-bold">
            {cartCount > 0
              ? `${cartCount} article${cartCount > 1 ? "s" : ""}`
              : "Voir"}
          </span>
        </span>
      </button>

      {/* Mobile cart sheet — opens on top of everything */}
      <Dialog open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <DialogContent
          showCloseButton={false}
          className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 p-0 sm:max-w-md sm:rounded-3xl sm:border sm:h-[90vh] sm:max-h-[90vh]"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Panier</DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setCartSheetOpen(false)}
            aria-label="Fermer le panier"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/60 text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
          <CartPanel
            items={cart}
            onQty={changeQty}
            onRemove={removeItem}
            onClear={() => setCart([])}
          />
        </DialogContent>
      </Dialog>

      <BrandingDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
