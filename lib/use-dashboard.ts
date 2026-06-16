"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiRequest, ApiError, type ApiOrder } from "@/lib/api";

/* -------------------------------------------------------------------------- */
/*                                Types                                        */
/* -------------------------------------------------------------------------- */

export interface DashboardTopSeller {
  productId: number;
  name: string | null;
  totalSold: number;
  revenue: number;
}

export interface DashboardSalesByDay {
  /** YYYY-MM-DD as returned by MySQL `DATE()`. */
  day: string;
  ordersCount: number;
  total: number;
}

export interface DashboardSummary {
  todaySales: number;
  todayOrders: number;
  fxRate: number;
  topSellers: DashboardTopSeller[];
  salesByDay: DashboardSalesByDay[];
}

export interface DashboardLog {
  id: number;
  type: string;
  message: string;
  amount?: number | string | null;
  cashier?: { id: number; code: string; fullName: string } | null;
  createdAt: string;
}

export interface ReportFilters {
  /** Inclusive ISO date (yyyy-MM-dd). */
  from: string;
  /** Inclusive ISO date (yyyy-MM-dd). */
  to: string;
  /** Optional cashier filter. */
  cashierId?: number | string;
  /** Optional category filter. */
  categoryId?: number | string;
}

export interface ReportBreakdown {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  refunds: number;
  taxTotal: number;
  byDay: DashboardSalesByDay[];
  topProducts: DashboardTopSeller[];
  byCategory: Array<{ categoryId: number; name: string; total: number; count: number }>;
  byCashier: Array<{
    cashierId: number;
    name: string;
    code: string;
    total: number;
    orders: number;
  }>;
  byPaymentMethod: Array<{ method: string; total: number; count: number }>;
  byHour: Array<{ hour: number; count: number; total: number }>;
}

/* -------------------------------------------------------------------------- */
/*                                Hook: useDashboardSummary                    */
/* -------------------------------------------------------------------------- */

interface UseDashboardSummaryResult {
  data: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetch `GET /dashboard/summary` (today's KPIs + last 7-day trend +
 * top sellers). Polls every `pollMs` ms when > 0 so the dashboard
 * stays in sync with the till.
 */
export function useDashboardSummary(
  pollMs = 0,
): UseDashboardSummaryResult {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const aliveRef = useRef(true);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    aliveRef.current = true;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    apiRequest<DashboardSummary>({
      method: "GET",
      path: `${apiBase()}/dashboard/summary`,
      signal: ac.signal,
    })
      .then((payload) => {
        if (!aliveRef.current) return;
        setData(payload);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!aliveRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      aliveRef.current = false;
      ac.abort();
    };
  }, [nonce]);

