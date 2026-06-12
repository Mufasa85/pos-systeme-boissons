"use client";

import { AnalyticsBar } from "@/components/analytics-bar";
import { AuthGuard } from "@/components/auth-guard";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-background overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <AnalyticsBar />

            <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
              <div className="glass-strong rounded-3xl p-5 xl:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Activité récente</p>
                  <p className="text-xs text-muted-foreground">
                    7 derniers jours
                  </p>
                </div>
                <div className="space-y-2">
                  {[
                    {
                      time: "Aujourd'hui · 09:15",
                      label: "Commande passée",
                      value: "$128.40",
                    },
                    {
                      time: "Aujourd'hui · 11:42",
                      label: "Remise appliquée",
                      value: "-$12.00",
                    },
                    {
                      time: "Aujourd'hui · 13:05",
                      label: "Paiement reçu",
                      value: "$58.10",
                    },
                    {
                      time: "Aujourd'hui · 15:30",
                      label: "Commande passée",
                      value: "$94.25",
                    },
                  ].map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-2xl bg-muted/40 p-3"
                    >
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {row.time}
                        </p>
                        <p className="text-sm font-semibold">{row.label}</p>
                      </div>
                      <p className="text-sm font-bold">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-3xl p-5">
                <p className="text-sm font-semibold">Statistiques rapides</p>
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {[
                    { k: "Panier moyen", v: "$24.80" },
                    { k: "Catégorie top", v: "Cafés" },
                    { k: "Tickets ouverts", v: "3" },
                  ].map((s) => (
                    <div
                      key={s.k}
                      className="flex items-center justify-between rounded-2xl bg-muted/40 p-3"
                    >
                      <p className="text-sm text-muted-foreground">{s.k}</p>
                      <p className="text-sm font-bold">{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
