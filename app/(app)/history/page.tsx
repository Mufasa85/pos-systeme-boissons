"use client";

import { useEffect, useState } from "react";
import { MoreVertical, XIcon } from "lucide-react";
import { PosShell } from "@/components/pos-shell";
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
import { ApiError, ApiOrder, fetchOrders } from "@/lib/api";

export default function HistoryPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOrders({ page: 1, limit: 4 });
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
  }, []);

  return (
    <PosShell active="history" title="History">
      <div className="glass-strong rounded-3xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Historique des commandes</p>
          <p className="text-xs text-muted-foreground">
            {orders.length} dernières entrées
          </p>
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
                              currency: order.currency || "USD",
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

  const totalAmount = Number(selectedOrder?.totalAmount ?? 0);
  const fxRate = Number(selectedOrder?.fxRate ?? 0);
  const equivalentUsd = fxRate > 0 ? totalAmount / fxRate : 0;

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
              <span>Num</span>
              <span>{selectedOrder?.orderNumber ?? "—"}</span>
            </div>
            <div className="flex justify-between text-[0.7rem] uppercase tracking-[0.15em] text-zinc-500">
              <span>Type</span>
              <span>Personne Physique</span>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-3">
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
                          currency: selectedOrder?.currency || "USD",
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

          <div className="rounded-3xl bg-white p-3 text-[0.75rem] text-zinc-700">
            <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
              <span>Total TTC</span>
              <span className="font-semibold text-zinc-900">
                {selectedOrder?.totalAmount != null
                  ? new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: selectedOrder?.currency || "USD",
                    }).format(totalAmount)
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
              <span>Taux du jour</span>
              <span>{fxRate > 0 ? `${fxRate.toFixed(4)} Fc/USD` : "—"}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
              <span>Equivalent en USD</span>
              <span className="text-zinc-900">
                {fxRate > 0 ? `${equivalentUsd.toFixed(2)}$` : "—"}
              </span>
            </div>
            <div className="flex justify-between border-b border-dashed border-zinc-300 py-1">
              <span>Paiement</span>
              <span className="capitalize">
                {selectedOrder?.payment?.method ?? "—"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
