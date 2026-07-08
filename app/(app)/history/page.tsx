"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, MoreVertical, Printer, User, XIcon } from "lucide-react";
import { PosShell } from "@/components/pos-shell";
import { useBranding } from "@/components/branding-provider";
import { cn } from "@/lib/utils";
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
import { useFiscalInfo } from "@/lib/use-fiscal-info";
import { ApiError, ApiOrder, Cashier, fetchCashiers, fetchOrders } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";

type DatePreset = "today" | "7d" | "30d" | "all";

function toIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateRange(preset: DatePreset): { from?: string; to?: string } {
  if (preset === "all") return {};
  const today = new Date();
  const to = `${toIsoDay(today)} 23:59:59`;
  if (preset === "today") return { from: `${toIsoDay(today)} 00:00:00`, to };
  const start = new Date(today);
  start.setDate(today.getDate() - (preset === "7d" ? 6 : 29));
  return { from: `${toIsoDay(start)} 00:00:00`, to };
}

export default function HistoryPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [cashierId, setCashierId] = useState<number | undefined>(undefined);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCashiers()
      .then((list) => {
        if (cancelled) return;
        setCashiers(list);
      })
      .catch(() => {
        // Silently ignore cashier list errors — filtering still works without it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError(null);
      try {
        const range = getDateRange(datePreset);
        const data = await fetchOrders({
          page: 1,
          limit: 100,
          cashierId,
          from: range.from,
          to: range.to,
        });
        if (cancelled) return;
        setOrders(data);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Impossible de charger l'historique",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [datePreset, cashierId]);

  return (
    <PosShell active="history" title="History">
      <div className="glass-strong rounded-3xl p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Historique des commandes</p>
            <p className="text-xs text-muted-foreground">
              {orders.length} facture(s)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-2xl bg-muted/50 p-1">
              {(
                [
                  { id: "today", label: "Aujourd'hui" },
                  { id: "7d", label: "7 jours" },
                  { id: "30d", label: "30 jours" },
                  { id: "all", label: "Toutes" },
                ] as { id: DatePreset; label: string }[]
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDatePreset(preset.id)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                    datePreset === preset.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                value={cashierId ?? ""}
                onChange={(e) =>
                  setCashierId(
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
                className="h-8 appearance-none rounded-xl border border-border bg-background pl-8 pr-7 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Tous les vendeurs</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl bg-muted/40 p-3"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-muted/30 p-4 text-sm text-muted-foreground">
            Aucune commande disponible.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-2xl bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                      {" • "}
                      {new Date(order.createdAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {order.items && order.items.length > 0 ? (
                        <>
                          {order.items
                            .slice(0, 2)
                            .map(
                              (item) =>
                                `${item.product?.name ?? "Produit"}${item.size ? ` [${item.size.label}]` : ""} x${item.quantity}`,
                            )
                            .join(", ")}
                          {order.items.length > 2
                            ? ` + ${order.items.length - 2} autre(s)`
                            : ""}
                        </>
                      ) : (
                        "Aucun produit vendu"
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:gap-4">
                    <div className="flex flex-col gap-1 text-right sm:text-left">
                      <span
                        className={
                          order.status === "paid"
                            ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600"
                            : order.status === "refunded"
                              ? "rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-600"
                              : order.status === "cancelled"
                                ? "rounded-full bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive"
                                : "rounded-full bg-secondary/15 px-3 py-1 text-xs font-semibold text-secondary"
                        }
                      >
                        {order.status}
                      </span>
                      <p className="text-sm font-bold">
                        {typeof order.totalAmount === "number"
                          ? new Intl.NumberFormat("fr-FR", {
                              style: "currency",
                              currency: order.currency || "CDF",
                            }).format(order.totalAmount)
                          : order.totalAmount}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"
                          aria-label="Options de la facture"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        align="end"
                        className="min-w-40"
                      >
                        <DropdownMenuItem
                          onClick={() => setSelectedOrder(order)}
                        >
                          Voir les détails de la facture
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>

            <HistoryInvoiceModal
              selectedOrder={selectedOrder}
              onClose={() => setSelectedOrder(null)}
            />
          </>
        )}
      </div>
    </PosShell>
  );
}

function HistoryInvoiceModal({
  selectedOrder,
  onClose,
}: {
  selectedOrder: ApiOrder | null;
  onClose: () => void;
}) {
  const { data: fiscal, loading: fiscalLoading } = useFiscalInfo();
  const { branding } = useBranding();
  const [printing, setPrinting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalAmount = Number(selectedOrder?.totalAmount ?? 0);
  const subtotalAmount = Number(selectedOrder?.subtotal ?? 0);
  const taxAmount = Number(selectedOrder?.taxAmount ?? 0);
  const fxRate = Number(selectedOrder?.fxRate ?? 0);
  const equivalentUsd = fxRate > 0 ? totalAmount / fxRate : 0;

  const companyName = fiscal?.companyName ?? branding.companyName;
  const orderDate = selectedOrder?.createdAt
    ? new Date(selectedOrder.createdAt)
    : new Date();

  function handlePrint() {
    if (printing) return;
    setPrinting(true);
    const trigger = () => {
      try {
        window.print();
      } finally {
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

  // Build the printable receipt as a React portal that we attach
  // directly to <body>. Same approach as `cart-panel.tsx`: this
  // bypasses any ancestor CSS rules that would otherwise hide the
  // receipt when the browser enters print mode.
  const printPortal =
    mounted && selectedOrder && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={printRef}
            className="print-root printable-receipt"
            aria-hidden="true"
          >
            {/* ===== En-tête société ===== */}
            <div className="rcp-center">
              <div
                className="rcp-uppercase rcp-tiny"
                style={{
                  color: "#b91c1c",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                }}
              >
                *** DUPLICATA ***
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
            {selectedOrder?.orderNumber ? (
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
                  {selectedOrder.orderNumber}
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
              <span>{formatDateTime(orderDate)}</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>N° Ticket:</span>
              <span>{selectedOrder?.orderNumber ?? "—"}</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>Caissier:</span>
              <span>{selectedOrder?.cashier?.fullName ?? "—"}</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>Code:</span>
              <span>{selectedOrder?.cashier?.code ?? "—"}</span>
            </div>

            <div className="rcp-double" />

            {/* ===== Articles (all amounts in FC) ===== */}
            {selectedOrder?.items?.map((item) => (
              <div key={item.id} className="rcp-article">
                <div className="rcp-article-name">
                  {item.product?.name ?? "Article"}
                  {item.size ? ` [${item.size.label}]` : ""}
                </div>
                <div className="rcp-article-line rcp-tiny">
                  <span>
                    {item.quantity} x{" "}
                    {typeof item.unitPrice === "number"
                      ? formatPrice(item.unitPrice)
                      : item.unitPrice}
                  </span>
                  <span className="rcp-bold">
                    {typeof item.lineTotal === "number"
                      ? formatPrice(item.lineTotal)
                      : item.lineTotal}
                  </span>
                </div>
              </div>
            ))}

            <div className="rcp-double" />

            {/* ===== Totaux (en FC) ===== */}
            <div className="rcp-line rcp-tiny">
              <span>Sous-total HT</span>
              <span>
                {selectedOrder
                  ? formatPrice(
                      subtotalAmount > 0
                        ? subtotalAmount
                        : totalAmount - taxAmount,
                    )
                  : "—"}
              </span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>TVA (5%)</span>
              <span>{formatPrice(taxAmount)}</span>
            </div>

            <div className="rcp-total">
              <span className="rcp-bold">TOTAL TTC</span>
              <span className="rcp-bold">{formatPrice(totalAmount)}</span>
            </div>

            {/* ===== Date + équivalent CDF ===== */}
            <div className="rcp-dashed" />
            <div className="rcp-line rcp-tiny">
              <span>Équivalent CDF</span>
              <span>{fxRate > 0 ? `${equivalentUsd.toFixed(2)} FC` : "—"}</span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>Taux appliqué</span>
              <span>
                {fxRate > 0
                  ? `1 CDF = ${fxRate.toLocaleString("fr-FR")} FC`
                  : "—"}
              </span>
            </div>
            <div className="rcp-line rcp-tiny">
              <span>Imprimé le</span>
              <span>{formatDateTime(new Date())}</span>
            </div>

            <div className="rcp-dashed" />

            <div className="rcp-line">
              <span className="rcp-bold">Réglé par:</span>
              <span className="rcp-bold rcp-uppercase">
                {selectedOrder?.payment?.method ?? "—"}
              </span>
            </div>
            <div className="rcp-line">
              <span className="rcp-bold">Montant reçu:</span>
              <span className="rcp-bold">{formatPrice(totalAmount)}</span>
            </div>

            <div className="rcp-double" />

            {/* ===== Pied de ticket ===== */}
            <div className="rcp-center rcp-tiny">
              Nombre d'articles: {selectedOrder?.items?.length ?? 0}
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
    <Dialog
      open={selectedOrder !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-88 max-w-88 rounded-[2rem] bg-zinc-50 p-3 text-zinc-900 shadow-2xl ring-1 ring-zinc-200 max-h-[calc(100vh-1rem)] overflow-hidden">
        <div className="relative h-[calc(100vh-1rem-12rem)] overflow-y-auto rounded-[2rem] border border-dashed border-zinc-300 bg-white px-4 py-4 text-[0.72rem] shadow-sm">
          <div className="absolute inset-x-0 top-0 h-8 bg-zinc-100 bg-[repeating-linear-gradient(90deg,#f8fafc_0_8px,transparent_8px_16px)]" />
          <div className="absolute right-3 top-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"
              aria-label="Fermer la facture"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="relative space-y-3 text-center">
            <p className="text-[0.68rem] uppercase tracking-[0.3em] text-zinc-500">
              Point de vente
            </p>
            <p className="text-base font-bold uppercase">
              {fiscal?.companyName ?? "BRIKIN"}
            </p>
            <p className="text-[0.75rem]">{fiscal?.address}</p>
            <p className="text-[0.75rem]">Tel: {fiscal?.phone}</p>
            <p className="text-[0.75rem]">Email: {fiscal?.email}</p>
          </div>

          {/* ===== Numéro de ticket (mis en avant, comme dans cart-panel) ===== */}
          {selectedOrder?.orderNumber ? (
            <div className="mt-3 rounded-3xl border border-dashed border-zinc-200 bg-white p-3 text-center">
              <div
                className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500"
                style={{ letterSpacing: "0.2em" }}
              >
                Ticket N°
              </div>
              <div
                className="font-bold text-zinc-900"
                style={{ fontSize: "1.5em", marginTop: "4px" }}
              >
                {selectedOrder.orderNumber}
              </div>
            </div>
          ) : null}

          <div className="mt-3 rounded-3xl bg-white p-3">
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

          <div className="mt-3 rounded-3xl bg-white p-3">
            <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
              <span>Vendeur</span>
              <span>{selectedOrder?.cashier?.fullName ?? "—"}</span>
            </div>
            <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
              <span>Numero Agent</span>
              <span>{selectedOrder?.cashier?.code ?? "—"}</span>
            </div>
            <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
              <span>Date</span>
              <span>
                {selectedOrder
                  ? new Date(selectedOrder.createdAt).toLocaleString("fr-FR")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
              <span>Type</span>
              <span>Personne Physique</span>
            </div>
          </div>

          <div className="mt-3 rounded-3xl bg-white p-3">
            <div className="flex items-center justify-between border-b border-dashed border-zinc-300 pb-2 text-[0.75rem] font-semibold uppercase tracking-[0.15em] text-zinc-700">
              <span className="w-1/2">Article</span>
              <span className="w-14 text-right">Qté</span>
              <span className="w-20 text-right">HT</span>
            </div>
            <div className="space-y-2 pt-3">
              {selectedOrder?.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-[0.75rem] text-zinc-700"
                >
                  <span className="w-1/2 truncate font-medium">
                    {item.product?.name ?? "Article"}
                    {item.size ? ` [${item.size.label}]` : ""}
                  </span>
                  <span className="w-14 text-right">{item.quantity}</span>
                  <span className="w-20 text-right">
                    {typeof item.lineTotal === "number"
                      ? new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: selectedOrder?.currency || "CDF",
                        }).format(item.lineTotal)
                      : item.lineTotal}
                  </span>
                </div>
              )) ?? (
                <div className="text-sm text-muted-foreground">
                  Aucun article disponible
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-3xl bg-white p-3 text-[0.75rem] text-zinc-700">
            <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
              <span>Total TTC</span>
              <span className="font-semibold text-zinc-900">
                {selectedOrder?.totalAmount != null
                  ? new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: selectedOrder?.currency || "CDF",
                    }).format(totalAmount)
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
              <span>Taux du jour</span>
              <span>{fxRate > 0 ? `${fxRate.toFixed(4)} FC/CDF` : "—"}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
              <span>Equivalent en CDF</span>
              <span className="text-zinc-900">
                {fxRate > 0 ? `${equivalentUsd.toFixed(2)} FC` : "—"}
              </span>
            </div>
            <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
              <span>Paiement</span>
              <span className="capitalize">
                {selectedOrder?.payment?.method ?? "—"}
              </span>
            </div>
          </div>

          {/* ===== Bloc promo JOAC LOUNGE (en bas de la facture) ===== */}
          <div
            className="mt-3 rounded-3xl border border-dashed border-zinc-200 bg-white p-3 text-center"
            style={{ lineHeight: 1.4 }}
          >
            <div
              className="font-bold uppercase text-zinc-900"
              style={{ fontSize: "1em", letterSpacing: "0.15em" }}
            >
              JOAC LOUNGE
            </div>
            <div
              className="text-[0.7rem] text-zinc-600"
              style={{ marginTop: "4px" }}
            >
              vivez l'experrience autrement
            </div>
            <div
              className="text-[0.7rem] text-zinc-500"
              style={{ marginTop: "2px" }}
            >
              Suivez nous sur Facebook et instagram @joac-lounge
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {selectedOrder ? (
            <Button
              onClick={handlePrint}
              disabled={printing}
              className="min-w-32"
              variant="default"
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>

      {/* Printable receipt portal — see printPortal above */}
      {printPortal}
    </Dialog>
  );
}