  useEffect(() => {
    if (pollMs <= 0) return;
    const id = setInterval(() => setNonce((n) => n + 1), pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return { data, loading, error, reload };
}

/* -------------------------------------------------------------------------- */
/*                                Hook: useRecentActivity                      */
/* -------------------------------------------------------------------------- */

interface UseRecentActivityResult {
  data: DashboardLog[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useRecentActivity(
  limit = 12,
  pollMs = 0,
): UseRecentActivityResult {
  const [data, setData] = useState<DashboardLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const aliveRef = useRef(true);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    aliveRef.current = true;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    apiRequest<DashboardLog[]>({
      method: "GET",
      path: `${apiBase()}/dashboard/activity?limit=${limit}`,
      signal: ac.signal,
    })
      .then((payload) => {
        if (!aliveRef.current) return;
        setData(Array.isArray(payload) ? payload : []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!aliveRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      aliveRef.current = false;
      ac.abort();
    };
  }, [nonce, limit]);

  useEffect(() => {
    if (pollMs <= 0) return;
    const id = setInterval(() => setNonce((n) => n + 1), pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return { data, loading, error, reload };
}

/* -------------------------------------------------------------------------- */
/*                          Hook: useReportBreakdown                          */
/* -------------------------------------------------------------------------- */

interface UseReportBreakdownResult {
  data: ReportBreakdown | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Build a rich report breakdown from the raw `orders` endpoint.
 * The backend doesn't ship an aggregate endpoint, so we fetch
 * the relevant orders (with items + product + payment) and
 * roll them up client-side. The result is everything the
 * Reports page needs to render all its charts.
 */
export function useReportBreakdown(
  filters: ReportFilters,
  pollMs = 0,
): UseReportBreakdownResult {
  const [data, setData] = useState<ReportBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const aliveRef = useRef(true);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    aliveRef.current = true;
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const search = new URLSearchParams();
    search.set("from", `${filters.from} 00:00:00`);
    search.set("to", `${filters.to} 23:59:59`);
    if (filters.cashierId !== undefined)
      search.set("cashierId", String(filters.cashierId));
    // Page size big enough to cover a normal weekly report.
    search.set("limit", "500");

    apiRequest<ApiOrder[]>({
      method: "GET",
      path: `${apiBase()}/orders?${search.toString()}`,
      signal: ac.signal,
    })
      .then((orders) => {
        if (!aliveRef.current) return;
        setData(buildBreakdown(orders ?? []));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!aliveRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : String(err));
        setLoading(false);
      });

    return () => {
      aliveRef.current = false;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, filters.from, filters.to, filters.cashierId, filters.categoryId]);

  useEffect(() => {
    if (pollMs <= 0) return;
    const id = setInterval(() => setNonce((n) => n + 1), pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return { data, loading, error, reload };
}

/* -------------------------------------------------------------------------- */
/*                            Local helpers                                   */
/* -------------------------------------------------------------------------- */

function apiBase(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  return "http://localhost:4000/api";
}

/** Pure aggregator: orders -> ReportBreakdown. */
function buildBreakdown(orders: ApiOrder[]): ReportBreakdown {
  const paid = orders.filter((o) => o.status === "paid");
  const refunded = orders.filter((o) => o.status === "refunded");

  const totalSales = paid.reduce((s, o) => s + toNum(o.totalAmount), 0);
  const taxTotal = paid.reduce((s, o) => s + toNum(o.taxAmount), 0);
  const totalOrders = paid.length;
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

  // ---- by day -------------------------------------------------------------
  const byDayMap = new Map<string, { ordersCount: number; total: number }>();
  for (const o of paid) {
    const day = (o.createdAt || "").slice(0, 10);
    if (!day) continue;
    const entry = byDayMap.get(day) ?? { ordersCount: 0, total: 0 };
    entry.ordersCount += 1;
    entry.total += toNum(o.totalAmount);
    byDayMap.set(day, entry);
  }
  const byDay: DashboardSalesByDay[] = Array.from(byDayMap.entries())
    .map(([day, v]) => ({
      day,
      ordersCount: v.ordersCount,
      total: v.total,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // ---- top products --------------------------------------------------------
  const productMap = new Map<
    number,
    { productId: number; name: string; totalSold: number; revenue: number }
  >();
  for (const o of paid) {
    if (!o.items) continue;
    for (const it of o.items) {
      const id = it.productId;
      const entry = productMap.get(id) ?? {
        productId: id,
        name: it.product?.name ?? "Produit",
        totalSold: 0,
        revenue: 0,
      };
      entry.totalSold += Number(it.quantity || 0);
      entry.revenue += toNum(it.lineTotal);
      productMap.set(id, entry);
    }
  }
  const topProducts: DashboardTopSeller[] = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      totalSold: p.totalSold,
      revenue: p.revenue,
    }));

  // ---- by category ---------------------------------------------------------
  const categoryMap = new Map<
    number,
    { categoryId: number; name: string; total: number; count: number }
  >();
  for (const o of paid) {
    if (!o.items) continue;
    for (const it of o.items) {
      const cat = it.product?.category;
      const id = cat?.id ?? 0;
      const name = cat?.label ?? "Autre";
      const entry = categoryMap.get(id) ?? {
        categoryId: id,
        name,
        total: 0,
        count: 0,
      };
      entry.total += toNum(it.lineTotal);
      entry.count += Number(it.quantity || 0);
      categoryMap.set(id, entry);
    }
  }
  const byCategory = Array.from(categoryMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  // ---- by cashier ----------------------------------------------------------
  const cashierMap = new Map<
    number,
    { cashierId: number; name: string; code: string; total: number; orders: number }
  >();
  for (const o of paid) {
    const c = o.cashier;
    if (!c) continue;
    const entry = cashierMap.get(c.id) ?? {
      cashierId: c.id,
      name: c.fullName || "—",
      code: c.code || "—",
      total: 0,
      orders: 0,
    };
    entry.total += toNum(o.totalAmount);
    entry.orders += 1;
    cashierMap.set(c.id, entry);
  }
  const byCashier = Array.from(cashierMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  // ---- by payment method ---------------------------------------------------
  const payMap = new Map<string, { method: string; total: number; count: number }>();
  for (const o of paid) {
    const method = o.payment?.method ?? "other";
    const entry = payMap.get(method) ?? {
      method,
      total: 0,
      count: 0,
    };
    entry.total += toNum(o.payment?.amount ?? o.totalAmount);
    entry.count += 1;
    payMap.set(method, entry);
  }
  const byPaymentMethod = Array.from(payMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  // ---- by hour -------------------------------------------------------------
  const hourMap = new Map<number, { hour: number; count: number; total: number }>();
  for (const o of paid) {
    const d = new Date(o.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const h = d.getHours();
    const entry = hourMap.get(h) ?? { hour: h, count: 0, total: 0 };
    entry.count += 1;
    entry.total += toNum(o.totalAmount);
    hourMap.set(h, entry);
  }
  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const entry = hourMap.get(hour);
    return {
      hour,
      count: entry?.count ?? 0,
      total: entry?.total ?? 0,
    };
  });

  return {
    totalSales,
    totalOrders,
    averageTicket,
    refunds: refunded.length,
    taxTotal,
    byDay,
    topProducts,
    byCategory,
    byCashier,
    byPaymentMethod,
    byHour,
  };
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "."));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v as { toString(): string });
  return Number.isFinite(n) ? n : 0;
}

/* -------------------------------------------------------------------------- */
/*                              Default filters                                */
/* -------------------------------------------------------------------------- */

/** Returns default report filters = "this month, today included". */
export function defaultReportFilters(): ReportFilters {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: toIsoDay(firstOfMonth),
    to: toIsoDay(today),
  };
}

/** YYYY-MM-DD for a Date in the user's local timezone. */
export function toIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
