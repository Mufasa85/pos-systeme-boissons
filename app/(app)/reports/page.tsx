"use client";

import { PosShell } from "@/components/pos-shell";
import { salesTrend, topSellers } from "@/lib/data";

export default function ReportsPage() {
  const max = Math.max(...salesTrend.map((d) => d.sales));

  return (
    <PosShell active="reports" title="Reports">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="glass-strong rounded-3xl p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Tendance des ventes</p>
            <p className="text-xs text-muted-foreground">Cette semaine</p>
          </div>

          <div className="flex h-24 items-end gap-2">
            {salesTrend.map((d) => (
              <div
                key={d.day}
                className="flex-1 rounded-md brand-soft"
                style={{ height: `${Math.max((d.sales / max) * 100, 12)}%` }}
                title={`${d.day}: $${d.sales}`}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {salesTrend.slice(-4).map((d) => (
              <div
                key={d.day}
                className="rounded-2xl bg-muted/40 p-3 text-center"
              >
                <p className="text-xs text-muted-foreground">{d.day}</p>
                <p className="text-sm font-bold">${d.sales}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <p className="text-sm font-semibold">Top ventes</p>
          <div className="mt-4 space-y-2">
            {topSellers.map((s) => (
              <div
                key={s.name}
                className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Vendus aujourd'hui
                  </p>
                </div>
                <p className="text-sm font-bold">{s.sold}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          {
            title: "Estimation bénéfice",
            value: "$2,410",
            desc: "Basé sur les dernières commandes",
          },
          {
            title: "Taux de remboursement",
            value: "1.2%",
            desc: "Calculé automatiquement",
          },
          {
            title: "Visites clients",
            value: "1,064",
            desc: "Total cette semaine",
          },
        ].map((c) => (
          <div key={c.title} className="glass rounded-3xl p-5">
            <p className="text-xs text-muted-foreground">{c.title}</p>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
          </div>
        ))}
      </div>
    </PosShell>
  );
}
