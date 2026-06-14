"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Minus,
  MoreVertical,
  Phone,
  Plus,
  Printer,
  Smartphone,
  Trash2,
  User as UserIcon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomerDialog } from "@/components/customer-dialog";
import {
  ApiCustomer,
  ApiError,
  createOrder,
  payOrder,
  type ApiOrder,
} from "@/lib/api";
import { useFiscalInfo } from "@/lib/use-fiscal-info";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/lib/types";

// Discount feature removed

const TAX_RATE = 0.05;
const FX_RATE = 2289.3077;

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
}: {
  items: CartItem[];
  onQty: (id: string, size: string, delta: number) => void;
  onRemove: (id: string, size: string) => void;
  onClear: () => void;
}) {
  const { branding } = useBranding();
  const { cashier } = useAuth();
  const { data: fiscal, loading: fiscalLoading } = useFiscalInfo();

  const router = useRouter();
  const [payment, setPayment] = useState<PayMethod>("card");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customer, setCustomer] = useState<ApiCustomer | null>(null);
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
  const [lastCustomerSnapshot, setLastCustomerSnapshot] =
    useState<ApiCustomer | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  function viewHistory() {
    setInvoiceOpen(false);
    router.push("/history");
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  const subtotal = items.reduce((s, i) => s + i.drink.price * i.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const usdTotal = total / FX_RATE;

  // Items shown inside the dialog. After the order is paid we freeze
  // the snapshot so the receipt keeps showing the sold articles.
  const dialogItems: CartItem[] = paidOrder ? lastCartSnapshot : items;
  const dialogTotal = paidOrder ? lastTotalSnapshot : total;
  const dialogPayment: PayMethod = paidOrder ? lastPaymentSnapshot : payment;
  const dialogCustomer: ApiCustomer | null = paidOrder
    ? lastCustomerSnapshot
    : customer;

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
      setLastCustomerSnapshot(null);
    }
  }, [invoiceOpen, items.length]);

  // ============================================================
  // Flow:
  //   1. "Valider la facture" → open CustomerDialog
  //   2. Cashier picks / creates / skips the customer
  //   3. CartPanel then opens the invoice Dialog and snapshots
  //      the customer (so the receipt keeps showing it after
  //      the order is paid and the cart is cleared)
  // ============================================================

  function startSale() {
    if (isEmpty) return;
    setConfirmError(null);
    setPaidOrder(null);
    setLastCustomerSnapshot(null);
    setCustomerOpen(true);
  }

  function onCustomerSelected(selected: ApiCustomer) {
    setCustomer(selected);
    setLastCustomerSnapshot(selected);
    setCustomerOpen(false);
    setInvoiceOpen(true);
  }

  function onCustomerSkipped() {
    setCustomer(null);
    setLastCustomerSnapshot(null);
    setCustomerOpen(false);
    setInvoiceOpen(true);
  }

  function closeCustomerDialog() {
    setCustomerOpen(false);
  }

  function closeInvoice() {
    setInvoiceOpen(false);
    setConfirmError(null);
  }

  async function confirmInvoice() {
    if (confirming || items.length === 0) return;
    setConfirming(true);
    setConfirmError(null);
    // Capture a snapshot of the cart + customer before we clear
    // them so the receipt and the print view keep showing the
    // sold items and the resolved customer.
    setLastCartSnapshot(items);
    setLastTotalSnapshot(total);
    setLastPaymentSnapshot(payment);
    setLastCustomerSnapshot(customer);
    try {
      // 1. Create the order in "pending" state on the server
      const order = await createOrder({
        items: items.map((it) => ({
          productId: Number(it.drink.id),
          quantity: it.quantity,
        })),
        ...(customer?.id ? { customerId: customer.id } : {}),
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
  const receiptFxRate = paidOrder ? Number(paidOrder.fxRate) : FX_RATE;
  const receiptTotalFc = paidOrder
    ? Number(paidOrder.totalAmount)
    : dialogTotal;
  const receiptEquivalentUsd =
    receiptFxRate > 0 ? receiptTotalFc / receiptFxRate : 0;

  // Format a number with thousands separators (used in ticket prices)
  const fmtFc = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

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
              <span>{receiptDate.toLocaleDateString("fr-FR")}</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>Heure:</span>
              <span>
                {receiptDate.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
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

            {/* ===== Client ===== */}
            {dialogCustomer ? (
              <>
                <div className="rcp-uppercase rcp-tiny rcp-muted rcp-center">
                  Client
                </div>
                <div className="rcp-line rcp-tiny">
                  <span>Type:</span>
                  <span>
                    {dialogCustomer.type === "company" ? "Société" : "Personne"}
                  </span>
                </div>
                <div className="rcp-line rcp-tiny">
                  <span>Nom:</span>
                  <span>{dialogCustomer.name}</span>
                </div>
                {dialogCustomer.phone ? (
                  <div className="rcp-line rcp-tiny">
                    <span>Tél:</span>
                    <span>{dialogCustomer.phone}</span>
                  </div>
                ) : null}
                {dialogCustomer.email ? (
                  <div className="rcp-line rcp-tiny">
                    <span>Email:</span>
                    <span>{dialogCustomer.email}</span>
                  </div>
                ) : null}
                {dialogCustomer.taxId ? (
                  <div className="rcp-line rcp-tiny">
                    <span>N° Impôt:</span>
                    <span>{dialogCustomer.taxId}</span>
                  </div>
                ) : null}
                {dialogCustomer.address ? (
                  <div className="rcp-line rcp-tiny">
                    <span>Adresse:</span>
                    <span>{dialogCustomer.address}</span>
                  </div>
                ) : null}
                <div className="rcp-dashed" />
              </>
            ) : null}

            {/* ===== Articles ===== */}
            {dialogItems.map((item) => (
              <div
                key={`print-${item.drink.id}-${item.size}`}
                className="rcp-article"
              >
                <div className="rcp-article-name">
                  {item.drink.name}
                  {item.size ? ` ${item.size}` : ""}
                </div>
                <div className="rcp-article-line rcp-tiny">
                  <span>
                    {item.quantity} x {fmtFc(item.drink.price)}
                  </span>
                  <span className="rcp-bold">
                    {fmtFc(item.drink.price * item.quantity)} F
                  </span>
                </div>
              </div>
            ))}

            <div className="rcp-double" />

            {/* ===== Totaux ===== */}
            <div className="rcp-line rcp-tiny">
              <span>Sous-total HT</span>
              <span>
                {fmtFc(
                  paidOrder
                    ? Number(paidOrder.totalAmount) -
                        Number(paidOrder.taxAmount || 0)
                    : dialogTotal - dialogTotal * (TAX_RATE / (1 + TAX_RATE)),
                )}{" "}
                F
              </span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>TVA (5%)</span>
              <span>
                {fmtFc(
                  paidOrder
                    ? Number(paidOrder.taxAmount || 0)
                    : dialogTotal * (TAX_RATE / (1 + TAX_RATE)),
                )}{" "}
                F
              </span>
            </div>

            <div className="rcp-total">
              <span className="rcp-bold">TOTAL TTC</span>
              <span className="rcp-bold">{fmtFc(receiptTotalFc)} F</span>
            </div>

            <div className="rcp-line rcp-tiny">
              <span>Taux du jour</span>
              <span>{receiptFxRate.toFixed(2)} F/$</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>Équivalent USD</span>
              <span>$ {receiptEquivalentUsd.toFixed(2)}</span>
            </div>

            <div className="rcp-dashed" />

            <div className="rcp-line">
              <span className="rcp-bold">Réglé par:</span>
              <span className="rcp-bold rcp-uppercase">{dialogPayment}</span>
            </div>
            <div className="rcp-line">
              <span className="rcp-bold">Montant reçu:</span>
              <span className="rcp-bold">{fmtFc(receiptTotalFc)} F</span>
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Commande en cours</h2>
            <p className="text-xs text-muted-foreground">
              {items.length} article{items.length > 1 ? "s" : ""}
            </p>
          </div>
          {items.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 rounded-xl px-2 text-xs text-muted-foreground"
            >
              Vider
            </Button>
          ) : null}
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
                    {item.size ? `Taille ${item.size} · ` : ""}$
                    {item.drink.price.toFixed(2)}
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

        {/* Totals */}
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Sous-total</span>
            <span className="font-medium text-foreground">
              ${subtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>TVA (5%)</span>
            <span className="font-medium text-foreground">
              ${tax.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Total</span>
            <span className="brand-text">${total.toFixed(2)}</span>
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
          Valider la facture · ${(isEmpty ? 0 : total).toFixed(2)}
        </button>
      </div>

      {/* Customer dialog — opens first when validating the sale */}
      <CustomerDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        onConfirm={onCustomerSelected}
        onSkip={onCustomerSkipped}
      />

      {/* Invoice preview */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="w-88 max-w-88 rounded-[2rem] bg-zinc-50 p-3 text-zinc-900 shadow-2xl ring-1 ring-zinc-200 sm:w-88 sm:max-w-88 max-h-[calc(100vh-1rem)] overflow-hidden">
          <div className="relative h-[calc(100vh-1rem-12rem)] overflow-y-auto rounded-[2rem] border border-dashed border-zinc-300 bg-white px-4 py-4 text-[0.72rem] shadow-sm">
            <div className="absolute inset-x-0 top-0 h-8 bg-zinc-100 bg-[repeating-linear-gradient(90deg,#f8fafc_0_8px,transparent_8px_16px)]" />
            <div className="absolute right-3 top-3">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"
                    aria-label="Ouvrir le menu de la facture"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  className="min-w-40"
                >
                  <DropdownMenuItem onClick={viewHistory}>
                    Voir l'historique des commandes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
                <span>Vendeur</span>
                <span>{cashier?.fullName ?? "—"}</span>
              </div>
              <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>Numero Agent</span>
                <span>{cashier?.code ?? "—"}</span>
              </div>
              <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>Date</span>
                <span>{receiptDate.toLocaleString("fr-FR")}</span>
              </div>
              <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>Num</span>
                <span>{paidOrder?.orderNumber ?? "—"}</span>
              </div>
              <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>Type</span>
                <span>
                  {dialogCustomer
                    ? dialogCustomer.type === "company"
                      ? "Société"
                      : "Personne"
                    : "Personne Physique"}
                </span>
              </div>
            </div>

            {/* Customer block — shown on the on-screen invoice */}
            <div className="rounded-3xl bg-white p-3">
              <div className="mb-1.5 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
                <span>Client</span>
                {dialogCustomer ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.6rem] font-semibold text-emerald-700">
                    {dialogCustomer.type === "company" ? (
                      <Building2 className="h-2.5 w-2.5" />
                    ) : (
                      <UserIcon className="h-2.5 w-2.5" />
                    )}
                    {dialogCustomer.type === "company" ? "Société" : "Personne"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[0.6rem] font-semibold text-zinc-600">
                    Anonyme
                  </span>
                )}
              </div>
              {dialogCustomer ? (
                <div className="space-y-1 text-[0.72rem] text-zinc-700">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {dialogCustomer.name}
                  </p>
                  {dialogCustomer.phone ? (
                    <p className="flex items-center gap-1 truncate text-zinc-600">
                      <Phone className="h-3 w-3" />
                      {dialogCustomer.phone}
                    </p>
                  ) : null}
                  {dialogCustomer.email ? (
                    <p className="flex items-center gap-1 truncate text-zinc-600">
                      <Mail className="h-3 w-3" />
                      {dialogCustomer.email}
                    </p>
                  ) : null}
                  {dialogCustomer.taxId ? (
                    <p className="truncate text-zinc-600">
                      N° Impôt: {dialogCustomer.taxId}
                    </p>
                  ) : null}
                  {dialogCustomer.address ? (
                    <p className="flex items-center gap-1 truncate text-zinc-600">
                      <MapPin className="h-3 w-3" />
                      {dialogCustomer.address}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-[0.72rem] italic text-zinc-500">
                  Vente anonyme — aucun client associé.
                </p>
              )}
            </div>

            <div className="rounded-3xl bg-white p-3">
              <div className="flex items-center justify-between border-b border-dashed border-zinc-300 pb-2 text-[0.75rem] font-semibold uppercase tracking-[0.15em] text-zinc-700">
                <span className="w-1/2">Article</span>
                <span className="w-14 text-right">Qté</span>
                <span className="w-20 text-right">HT</span>
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
                    <span className="w-20 text-right">
                      {(item.drink.price * item.quantity).toFixed(2)} Fc
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-3 text-[0.75rem] text-zinc-700">
              <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
                <span>Total TTC</span>
                <span className="font-semibold text-zinc-900">
                  {receiptTotalFc.toFixed(2)} Fc
                </span>
              </div>
              <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
                <span>Taux du jour</span>
                <span>{receiptFxRate.toFixed(4)} Fc/USD</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
                <span>Equivalent en USD</span>
                <span className="text-zinc-900">
                  {receiptEquivalentUsd.toFixed(2)}$
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
