"use client"

import Image from "next/image"
import {
  Banknote,
  CreditCard,
  Minus,
  Plus,
  Smartphone,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import type { CartItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Discount feature removed

const TAX_RATE = 0.05

const paymentMethods = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "mobile", label: "Mobile", icon: Smartphone },
]

export function CartPanel({
  items,
  onQty,
  onRemove,
  onClear,
}: {
  items: CartItem[]
  onQty: (id: string, size: string, delta: number) => void
  onRemove: (id: string, size: string) => void
  onClear: () => void
}) {
  const [payment, setPayment] = useState("card")
  const [placed, setPlaced] = useState(false)

  const subtotal = items.reduce((s, i) => s + i.drink.price * i.quantity, 0)
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax

  function placeOrder() {
    setPlaced(true)
    setTimeout(() => {
      setPlaced(false)
      onClear()
    }, 1400)
  }

  return (
    <aside className="flex w-full flex-col lg:w-[24rem] lg:shrink-0">
      <div className="glass-strong flex h-full flex-col rounded-3xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Current Order</h2>
            <p className="text-xs text-muted-foreground">
              #{(3243).toString()} · {items.length} items
            </p>
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 rounded-xl px-2 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Order mode removed */}

        {/* Items */}
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="flex h-full min-h-40 flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <div className="brand-soft mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
                <Plus className="h-6 w-6" />
              </div>
              Your cart is empty.
              <br />
              Tap a drink to add it.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.drink.id}-${item.size}`}
                className="flex items-center gap-3 rounded-2xl bg-muted/40 p-2"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card">
                  <Image
                    src={item.drink.image || "/placeholder.svg"}
                    alt={item.drink.name}
                    width={48}
                    height={48}
                    className="h-12 w-auto object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {item.drink.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Size {item.size} · ${item.drink.price.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onQty(item.drink.id, item.size, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-card text-foreground transition-colors hover:bg-muted"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onQty(item.drink.id, item.size, 1)}
                    className="brand-bg flex h-7 w-7 items-center justify-center rounded-lg"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item.drink.id, item.size)}
                    className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount removed */}

        {/* Totals */}
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-medium text-foreground">
              ${subtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax (5%)</span>
            <span className="font-medium text-foreground">${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Total</span>
            <span className="brand-text">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {paymentMethods.map((m) => {
            const Icon = m.icon
            const isActive = payment === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPayment(m.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-medium transition-colors",
                  isActive ? "brand-soft brand-ring" : "bg-muted/60 text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {m.label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          disabled={items.length === 0}
          onClick={placeOrder}
          className={cn(
            "brand-bg mt-4 flex h-12 items-center justify-center rounded-2xl text-sm font-bold transition-opacity disabled:opacity-40",
          )}
        >
          {placed ? "Order placed!" : `Place order · $${total.toFixed(2)}`}
        </button>
      </div>
    </aside>
  )
}
