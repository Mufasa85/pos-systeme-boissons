"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Banknote,
  BarChart3,
  CalendarRange,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Filter,
  Percent,
  PieChart as PieIcon,
  Receipt,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HourHeatmap } from "@/components/charts/hour-heatmap";
import { LineChart } from "@/components/charts/line-chart";
import { PosShell } from "@/components/pos-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  defaultReportFilters,
  useReportBreakdown,
  type ReportFilters,
  type ReportBreakdown,
} from "@/lib/use-dashboard";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatNumber,
  formatPercent,
  toNumber,
} from "@/lib/format";

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

/**
 * ReportsPage — admin analytics hub.
 *
 * Features:
 *   • Date-range filter (presets + custom) with a responsive toolbar
 *   • 4 headline KPIs
 *   • Sales trend line chart (orders + revenue)
 *   • Top-products horizontal bar chart
 *   • Category revenue donut
 *   • Cashier performance ranking
 *   • Payment-method mix
 *   • Hourly heatmap of the activity
 *   • CSV / printable export
 */
export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>(defaultReportFilters());
  const { data, loading, error, reload } = useReportBreakdown(filters, 0);

  const kpis = useMemo(() => buildKpis(filters, data), [filters, data]);
  const trend = useMemo(() => buildTrend(data), [data]);

  return (
    <PosShell active="reports" title="Rapports & analytics">
      <div className="space-y-4">
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          loading={loading}
          onRefresh={reload}
          breakdown={data}
        />

        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

        {/* Headline KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={DollarSign}
            label="Chiffre d'affaires"
            value={formatCurrency(kpis.sales, "CDF")}
            sub={kpis.salesSub}
            delta={kpis.salesDelta}
            loading={loading}
            accent
          />
          <KpiCard
            icon={ShoppingCart}
            label="Commandes payées"
            value={formatNumber(kpis.orders)}
            sub={kpis.ordersSub}
            delta={kpis.ordersDelta}
            loading={loading}
          />
          <KpiCard
            icon={Wallet}
            label="Panier moyen"
            value={formatCurrency(kpis.avgTicket, "CDF")}
            sub="par commande payée"
            loading={loading}
          />
          <KpiCard
            icon={Percent}
            label="Taux de remise effectif"
            value={formatPercent(kpis.discountRate, 1)}
            sub="hors taxes"
            loading={loading}
          />
        </div>

        {/* Sales trend */}
        <div className="glass-strong relative overflow-hidden rounded-3xl p-5">
          <CardHeader
            icon={BarChart3}
            title="Évolution du chiffre d'affaires"
            subtitle={`Du ${formatDate(filters.from)} au ${formatDate(filters.to)}`}
            right={<ChartLegend />}
          />
          <div className="relative mt-2 h-56 w-full sm:h-64 lg:h-72">
            {data && data.byDay.length > 0 ? (
              <LineChart
                series={[
                  {
                    id: "sales",
                    name: "Ventes",
                    values: trend.sales,
                    pointLabels: trend.labels,
                    color: "var(--brand)",
                    formatValue: (v) => formatCurrencyCompact(v, "CDF"),
                  },
                  {
                    id: "orders",
                    name: "Commandes",
                    values: trend.orders,
                    pointLabels: trend.labels,
                    color: "#A855F7",
                    formatValue: (v) => formatNumber(v),
                  },
                ]}
              />
            ) : (
              <EmptyState
                loading={loading}
                message="Aucune vente sur cette période"
              />
            )}
          </div>
        </div>

        {/* Top products + Category donut */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="glass rounded-3xl p-5 xl:col-span-2">
            <CardHeader
              icon={Award}
              title="Top produits"
              subtitle="Classés par chiffre d'affaires sur la période"
              right={
                data && data.topProducts.length > 0 ? (
                  <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)]">
                    {data.topProducts.length} produits
                  </span>
                ) : null
              }
            />
            <div className="mt-3">
              <BarChart
                items={(data?.topProducts ?? []).map((p) => ({
                  label: p.name ?? "Produit",
                  value: p.revenue,
                  secondaryValue: p.totalSold,
                  secondaryLabel: `${formatNumber(p.totalSold)} vendus`,
                }))}
                formatValue={(n) => formatCurrencyCompact(n, "CDF")}
                emptyLabel="Aucune vente sur cette période"
              />
            </div>
          </div>

          <div className="glass rounded-3xl p-5">
            <CardHeader
              icon={PieIcon}
              title="Mix par catégorie"
              subtitle="Part du CA par catégorie"
            />
            {data && data.byCategory.length > 0 ? (
              <div className="mt-3">
                <DonutChart
                  slices={data.byCategory.slice(0, 6).map((c) => ({
                    label: c.name,
                    value: c.total,
                  }))}
                  size={170}
                  thickness={24}
                  centerLabel="CA"
                  centerValue={formatCurrencyCompact(
                    data.byCategory.reduce((s, c) => s + c.total, 0),
                    "CDF",
                  )}
                  formatValue={(n) => formatCurrencyCompact(n, "CDF")}
                />
              </div>
            ) : (
              <EmptyState
                loading={loading}
                message="Pas encore de catégories"
              />
            )}
          </div>
        </div>

        {/* Cashier ranking + Payment methods */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="glass rounded-3xl p-5 lg:col-span-2">
            <CardHeader
              icon={Users}
              title="Performance caissiers"
              subtitle="Volume de ventes par caissier"
            />
            <div className="mt-3">
              <BarChart
                items={(data?.byCashier ?? []).map((c) => ({
                  label: c.name,
                  value: c.total,
                  secondaryValue: c.orders,
                  secondaryLabel: `${formatNumber(c.orders)} cmd`,
                }))}
                formatValue={(n) => formatCurrencyCompact(n, "CDF")}
                emptyLabel="Aucun caissier enregistré"
              />
            </div>
          </div>

          <div className="glass rounded-3xl p-5">
            <CardHeader
              icon={CreditCard}
              title="Modes de paiement"
              subtitle="Répartition par méthode"
            />
            <div className="mt-3 space-y-2.5">
              {(data?.byPaymentMethod ?? []).length === 0 ? (
                <EmptyState
                  loading={loading}
                  message="Aucun paiement enregistré"
                />
              ) : (
                <>
                  {data?.byPaymentMethod.map((p) => {
                    const total = data.byPaymentMethod.reduce(
                      (s, x) => s + x.total,
                      0,
                    );
                    const pct = total > 0 ? (p.total / total) * 100 : 0;
                    return (
                      <div
                        key={p.method}
                        className="rounded-2xl bg-muted/30 p-3"
                      >
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <PaymentIcon method={p.method} />
                            <span className="font-semibold capitalize">
                              {paymentLabel(p.method)}
                            </span>
                          </div>
                          <span className="font-bold tabular-nums">
                            {formatCurrency(p.total, "CDF")}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="brand-bg h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatPercent(pct, 0)} · {formatNumber(p.count)}{" "}
                          {p.count > 1 ? "paiements" : "paiement"}
                        </p>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hourly heatmap + Tax recap */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div
            className="glass relative rounded-3xl p-5 lg:col-span-2"
            data-heatmap-root
          >
            <CardHeader
              icon={Clock}
              title="Activité horaire"
              subtitle="Heatmap des commandes par tranche horaire"
            />
            <div className="mt-3">
              <HourHeatmap
                data={data?.byHour ?? []}
                metric="count"
                formatValue={(n) => formatNumber(n)}
              />
            </div>
          </div>

          <div className="glass rounded-3xl p-5">
            <CardHeader
              icon={Banknote}
              title="Récapitulatif fiscal"
              subtitle="TVA & remboursements"
            />
            <ul className="mt-3 space-y-2.5 text-sm">
              <RecapRow
                icon={Coins}
                label="TVA collectée"
                value={formatCurrency(kpis.taxTotal, "CDF")}
                color="#0EA5E9"
              />
              <RecapRow
                icon={Receipt}
                label="Commandes payées"
                value={formatNumber(kpis.orders)}
                color="#22C55E"
              />
              <RecapRow
                icon={TrendingDown}
                label="Remboursements"
                value={formatNumber(data?.refunds ?? 0)}
                color="#F43F5E"
              />
              <RecapRow
                icon={Percent}
                label="Remises"
                value={formatCurrency(kpis.discountTotal, "CDF")}
                color="#F59E0B"
              />
            </ul>
          </div>
        </div>
      </div>
    </PosShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Sub-components                                  */
/* -------------------------------------------------------------------------- */

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

function ChartLegend() {
  return (
    <div className="hidden items-center gap-3 text-xs sm:flex">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand)]" />
        <span className="text-muted-foreground">Ventes (CDF)</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#A855F7]" />
        <span className="text-muted-foreground">Commandes</span>
      </span>
    </div>
  );
}

function KpiCard({
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
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}

function RecapRow({
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
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </li>
  );
}

function EmptyState({
  loading,
  message,
}: {
  loading: boolean;
  message: string;
}) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20 p-8 text-sm text-muted-foreground">
      {loading ? "Chargement…" : message}
    </div>
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      <span>
        <strong>Erreur :</strong> {message}
      </span>
      <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        Réessayer
      </Button>
    </div>
  );
}

function PaymentIcon({ method }: { method: string }) {
  const m = (method ?? "").toLowerCase();
  if (m === "cash") return <Banknote className="h-4 w-4 text-emerald-600" />;
  if (m === "card") return <CreditCard className="h-4 w-4 text-sky-600" />;
  if (m === "mobile") return <Wallet className="h-4 w-4 text-purple-600" />;
  return <Coins className="h-4 w-4 text-amber-600" />;
}

function paymentLabel(method: string): string {
  const m = (method ?? "").toLowerCase();
  if (m === "cash") return "Espèces";
  if (m === "card") return "Carte";
  if (m === "mobile") return "Mobile";
  return "Autre";
}

/* -------------------------------------------------------------------------- */
/*                              Filters                                       */
/* -------------------------------------------------------------------------- */

function FiltersBar({
  filters,
  onChange,
  loading,
  onRefresh,
  breakdown,
}: {
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
  loading: boolean;
  onRefresh: () => void;
  breakdown: ReportBreakdown | null;
}) {
  const setPreset = (preset: "today" | "7d" | "30d" | "month" | "year") => {
    const today = new Date();
    const start = new Date(today);
    if (preset === "today") {
      // same
    } else if (preset === "7d") {
      start.setDate(today.getDate() - 6);
    } else if (preset === "30d") {
      start.setDate(today.getDate() - 29);
    } else if (preset === "month") {
      start.setDate(1);
    } else {
      start.setMonth(0, 1);
    }
    onChange({
      ...filters,
      from: toIsoDay(start),
      to: toIsoDay(today),
    });
  };

  return (
    <div className="glass-strong rounded-3xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="brand-text h-4 w-4" />
          Période
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "today", label: "Aujourd'hui" },
            { id: "7d", label: "7 jours" },
            { id: "30d", label: "30 jours" },
            { id: "month", label: "Ce mois" },
            { id: "year", label: "Cette année" },
          ].map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant="ghost"
              className="h-8 rounded-full px-3 text-xs"
              onClick={() =>
                setPreset(p.id as "today" | "7d" | "30d" | "month" | "year")
              }
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <DateField
            label="Du"
            value={filters.from}
            onChange={(v) => onChange({ ...filters, from: v })}
          />
          <DateField
            label="Au"
            value={filters.to}
            onChange={(v) => onChange({ ...filters, to: v })}
          />

          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="gap-1.5"
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />
            Actualiser
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCsv(breakdown, filters)}
            className="gap-1.5"
            disabled={!breakdown}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            Imprimer
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" />
        <span>
          {formatDate(filters.from)} → {formatDate(filters.to)}
        </span>
        {breakdown ? (
          <span className="ml-auto">
            {formatNumber(breakdown.totalOrders)} commandes ·{" "}
            {formatCurrency(breakdown.totalSales, "CDF")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-2.5 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-foreground outline-none"
      />
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Data shaping / helpers                             */
/* -------------------------------------------------------------------------- */

interface KpiSummary {
  sales: number;
  salesSub: string;
  salesDelta: number | null;
  orders: number;
  ordersSub: string;
  ordersDelta: number | null;
  avgTicket: number;
  discountRate: number;
  discountTotal: number;
  taxTotal: number;
}

function buildKpis(
  filters: ReportFilters,
  data: ReportBreakdown | null,
): KpiSummary {
  if (!data) {
    return {
      sales: 0,
      salesSub: "—",
      salesDelta: null,
      orders: 0,
      ordersSub: "—",
      ordersDelta: null,
      avgTicket: 0,
      discountRate: 0,
      discountTotal: 0,
      taxTotal: 0,
    };
  }
  return {
    sales: data.totalSales,
    salesSub: `${formatDate(filters.from)} → ${formatDate(filters.to)}`,
    salesDelta: null,
    orders: data.totalOrders,
    ordersSub: `dont ${formatNumber(data.refunds)} remboursée(s)`,
    ordersDelta: null,
    avgTicket: data.averageTicket,
    discountRate: 0,
    discountTotal: 0,
    taxTotal: data.taxTotal,
  };
}

function buildTrend(data: ReportBreakdown | null): {
  sales: number[];
  orders: number[];
  labels: string[];
} {
  if (!data) return { sales: [], orders: [], labels: [] };
  return {
    sales: data.byDay.map((d) => toNumber(d.total)),
    orders: data.byDay.map((d) => toNumber(d.ordersCount)),
    labels: data.byDay.map((d) => shortDate(d.day)),
  };
}

function shortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

function toIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function exportCsv(data: ReportBreakdown | null, filters: ReportFilters) {
  if (!data) return;
  const lines: string[] = [];
  lines.push(`# Période : ${filters.from} → ${filters.to}`);
  lines.push("");
  lines.push("Section;Clé;Valeur");
  lines.push(`KPI;CA total;${data.totalSales}`);
  lines.push(`KPI;Commandes;${data.totalOrders}`);
  lines.push(`KPI;Panier moyen;${data.averageTicket.toFixed(2)}`);
  lines.push(`KPI;TVA;${data.taxTotal.toFixed(2)}`);
  lines.push(`KPI;Remboursements;${data.refunds}`);
  lines.push("");
  lines.push("Jour;Commandes;CA");
  for (const d of data.byDay) {
    lines.push(`${d.day};${d.ordersCount};${d.total.toFixed(2)}`);
  }
  lines.push("");
  lines.push("Produit;Vendus;CA");
  for (const p of data.topProducts) {
    lines.push(
      `${(p.name ?? "").replace(/;/g, ",")};${p.totalSold};${p.revenue.toFixed(2)}`,
    );
  }
  lines.push("");
  lines.push("Catégorie;Quantité;CA");
  for (const c of data.byCategory) {
    lines.push(`${c.name.replace(/;/g, ",")};${c.count};${c.total.toFixed(2)}`);
  }
  lines.push("");
  lines.push("Caissier;Commandes;CA");
  for (const c of data.byCashier) {
    lines.push(
      `${c.name.replace(/;/g, ",")};${c.orders};${c.total.toFixed(2)}`,
    );
  }
  lines.push("");
  lines.push("Mode de paiement;Nombre;Montant");
  for (const p of data.byPaymentMethod) {
    lines.push(`${p.method};${p.count};${p.total.toFixed(2)}`);
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport-joac-${filters.from}_${filters.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
