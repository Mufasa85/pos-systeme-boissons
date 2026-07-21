"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import type { Drink } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

export function DrinkCard({
  drink,
  inCartQty = 0,
  onAdd,
}: {
  drink: Drink;
  inCartQty?: number;
  onAdd?: (drink: Drink, size: string) => void;
}) {
  const lowStock = drink.stock <= 15;
  // Size selector (L / M / S, etc.) was removed from the card: each
  // product is now added to the cart with an empty size, and the
  // unit price is the single base price coming from the catalog.
  const isSimple = typeof onAdd !== "function";

  return (
    <div className="glass flex min-h-[18rem] flex-col rounded-3xl p-4 transition-shadow hover:shadow-lg">
      <div className="relative mb-4 flex h-32 items-center justify-center overflow-hidden rounded-3xl bg-muted/50">
        <Image
          src={drink.image || "/placeholder.svg"}
          alt={drink.name}
          width={160}
          height={160}
          className="h-full w-auto object-contain transition-transform duration-300 hover:scale-105"
        />
        {lowStock && (
          <span className="absolute left-3 top-3 rounded-full bg-destructive/90 px-2.5 py-1 text-[10px] font-semibold text-white">
            Stock bas
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-col items-start gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold leading-tight">
            {drink.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{drink.category}</p>
          {/* Price moves below name/category on small screens */}
          <span className="brand-text mt-1 block text-base font-bold tabular-nums sm:hidden">
            {formatPrice(drink.price)}
          </span>
        </div>
        {/* All customer-facing prices are displayed in Congolese
            Francs. The amount is taken from the catalog (drink.price
            is already in FC), and formatted with the FC suffix. */}
        <span className="brand-text hidden shrink-0 text-base font-bold tabular-nums sm:inline">
          {formatPrice(drink.price)}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            lowStock
              ? "bg-destructive/10 text-destructive"
              : "bg-emerald-500/10 text-emerald-600",
          )}
        >
          {drink.stock} en stock
        </span>
      </div>

      {!isSimple && (
        <button
          type="button"
          disabled={drink.stock <= 0}
          onClick={() => onAdd?.(drink, "")}
          className={cn(
            "mt-4 flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors",
            drink.stock <= 0
              ? "cursor-not-allowed bg-muted/50 text-muted-foreground opacity-70"
              : inCartQty && inCartQty > 0
                ? "brand-bg"
                : "bg-muted/70 text-foreground hover:brightness-95",
          )}
        >
          <Plus className="h-4 w-4" />
          {drink.stock <= 0
            ? "Rupture de stock"
            : inCartQty && inCartQty > 0
              ? `Au panier · ${inCartQty}`
              : "Ajouter au panier"}
        </button>
      )}
    </div>
  );
}
