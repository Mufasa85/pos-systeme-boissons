"use client";

import { AnalyticsBar } from "@/components/analytics-bar";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { PosShell } from "@/components/pos-shell";

/**
 * Dashboard — manager / admin entry point.
 *
 * Layout:
 *   • AnalyticsBar       — 4 headline KPI cards (auto-refresh)
 *   • AnalyticsDashboard — full analytics view (charts, top sellers, etc.)
 */
export default function DashboardPage() {
  return (
    <PosShell active="dashboard" title="Tableau de bord">
      <AnalyticsBar />
      <div className="mt-4">
        <AnalyticsDashboard />
      </div>
    </PosShell>
  );
}
