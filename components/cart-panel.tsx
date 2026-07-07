"use client";

import Image from "next/image";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Minus,
  Plus,
  Printer,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/auth-provider";
import { useBranding } from "@/components/branding-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, createOrder, payOrder, type ApiOrder } from "@/lib/api";
import { useFiscalInfo } from "@/lib/use-fiscal-info";
import {
  formatDateTime,
  formatFcAsUsd,
  formatPrice,
  FX_USD_TO_CDF,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/lib/types";

// Discount feature removed
//
// All customer-facing amounts in this file are expressed in
// **Congolese Francs (FC)**. The catalog (`drink.price`) is already
// stored in FC, and the order model returns the totals in FC. We
// format every number with `formatPrice()` from `lib/format.ts`
// so the cart, the on-screen invoice and the printed ticket
// stay perfectly consistent. The USD equivalent is shown as a
// secondary line on the receipt / on-screen invoice for
// reference.

const TAX_RATE = 0.05;

const paymentMethods = [
  { id: "cash", label: "Espèces", method: "cash" as const, icon: Banknote },
  { id: "card", label: "Carte", method: "card" as const, icon: CreditCard },
  {
    id: "mobile",
    label: "Mobile",
    method: "mobile" as const,
    icon: Smartphone,
  },
];

type PayMethod = (typeof paymentMethods)[number]["method"];

export function CartPanel({
  items,
  onQty,
  onRemove,
  onClear,
  /**
   * When provided, a close (X) button is rendered at the *left* of
   * the panel header — level with the "Vider" button so they can
   * never overlap each other on small screens.
   * Used by the mobile Dialog wrapper to dismiss the cart sheet.
   */
  onClose,
}: {
  items: CartItem[];
  onQty: (id: string, size: string, delta: number) => void;
  onRemove: (id: string, size: string) => void;
  onClear: () => void;
  onClose?: () => void;
}) {
  const { branding } = useBranding();
  const { cashier } = useAuth();
  const { data: fiscal, loading: fiscalLoading } = useFiscalInfo();

  const [payment, setPayment] = useState<PayMethod>("card");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [paidOrder, setPaidOrder] = useState<ApiOrder | null>(null);
  const [printing, setPrinting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Snapshot of the cart captured at the moment the order was confirmed.
  // We need this because the parent clears the cart right after `payOrder`
  // resolves, but the printed receipt / on-screen confirmation still need
  // to show the items that were sold.
  const [lastCartSnapshot, setLastCartSnapshot] = useState<CartItem[]>([]);
  const [lastTotalSnapshot, setLastTotalSnapshot] = useState(0);
  const [lastPaymentSnapshot, setLastPaymentSnapshot] =
    useState<PayMethod>("card");

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // All math is done in FC.
  const subtotal = items.reduce(
    (s, i) => s + Number(i.drink.price) * i.quantity,
    0,
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  // Items shown inside the dialog. After the order is paid we freeze
  // the snapshot so the receipt keeps showing the sold articles.
  const dialogItems: CartItem[] = paidOrder ? lastCartSnapshot : items;
  const dialogTotal = paidOrder ? lastTotalSnapshot : total;
  const dialogPayment: PayMethod = paidOrder ? lastPaymentSnapshot : payment;

  // During SSR and the first client render (before effects run) we force
  // the UI to represent an empty cart to avoid hydration mismatches.
  const isEmpty = mounted ? items.length === 0 : true;

  // When the user re-opens the cart or adds items, close any prior
  // success / error banner so the previous order doesn't bleed in.
  useEffect(() => {
    if (!invoiceOpen) {
      setConfirmError(null);
      setPaidOrder(null);
      setLastCartSnapshot([]);
      setLastTotalSnapshot(0);
    }
  }, [invoiceOpen, items.length]);

  // ============================================================
  // Flow:
  //   1. "Valider la facture" → opens the invoice Dialog directly
  //      (no customer step — all sales are anonymous).
  //   2. Cashier reviews the receipt and clicks "Confirmer la vente".
  //   3. We snapshot the cart so the printed/on-screen receipt
  //      keeps showing the sold items after the cart is cleared.
  // ============================================================

  function startSale() {
    if (isEmpty) return;
    setConfirmError(null);
    setPaidOrder(null);
    setInvoiceOpen(true);
  }

  function closeInvoice() {
    setInvoiceOpen(false);
    setConfirmError(null);
  }

  async function confirmInvoice() {
    if (confirming || items.length === 0) return;
    setConfirming(true);
    setConfirmError(null);
    // Capture a snapshot of the cart before we clear it so the
    // receipt and the print view keep showing the sold items.
    setLastCartSnapshot(items);
    setLastTotalSnapshot(total);
    setLastPaymentSnapshot(payment);
    try {
      // 1. Create the order in "pending" state on the server
      const order = await createOrder({
        items: items.map((it) => ({
          productId: Number(it.drink.id),
          quantity: it.quantity,
        })),
      });
      // 2. Mark the order as paid and create the Payment row
      const paid = await payOrder(order.id, {
        method: payment,
        amount: total,
      });
      setPaidOrder(paid);
      onClear();
      // The dialog stays open so the user can review the receipt
      // and click "Imprimer" if they need a printed copy.
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Impossible de valider la facture";
      setConfirmError(message);
    } finally {
      setConfirming(false);
    }
  }

  function handlePrint() {
    if (printing) return;
    setPrinting(true);
    // Give React one tick to render the printable container if it just
    // appeared (e.g. right after a confirmation).
    const trigger = () => {
      try {
        window.print();
      } finally {
        // Reset after the print dialog has been handled.
        setTimeout(() => setPrinting(false), 500);
      }
    };
    if (
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
    ) {
      window.requestAnimationFrame(trigger);
    } else {
      setTimeout(trigger, 16);
    }
  }

  const companyName = fiscal?.companyName ?? branding.companyName;
  // The backend exposes `createdAt` on the order. Some shapes
  // (e.g. older payloads) may ship it as `created_at` instead.
  // We try both keys and fall back to "now" if the value is
  // missing or unparseable, which prevents "Invalid Date" from
  // leaking into the receipt / on-screen invoice.
  function parseOrderDate(value: unknown): Date {
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  }
  const orderCreatedAt = (
    paidOrder as unknown as { created_at?: string } | null
  )?.created_at;
  const receiptDate = paidOrder
    ? parseOrderDate(paidOrder.createdAt ?? orderCreatedAt)
    : new Date();
  // `paidOrder.totalAmount` is already in FC — we display it
  // directly. If the order hasn't been confirmed yet we fall
  // back to the dialog total (also in FC).
  const receiptTotalFc = paidOrder
    ? Number(paidOrder.totalAmount)
    : dialogTotal;

  // Build the printable receipt as a React portal that we attach
  // directly to <body>. This bypasses any ancestor CSS rules that
  // would otherwise hide it when the browser enters print mode.
  const printPortal =
    mounted && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={printRef}
            className="print-root printable-receipt"
            aria-hidden="true"
          >
            {/* ===== En-tête société ===== */}
            <div className="rcp-center">
              <div className="rcp-uppercase rcp-tiny rcp-muted">
                *** Ticket de caisse ***
              </div>
              <div className="rcp-name">{companyName}</div>
              <div className="rcp-small">{fiscal?.address ?? ""}</div>
              {fiscal?.phone ? (
                <div className="rcp-small">Tél: {fiscal.phone}</div>
              ) : null}
              {fiscal?.email ? (
                <div className="rcp-small">{fiscal.email}</div>
              ) : null}
            </div>

            <div className="rcp-dashed" />

            {/* ===== Numéro de ticket (mis en avant) ===== */}
            {paidOrder?.orderNumber ? (
              <div className="rcp-center" style={{ padding: "4px 0" }}>
                <div
                  className="rcp-uppercase rcp-tiny rcp-muted"
                  style={{ letterSpacing: "0.2em" }}
                >
                  Ticket N°
                </div>
                <div
                  className="rcp-bold"
                  style={{ fontSize: "1.4em", marginTop: "2px" }}
                >
                  {paidOrder.orderNumber}
                </div>
              </div>
            ) : null}

            <div className="rcp-dashed" />

            {/* ===== Infos fiscales ===== */}
            <div className="rcp-line rcp-tiny">
              <span>ID Nat:</span>
              <span>{fiscal?.idNat ?? "—"}</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>RCCM:</span>
              <span>{fiscal?.rccm ?? "—"}</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>N° Impôt:</span>
              <span>{fiscal?.taxNumber ?? "—"}</span>
            </div>

            <div className="rcp-dashed" />

            {/* ===== Infos ticket ===== */}
            <div className="rcp-line rcp-tiny">
              <span>Date:</span>
              <span>{formatDateTime(receiptDate)}</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>N° Ticket:</span>
              <span>{paidOrder?.orderNumber ?? "—"}</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>Caissier:</span>
              <span>{cashier?.fullName ?? "—"}</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>Code:</span>
              <span>{cashier?.code ?? "—"}</span>
            </div>

            <div className="rcp-double" />

            {/* ===== Articles (all amounts in FC) ===== */}
            {dialogItems.map((item) => (
              <div
                key={`print-${item.drink.id}-${item.size}`}
                className="rcp-article"
              >
                <div className="rcp-article-name">
                  {item.drink.name}
                  {item.size ? ` ${item.size}` : ""}
                </div>
                <div className="rcp-article-line rcp-small">
                  <span>
                    {item.quantity} x {formatPrice(item.drink.price)}
                  </span>
                  <span className="rcp-bold">
                    {formatPrice(Number(item.drink.price) * item.quantity)}
                  </span>
                </div>
              </div>
            ))}

            <div className="rcp-double" />

            {/* ===== Totaux (en FC) ===== */}
            <div className="rcp-line rcp-small">
              <span>Sous-total HT</span>
              <span>
                {paidOrder
                  ? formatPrice(
                      Number(paidOrder.totalAmount) -
                        Number(paidOrder.taxAmount || 0),
                    )
                  : formatPrice(
                      dialogTotal - dialogTotal * (TAX_RATE / (1 + TAX_RATE)),
                    )}
              </span>
            </div>
            <div className="rcp-line rcp-small">
              <span>TVA (5%)</span>
              <span>
                {paidOrder
                  ? formatPrice(Number(paidOrder.taxAmount || 0))
                  : formatPrice(dialogTotal * (TAX_RATE / (1 + TAX_RATE)))}
              </span>
            </div>

            <div className="rcp-total">
              <span className="rcp-bold">TOTAL TTC</span>
              <span className="rcp-bold">{formatPrice(receiptTotalFc)}</span>
            </div>

            {/* ===== Date + équivalent USD ===== */}
            <div className="rcp-dashed" />
            <div className="rcp-line rcp-tiny">
              <span>Équivalent USD</span>
              <span>{formatFcAsUsd(receiptTotalFc)}</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>Taux appliqué</span>
              <span>1 $ = {FX_USD_TO_CDF.toLocaleString("fr-FR")} FC</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>Imprimé le</span>
              <span>{formatDateTime(new Date())}</span>
            </div>

            <div className="rcp-dashed" />

            <div className="rcp-line">
              <span className="rcp-bold">Réglé par:</span>
              <span className="rcp-bold rcp-uppercase">{dialogPayment}</span>
            </div>
            <div className="rcp-line">
              <span className="rcp-bold">Montant reçu:</span>
              <span className="rcp-bold">{formatPrice(receiptTotalFc)}</span>
            </div>

            <div className="rcp-double" />

            {/* ===== Pied de ticket ===== */}
            <div className="rcp-center rcp-tiny">
              Nombre d'articles: {dialogItems.length}
            </div>

            <div className="rcp-dashed" />

            <div className="rcp-center">
              <div className="rcp-thanks">*** Merci de votre visite ***</div>
              <div className="rcp-tiny rcp-muted">À bientôt !</div>
            </div>

            <div className="rcp-perforation" />

            <div className="rcp-center rcp-tiny rcp-muted">
              Conservez votre ticket
            </div>

            <div className="rcp-double" />

            {/* ===== Bloc promo JOAC LOUNGE ===== */}
            <div
              className="rcp-center"
              style={{ padding: "6px 0 2px", lineHeight: 1.4 }}
            >
              <div
                className="rcp-bold rcp-uppercase"
                style={{ fontSize: "1.15em", letterSpacing: "0.15em" }}
              >
                JOAC LOUNGE
              </div>
              <div className="rcp-tiny" style={{ marginTop: "4px" }}>
                vivez l'experrience autrement
              </div>
              <div className="rcp-tiny rcp-muted" style={{ marginTop: "2px" }}>
                Suivez nous sur Facebook et instagram @joac-lounge
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    // The cart panel is rendered in two contexts:
    //   • Desktop: inline column on the right of the menu.
    //   • Mobile : inside a full-screen Dialog sheet (see pos-app).
    // In both cases the parent has a fixed height, so we use
    // `h-full overflow-hidden` here and `min-h-0` on the inner
    // flex column to make the items list (which has
    // `flex-1 overflow-y-auto`) actually scroll when the cart
    // grows. The Totals / Payment / Validate sections stay
    // pinned to the bottom.
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:w-[24rem] lg:shrink-0">
      <div className="glass-strong flex h-full min-h-0 flex-col overflow-hidden rounded-none p-4 sm:rounded-3xl sm:p-5">
        {/* Header
            ----------------------------------------------------
            On mobile (when `onClose` is provided by the Dialog
            wrapper) the close (X) button sits at the LEFT of the
            header — the same row as the "Vider" button — so the
            two never overlap. On desktop, the X is hidden. */}
        <div className="flex items-center justify-between gap-2">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le panier"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">Commande en cours</h2>
            <p className="text-xs text-muted-foreground">
              {items.length} article{items.length > 1 ? "s" : ""}
            </p>
          </div>
          {items.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 shrink-0 rounded-xl px-2 text-xs text-muted-foreground"
            >
              Vider
            </Button>
          ) : (
            // Reserve the same width as the "Vider" button so the
            // title doesn't jump when the cart goes from empty to
            // non-empty (and vice-versa).
            <span aria-hidden className="h-8 w-14 shrink-0" />
          )}
        </div>

        {/* Items */}
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="flex h-full min-h-40 flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <div className="brand-soft mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
                <Plus className="h-6 w-6" />
              </div>
              Votre panier est vide.
              <br />
              Touchez une boisson pour l'ajouter.
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
                    {item.size ? `Taille ${item.size} · ` : ""}
                    {formatPrice(item.drink.price)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onQty(item.drink.id, item.size, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-card text-foreground transition-colors hover:bg-muted"
                    aria-label="Diminuer la quantité"
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
                    aria-label="Augmenter la quantité"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item.drink.id, item.size)}
                    className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Retirer l'article"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals — all in FC */}
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Sous-total</span>
            <span className="font-medium text-foreground tabular-nums">
              {formatPrice(subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>TVA (5%)</span>
            <span className="font-medium text-foreground tabular-nums">
              {formatPrice(tax)}
            </span>
          </div>
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Total</span>
            <span className="brand-text tabular-nums">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {paymentMethods.map((m) => {
            const Icon = m.icon;
            const isActive = payment === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPayment(m.method)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-medium transition-colors",
                  isActive
                    ? "brand-soft brand-ring"
                    : "bg-muted/60 text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {m.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={isEmpty}
          onClick={startSale}
          className={cn(
            "brand-bg mt-4 flex h-12 items-center justify-center rounded-2xl text-sm font-bold transition-opacity disabled:opacity-40",
          )}
        >
          <Lock className="mr-2 h-4 w-4" />
          <span className="truncate">
            Valider la facture · {formatPrice(isEmpty ? 0 : total)}
          </span>
        </button>
      </div>

      {/* Invoice preview */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="w-88 max-w-88 rounded-[2rem] bg-zinc-50 p-3 text-zinc-900 shadow-2xl ring-1 ring-zinc-200 sm:w-88 sm:max-w-88 max-h-[calc(100vh-1rem)] overflow-hidden">
          <div className="relative h-[calc(100vh-1rem-12rem)] overflow-y-auto rounded-[2rem] border border-dashed border-zinc-300 bg-white px-4 py-4 text-[0.72rem] shadow-sm">
            <div className="absolute inset-x-0 top-0 h-8 bg-zinc-100 bg-[repeating-linear-gradient(90deg,#f8fafc_0_8px,transparent_8px_16px)]" />
            {/* The "three-dot" menu was removed: nothing is rendered
                in the top-right corner of the invoice preview anymore. */}
            <div className="relative space-y-3 text-center">
              <p className="text-[0.68rem] uppercase tracking-[0.3em] text-zinc-500">
                Point de vente
              </p>
              {fiscalLoading && !fiscal ? (
                <p className="text-sm text-zinc-500">Chargement…</p>
              ) : (
                <>
                  <p className="text-base font-bold uppercase">{companyName}</p>
                  <p className="text-[0.75rem]">{fiscal?.address}</p>
                  <p className="text-[0.75rem]">Tel: {fiscal?.phone}</p>
                  <p className="text-[0.75rem]">Email: {fiscal?.email}</p>
                </>
              )}
            </div>

            <div className="rounded-3xl bg-white p-3">
              <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>ID Nat</span>
                <span>{fiscal?.idNat ?? "—"}</span>
              </div>
              <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>RCCM</span>
                <span>{fiscal?.rccm ?? "—"}</span>
              </div>
              <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>Numero impot</span>
                <span>{fiscal?.taxNumber ?? "—"}</span>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-3">
              <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>Date</span>
                <span className="font-semibold text-zinc-900">
                  {formatDateTime(receiptDate)}
                </span>
              </div>
              <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>N° Ticket</span>
                <span className="font-semibold text-zinc-900">
                  {paidOrder?.orderNumber ?? "—"}
                </span>
              </div>
              <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>Vendeur</span>
                <span>{cashier?.fullName ?? "—"}</span>
              </div>
              <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>Numero Agent</span>
                <span>{cashier?.code ?? "—"}</span>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-3">
              <div className="flex items-center justify-between border-b border-dashed border-zinc-300 pb-2 text-[0.75rem] font-semibold uppercase tracking-[0.15em] text-zinc-700">
                <span className="w-1/2">Article</span>
                <span className="w-14 text-right">Qté</span>
                <span className="w-24 text-right">Total</span>
              </div>
              <div className="space-y-2 pt-3">
                {dialogItems.map((item) => (
                  <div
                    key={`${item.drink.id}-${item.size}`}
                    className="flex items-center justify-between text-[0.75rem] text-zinc-700"
                  >
                    <span className="w-1/2 truncate font-medium">
                      {item.drink.name} {item.size && `[${item.size}]`}
                    </span>
                    <span className="w-14 text-right">{item.quantity}</span>
                    <span className="w-24 text-right tabular-nums">
                      {formatPrice(Number(item.drink.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-3 text-[0.75rem] text-zinc-700">
              <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
                <span>Date</span>
                <span className="font-semibold text-zinc-900">
                  {formatDateTime(receiptDate)}
                </span>
              </div>
              <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
                <span>Total TTC</span>
                <span className="font-semibold text-zinc-900 tabular-nums">
                  {formatPrice(receiptTotalFc)}
                </span>
              </div>
              <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
                <span>Équivalent USD</span>
                <span className="font-semibold text-zinc-900 tabular-nums">
                  {formatFcAsUsd(receiptTotalFc)}
                </span>
              </div>
              <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
                <span>Taux du jour</span>
                <span className="tabular-nums">
                  1 $ = {FX_USD_TO_CDF.toLocaleString("fr-FR")} FC
                </span>
              </div>
              <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
                <span>Paiement</span>
                <span className="capitalize">{dialogPayment}</span>
              </div>
            </div>

            {/* Success / error feedback shown inside the dialog */}
            {paidOrder ? (
              <div className="mt-3 flex flex-col items-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-semibold">Facture validée</p>
                <p className="text-[0.7rem] text-emerald-700/80">
                  Commande #{paidOrder.orderNumber} enregistrée et payée.
                </p>
              </div>
            ) : null}
            {confirmError ? (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[0.72rem] text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{confirmError}</span>
              </div>
            ) : null}
          </div>

          <DialogHeader className="sr-only">
            <DialogTitle>Facture</DialogTitle>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={closeInvoice}
              disabled={confirming}
            >
              {paidOrder ? "Fermer" : "Annuler"}
            </Button>
            {paidOrder ? (
              <Button
                onClick={handlePrint}
                disabled={printing}
                className="min-w-32"
                variant="default"
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
              </Button>
            ) : (
              <Button
                onClick={confirmInvoice}
                disabled={
                  confirming || dialogItems.length === 0 || paidOrder !== null
                }
                className="min-w-32"
              >
                {confirming ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validation…
                  </span>
                ) : (
                  "Confirmer la vente"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable receipt portal — see printPortal above */}
      {printPortal}
    </aside>
  );
}
