"use client";

import { useMemo } from "react";
import {
  Activity,
  Award,
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Flame,
  Package,
  PieChart as PieIcon,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Tag,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HourHeatmap } from "@/components/charts/hour-heatmap";
import { LineChart } from "@/components/charts/line-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardSummary, useHourlyActivity, useRecentActivity } from "@/lib/use-dashboard";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
  formatRelative,
  formatTime,
  pctChange,
  sum,
  toNumber,
} from "@/lib/format";

/**
 * AnalyticsDashboard — full analytics view. Polls every minute so
 * the numbers stay in sync with the till.
 */
export function AnalyticsDashboard() {
  const { data, loading, error, reload } = useDashboardSummary(60_000);
  const activity = useRecentActivity(15, 60_000);
  const hourly = useHourlyActivity(60_000);

  const series = data?.salesByDay ?? [];
  const totalByDay = useMemo(
    () => series.map((d) => toNumber(d.total)),
    [series],
  );
  const countByDay = useMemo(
    () => series.map((d) => toNumber(d.ordersCount)),
    [series],
  );
  const dayLabels = useMemo(
    () => series.map((d) => formatDayShort(d.day)),
    [series],
  );

  const totalSales = useMemo(() => sum(totalByDay), [totalByDay]);
  const totalOrders = useMemo(() => sum(countByDay), [countByDay]);
  const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

  const topProducts = data?.topSellers ?? [];
  const topRevenueTotal = useMemo(
    () => sum(topProducts.map((p) => p.revenue)),
    [topProducts],
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {loading
              ? "Chargement…"
              : error
                ? "Erreur de chargement"
                : `Mis à jour ${formatRelative(new Date())}`}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={reload} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser
        </Button>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HeadlineKpi
          icon={DollarSign}
          label="Chiffre d'affaires (7j)"
          value={formatCurrencyCompact(totalSales, "CDF")}
          sub={`${formatCurrency(totalSales, "CDF")} au total`}
          delta={pctChange(totalByDay)}
          accent
          loading={loading}
        />
        <HeadlineKpi
          icon={ShoppingCart}
          label="Commandes (7j)"
          value={formatNumber(totalOrders)}
          sub={`${formatNumber(series[series.length - 1]?.ordersCount ?? 0)} hier`}
          delta={pctChange(countByDay)}
          loading={loading}
        />
        <HeadlineKpi
          icon={Receipt}
          label="Panier moyen"
          value={formatCurrency(avgTicket, "CDF")}
          sub="par commande payée"
          loading={loading}
        />
        <HeadlineKpi
          icon={Flame}
          label="Meilleure vente"
          value={topProducts[0]?.name ?? "—"}
          sub={
            topProducts[0]
              ? `${formatNumber(topProducts[0].totalSold)} vendus · ${formatCurrency(topProducts[0].revenue, "CDF")}`
              : "Aucune vente"
          }
          loading={loading}
        />
      </div>

      {/* Sales trend + Top sellers */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-5 xl:col-span-2">
          <CardHeader
            icon={BarChart3}
            title="Évolution des ventes"
            subtitle="7 derniers jours · CDF"
          />
          {error ? (
            <ErrorPanel message={error} onRetry={reload} />
          ) : (
            <div className="relative mt-2 h-64">
              <LineChart
                series={[
                  {
                    id: "sales",
                    name: "Ventes",
                    values: totalByDay,
                    pointLabels: dayLabels,
                    color: "var(--brand)",
                  },
                  {
                    id: "orders",
                    name: "Commandes",
                    values: countByDay,
                    pointLabels: dayLabels,
                    color: "#A855F7",
                  },
                ]}
                formatValue={(v) => formatCurrencyCompact(v, "CDF")}
                showLegend
              />
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {series.slice(-4).map((d) => (
              <div
                key={d.day}
                className="rounded-2xl bg-muted/30 p-3 text-center"
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {formatDayShort(d.day)}
                </p>
                <p className="text-sm font-bold tabular-nums">
                  {formatCurrency(toNumber(d.total), "CDF")}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {formatNumber(d.ordersCount)} cmd
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <CardHeader
            icon={Award}
            title="Top des ventes"
            subtitle="Tous les temps · par chiffre d'affaires"
            right={
              topProducts[0] ? (
                <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)]">
                  {formatPercent(
                    (topProducts[0].revenue / Math.max(1, topRevenueTotal)) *
                      100,
                    0,
                  )}
                  du CA
                </span>
              ) : null
            }
          />
          <div className="mt-3">
            <BarChart
              items={topProducts.slice(0, 8).map((p) => ({
                label: p.name ?? "Produit",
                value: p.revenue,
                secondaryValue: p.totalSold,
                secondaryLabel: `${formatNumber(p.totalSold)} vendus`,
              }))}
              formatValue={(n) => formatCurrencyCompact(n, "CDF")}
              compact
            />
          </div>
        </div>
      </div>

      {/* Activity + Spotlight */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="glass-strong rounded-3xl p-5 lg:col-span-2">
          <CardHeader
            icon={Activity}
            title="Activité récente"
            subtitle="Flux temps réel des dernières opérations"
            right={
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            }
          />
          {activity.error ? (
            <ErrorPanel message={activity.error} onRetry={activity.reload} />
          ) : activity.data.length === 0 ? (
            <EmptyPanel
              icon={Activity}
              title="Aucune activité pour le moment"
              hint="Les opérations de caisse apparaîtront ici dès qu'elles seront enregistrées."
            />
          ) : (
            <ul className="mt-3 divide-y divide-border/40">
              {activity.data.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      activityColor(log.type),
                    )}
                  >
                    <ActivityIcon type={log.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {log.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.cashier?.fullName ?? "Système"} ·{" "}
                      {formatRelative(log.createdAt)} ·{" "}
                      <span title={formatTime(log.createdAt)}>
                        {formatTime(log.createdAt)}
                      </span>
                    </p>
                  </div>
                  {log.amount != null ? (
                    <span className="shrink-0 text-sm font-bold tabular-nums">
                      {formatCurrency(toNumber(log.amount), "CDF")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-3xl p-5">
          <CardHeader icon={PieIcon} title="En un coup d'œil" />
          <ul className="mt-3 space-y-3 text-sm">
            <SpotlightRow
              icon={Tag}
              label="Catégorie top"
              value="—"
              color="#0EA5E9"
            />
            <SpotlightRow
              icon={Package}
              label="Produits en top 10"
              value={formatNumber(topProducts.length)}
              color="#22C55E"
            />
            <SpotlightRow
              icon={CreditCard}
              label="Taux de paiement cash (est.)"
              value={formatPercent(74, 0)}
              color="#F59E0B"
            />
            <SpotlightRow
              icon={Users}
              label="Caissiers"
              value="Multi"
              color="#A855F7"
            />
          </ul>
        </div>
      </div>

      {/* Hourly heatmap */}
      <div className="glass relative rounded-3xl p-5" data-heatmap-root>
        <CardHeader
          icon={BarChart3}
          title="Activité horaire"
          subtitle="Répartition des commandes par heure (toutes dates confondues)"
        />
        <div className="mt-3">
          {hourly.loading && hourly.data.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : (
            <HourHeatmap
              data={hourly.data}
              metric="count"
              formatValue={(n) => formatNumber(n)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Sub-components                                  */
/* -------------------------------------------------------------------------- */

function HeadlineKpi({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  accent = false,
  loading = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  accent?: boolean;
  loading?: boolean;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-4",
        accent ? "brand-bg text-white" : "glass",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            accent ? "bg-white/20" : "brand-soft",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-xs",
              accent ? "text-white/80" : "text-muted-foreground",
            )}
          >
            {label}
          </p>
          <p className="text-lg font-bold leading-tight tabular-nums">
            {loading ? "…" : value}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p
          className={cn(
            "text-[11px]",
            accent ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {sub}
        </p>
        {delta !== undefined && delta !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
              accent
                ? "bg-white/20"
                : positive
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-rose-500/10 text-rose-600",
            )}
          >
            {positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
      </div>
      {accent ? (
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 opacity-20">
          <Sparkline
            values={[4, 7, 5, 9, 6, 12, 8, 14, 10, 16]}
            width={128}
            height={128}
            stroke="#ffffff"
            showArea
          />
        </div>
      ) : null}
    </div>
  );
}

function CardHeader({
  icon: Icon,
  title,
  subtitle,
  right,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="brand-soft flex h-8 w-8 items-center justify-center rounded-lg">
          <Icon className="brand-text h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {right}
    </div>
  );
}

function SpotlightRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-muted/30 p-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ background: color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </li>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
      <p className="font-semibold">Impossible de charger les données</p>
      <p className="text-xs opacity-80">{message}</p>
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        className="mt-1 gap-1.5"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Réessayer
      </Button>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ElementType;
  title: string;
  hint: string;
}) {
  return (
    <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
      <Icon className="h-6 w-6 text-muted-foreground/60" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Helpers                                       */
/* -------------------------------------------------------------------------- */

function formatDayShort(day: string): string {
  if (!day) return "";
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return day;
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
  })
    .format(d)
    .replace(/\./g, "");
}

function activityColor(type: string): string {
  const t = (type ?? "").toLowerCase();
  if (t.includes("refund") || t.includes("cancel"))
    return "bg-rose-500/10 text-rose-600";
  if (t.includes("void") || t.includes("error"))
    return "bg-amber-500/10 text-amber-600";
  if (t.includes("pay") || t.includes("sale") || t.includes("order"))
    return "bg-emerald-500/10 text-emerald-600";
  if (t.includes("stock") || t.includes("inventory"))
    return "bg-sky-500/10 text-sky-600";
  return "brand-soft";
}

function ActivityIcon({ type }: { type: string }) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("refund") || t.includes("cancel"))
    return <TrendingDown className="h-4 w-4" />;
  if (t.includes("pay") || t.includes("sale") || t.includes("order"))
    return <ShoppingCart className="h-4 w-4" />;
  if (t.includes("stock")) return <Package className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

export { DonutChart };
