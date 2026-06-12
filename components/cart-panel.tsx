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
import { useEffect, useState } from "react"
import type { CartItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Discount feature removed

const TAX_RATE = 0.05
const FX_RATE = 2289.3077

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
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [placed, setPlaced] = useState(false)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const subtotal = items.reduce((s, i) => s + i.drink.price * i.quantity, 0)
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax
  const usdTotal = total / FX_RATE

  // During SSR and the first client render (before effects run) we force
  // the UI to represent an empty cart to avoid hydration mismatches.
  const isEmpty = mounted ? items.length === 0 : true

  function openInvoice() {
    setInvoiceOpen(true)
  }

  function confirmInvoice() {
    setInvoiceOpen(false)
    setPlaced(true)
    onClear()
    setTimeout(() => {
      setPlaced(false)
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
          disabled={isEmpty}
          onClick={openInvoice}
          className={cn(
            "brand-bg mt-4 flex h-12 items-center justify-center rounded-2xl text-sm font-bold transition-opacity disabled:opacity-40",
          )}
        >
          {placed ? "Facture validée" : `Valider la facture · $${(isEmpty ? 0 : total).toFixed(2)}`}
        </button>

        <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
          <DialogContent className="max-w-[22rem] max-h-[calc(100vh-2rem)] rounded-[2rem] bg-zinc-50 p-3 text-zinc-900 shadow-2xl ring-1 ring-zinc-200">
            <div className="relative h-full overflow-hidden rounded-[2rem] border border-dashed border-zinc-300 bg-white px-4 py-4 text-[0.72rem] shadow-sm sm:max-h-[calc(100vh-4rem)]">
              <div className="absolute inset-x-0 top-0 h-8 bg-zinc-100 bg-[repeating-linear-gradient(90deg,#f8fafc_0_8px,transparent_8px_16px)]" />
              <div className="relative space-y-3 text-center">
                <p className="text-[0.68rem] uppercase tracking-[0.3em] text-zinc-500">Point de vente</p>
                <p className="text-base font-bold uppercase">BRIKIN</p>
                <p className="text-[0.75rem]">03 AVENUE : MBILOA / NGALIEMA</p>
                <p className="text-[0.75rem]">Tel: +243974763940 / 819648854</p>
                <p className="text-[0.75rem]">Email: zuiya.mambula@gmail.com</p>
              </div>

              <div className="rounded-3xl bg-white p-3">
                <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                  <span>ID Nat</span>
                  <span>01-G4701-N25076X</span>
                </div>
                <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                  <span>RCCM</span>
                  <span>CD/KNG/RCCM/17-A-03542</span>
                </div>
                <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                  <span>Numero impot</span>
                  <span>A1720894F</span>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-3">
                <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                  <span>Vendeur</span>
                  <span>cesar</span>
                </div>
                <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                  <span>Client</span>
                  <span>NULL</span>
                </div>
                <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                  <span>Num</span>
                  <span>0000</span>
                </div>
                <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                  <span>Type</span>
                  <span>Personne Physique</span>
                </div>
                <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                  <span>Numero Agent</span>
                  <span>AF666</span>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-3">
                <div className="flex items-center justify-between border-b border-dashed border-zinc-300 pb-2 text-[0.75rem] font-semibold uppercase tracking-[0.15em] text-zinc-700">
                  <span className="w-1/2">Article</span>
                  <span className="w-14 text-right">Qté</span>
                  <span className="w-20 text-right">HT</span>
                </div>
                <div className="space-y-2 pt-3">
                  {items.map((item) => (
                    <div key={`${item.drink.id}-${item.size}`} className="flex items-center justify-between text-[0.75rem] text-zinc-700">
                      <span className="w-1/2 truncate font-medium">
                        {item.drink.name} {item.size && `[${item.size}]`}
                      </span>
                      <span className="w-14 text-right">{item.quantity}</span>
                      <span className="w-20 text-right">{(item.drink.price * item.quantity).toFixed(2)} Fc</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-3 text-[0.75rem] text-zinc-700">
                <div className="flex justify-between py-1 border-b border-dashed border-zinc-300">
                  <span>Total TTC</span>
                  <span className="font-semibold text-zinc-900">{total.toFixed(2)} Fc</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-zinc-300">
                  <span>Taux du jour</span>
                  <span>2289.3077 Fc/USD</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-zinc-300">
                  <span>Equivalent en USD</span>
                  <span className="text-zinc-900">{usdTotal.toFixed(2)}$</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-zinc-300">
                  <span>Payment</span>
                  <span>Espèces</span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
                Annuler
              </Button>
              <Button onClick={confirmInvoice}>
                Valider la facture
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  )
}
