"use client";

import { useMemo } from "react";
import {
  CreditCard,
  DollarSign,
  Loader2,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/charts/sparkline";
import { useDashboardSummary } from "@/lib/use-dashboard";
import {
  formatCurrency,
  formatNumber,
  pctChange,
  toNumber,
} from "@/lib/format";

/**
 * AnalyticsBar — compact KPI strip shown at the top of the
 * dashboard. Pulls real data from `GET /dashboard/summary` and
 * auto-refreshes every 30s.
 */
export function AnalyticsBar() {
  const { data, loading, error } = useDashboardSummary(30_000);

  const totalsForSpark = useMemo(
    () => (data?.salesByDay ?? []).map((d) => toNumber(d.total)),
    [data],
  );

  const pct = useMemo(() => pctChange(totalsForSpark), [totalsForSpark]);
  const ordersPct = useMemo(
    () => pctChange((data?.salesByDay ?? []).map((d) => d.ordersCount)),
    [data],
  );

  const bestSeller = data?.topSellers?.[0];
  const bestSellerPct = useMemo(() => {
    if (!data?.topSellers?.length) return 0;
    const top = data.topSellers[0].revenue || 0;
    const total = data.topSellers.reduce((s, t) => s + (t.revenue || 0), 0);
    return total > 0 ? Math.round((top / total) * 100) : 0;
  }, [data]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={DollarSign}
        label="Ventes aujourd'hui"
        value={
          data ? formatCurrency(data.todaySales, "CDF") : loading ? "…" : "0 FC"
        }
        delta={pct}
        loading={loading}
        error={error}
        accent
      />
      <KpiCard
        icon={ShoppingCart}
        label="Commandes"
        value={data ? formatNumber(data.todayOrders) : loading ? "…" : "0"}
        delta={ordersPct}
        loading={loading}
        error={error}
      />

      {/* Weekly trend */}
      <div className="glass rounded-2xl p-3 sm:col-span-2 xl:col-span-1">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">7 derniers jours</p>
          <TrendingUp className="brand-text h-4 w-4" />
        </div>
        {totalsForSpark.length === 0 ? (
          <div className="flex h-12 items-center gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-muted/40"
                style={{ height: "40%" }}
              />
            ))}
          </div>
        ) : (
          <div className="-mx-1">
            <Sparkline
              values={totalsForSpark}
              width={220}
              height={48}
              className="w-full"
              ariaLabel="Évolution des ventes sur 7 jours"
            />
          </div>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground">
          {totalsForSpark.length > 0
            ? `Max ${formatCurrency(Math.max(...totalsForSpark), "CDF")}`
            : "—"}
        </p>
      </div>

      {/* Top seller */}
      <div className="glass rounded-2xl p-3 sm:col-span-2 xl:col-span-1">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Meilleure vente</p>
          <Users className="brand-text h-4 w-4" />
        </div>
        <p className="line-clamp-1 text-sm font-bold leading-tight">
          {bestSeller?.name ?? "Aucune vente"}
        </p>
        <p className="text-xs text-muted-foreground">
          {bestSeller
            ? `${formatNumber(bestSeller.totalSold)} vendus`
            : "Aujourd'hui"}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="brand-bg h-full rounded-full transition-all duration-700"
            style={{ width: `${bestSellerPct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {bestSellerPct}% du top 10
        </p>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  loading,
  error,
  accent = false,
}: {
  label: string;
  value: string;
  delta: number | null;
  icon: React.ElementType;
  loading?: boolean;
  error?: string | null;
  accent?: boolean;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          accent ? "brand-bg text-white" : "brand-soft",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-bold leading-tight tabular-nums">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            value
          )}
        </p>
        {error ? (
          <p className="truncate text-[10px] text-destructive" title={error}>
            {error}
          </p>
        ) : delta !== null ? (
          <p
            className={cn(
              "text-[10px] font-semibold tabular-nums",
              positive ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {positive ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs hier
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">—</p>
        )}
      </div>
    </div>
  );
}

export const _unusedCreditCard = CreditCard;
