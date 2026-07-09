"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  DollarSign,
  FileText,
  Loader2,
  Lock,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { PosShell } from "@/components/pos-shell";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  fetchSupervisionStats,
  type SupervisionStats,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/format";

export default function SupervisionPage() {
  const [stats, setStats] = useState<SupervisionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSupervisionStats();
      setStats(data);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erreur de chargement";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const utilizationPct = stats ? Math.min(100, stats.utilization) : 0;
  const isCritical = stats ? stats.utilization >= 90 : false;
  const isWarning = stats ? stats.utilization >= 75 && stats.utilization < 90 : false;

  return (
    <PosShell active="supervision" title="Supervision de la plateforme">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>
            {loading
              ? "Chargement…"
              : error
                ? "Erreur de chargement"
                : `Mis à jour à ${new Date().toLocaleTimeString("fr-FR")}`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {error ? (
        <div className="glass flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : loading && !stats ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stats ? (
        <div className="space-y-4">
          {/* Status banner */}
          {stats.isBlocked ? (
            <div className="glass flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <Lock className="h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">
                  Plateforme bloquée — Quota atteint
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatNumber(stats.invoicesPrinted)} / {formatNumber(stats.quota)} factures émises.
                  L'enregistrement de nouvelles factures est suspendu.
                </p>
              </div>
            </div>
          ) : null}

          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={FileText}
              label="Factures émises"
              value={formatNumber(stats.invoicesPrinted)}
              sub={`Aujourd'hui: ${formatNumber(stats.invoicesToday)}`}
              tone={isCritical ? "danger" : "default"}
            />
            <KpiCard
              icon={ShieldCheck}
              label="Quota configuré"
              value={formatNumber(stats.quota)}
              sub={stats.quotaEnabled ? "Quota actif" : "Quota désactivé"}
              tone={stats.quotaEnabled ? "default" : "muted"}
            />
            <KpiCard
              icon={TrendingUp}
              label="Factures restantes"
              value={formatNumber(stats.remaining)}
              sub={`Ce mois: ${formatNumber(stats.invoicesThisMonth)}`}
              tone={stats.remaining === 0 ? "danger" : "default"}
            />
            <KpiCard
              icon={DollarSign}
              label="Revenu total"
              value={formatCurrency(stats.totalRevenue, "CDF")}
              sub={`${stats.activeCashiers} caissiers actifs`}
              tone="default"
            />
          </div>

          {/* Utilization progress bar */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Taux d'utilisation du quota
              </h3>
              <span
                className={cn(
                  "text-2xl font-bold",
                  isCritical
                    ? "text-destructive"
                    : isWarning
                      ? "text-amber-500"
                      : "text-emerald-500",
                )}
              >
                {utilizationPct}%
              </span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isCritical
                    ? "bg-destructive"
                    : isWarning
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                )}
                style={{ width: `${utilizationPct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{formatNumber(stats.invoicesPrinted)} émises</span>
              <span>{formatNumber(stats.quota)} quota total</span>
            </div>
          </div>

          {/* Quick status indicators */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatusPill
              icon={stats.isBlocked ? PauseCircle : PlayCircle}
              label="Statut facturation"
              value={stats.isBlocked ? "Bloquée" : "Active"}
              tone={stats.isBlocked ? "danger" : "success"}
            />
            <StatusPill
              icon={Users}
              label="Caissiers actifs"
              value={formatNumber(stats.activeCashiers)}
              tone="default"
            />
            <StatusPill
              icon={FileText}
              label="Factures ce mois"
              value={formatNumber(stats.invoicesThisMonth)}
              tone="default"
            />
          </div>
        </div>
      ) : null}
    </PosShell>
  );
}

// ── Sub-components ──────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger" | "muted";
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            tone === "danger"
              ? "bg-destructive/10 text-destructive"
              : tone === "muted"
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold",
          tone === "danger" ? "text-destructive" : "",
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          tone === "success"
            ? "bg-emerald-500/10 text-emerald-600"
            : tone === "danger"
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
