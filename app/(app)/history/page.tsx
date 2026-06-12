"use client";

import { PosShell } from "@/components/pos-shell";

export default function HistoryPage() {
  const history = [
    { id: "ORD-10291", status: "Paid", date: "2026-06-10", total: "$24.80" },
    { id: "ORD-10290", status: "Paid", date: "2026-06-10", total: "$58.10" },
    {
      id: "ORD-10289",
      status: "Refunded",
      date: "2026-06-09",
      total: "-$12.00",
    },
    { id: "ORD-10288", status: "Paid", date: "2026-06-09", total: "$94.25" },
  ];

  return (
    <PosShell active="history" title="History">
      <div className="glass-strong rounded-3xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Historique des commandes</p>
          <p className="text-xs text-muted-foreground">4 dernières entrées</p>
        </div>

        <div className="space-y-2">
          {history.map((h) => (
            <div
              key={h.id}
              className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold">{h.id}</p>
                <p className="text-xs text-muted-foreground">{h.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    h.status === "Paid"
                      ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600"
                      : "rounded-full bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive"
                  }
                >
                  {h.status}
                </span>
                <p className="text-sm font-bold">{h.total}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PosShell>
  );
}
