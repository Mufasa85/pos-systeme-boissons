"use client"

import Image from "next/image"
import { Plus } from "lucide-react"
import { useState } from "react"
import type { Drink } from "@/lib/types"
import { cn } from "@/lib/utils"

export function DrinkCard({
  drink,
  inCartQty = 0,
  onAdd,
}: {
  drink: Drink
  inCartQty?: number
  onAdd?: (drink: Drink, size: string) => void
}) {
  const sizes = drink.sizes ?? []
  const [size, setSize] = useState(sizes.length ? sizes[Math.min(1, sizes.length - 1)] : "")
  const lowStock = drink.stock <= 15
  const isSimple = typeof onAdd !== "function"

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
            Low stock
          </span>
        )}
      </div>

      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold leading-tight">
            {drink.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{drink.category}</p>
        </div>
        <span className="brand-text text-base font-bold">${drink.price.toFixed(2)}</span>
      </div>

      {/* description removed from card per request */}

      <div className="mt-auto flex items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            lowStock
              ? "bg-destructive/10 text-destructive"
              : "bg-emerald-500/10 text-emerald-600",
          )}
        >
          {drink.stock} in stock
        </span>

        {!isSimple && sizes.length > 1 && (
          <span className="rounded-full bg-muted/80 px-3 py-1 text-xs text-muted-foreground">
            {size}
          </span>
        )}
      </div>

      {!isSimple && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={cn(
                  "h-9 min-w-[2.5rem] rounded-xl px-3 text-xs font-medium transition-colors",
                  size === s
                    ? "brand-soft"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={drink.stock <= 0}
            onClick={() => onAdd?.(drink, size || sizes[0] || "")}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors",
              drink.stock <= 0
                ? "cursor-not-allowed bg-muted/50 text-muted-foreground opacity-70"
                : inCartQty && inCartQty > 0
                ? "brand-bg"
                : "bg-muted/70 text-foreground hover:brightness-95",
            )}
          >
            <Plus className="h-4 w-4" />
            {drink.stock <= 0
              ? "Out of stock"
              : inCartQty && inCartQty > 0
                ? `In cart · ${inCartQty}`
                : "Add to cart"}
          </button>
        </div>
      )}
    </div>
  )
}
