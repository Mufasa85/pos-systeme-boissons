import { PosShell } from "@/components/pos-shell"
import { AnalyticsBar } from "@/components/analytics-bar"

export default function DashboardPage() {
  return (
    <PosShell active="dashboard" title="Dashboard">
      <AnalyticsBar />

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="glass-strong rounded-3xl p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Recent activity</p>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </div>
          <div className="space-y-2">
            {[
              { time: "Today · 09:15", label: "Order placed", value: "$128.40" },
              { time: "Today · 11:42", label: "Discount applied", value: "-$12.00" },
              { time: "Today · 13:05", label: "Payment received", value: "$58.10" },
              { time: "Today · 15:30", label: "Order placed", value: "$94.25" },
            ].map((row, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-2xl bg-muted/40 p-3"
              >
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{row.time}</p>
                  <p className="text-sm font-semibold">{row.label}</p>
                </div>
                <p className="text-sm font-bold">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <p className="text-sm font-semibold">Quick stats</p>
          <div className="mt-4 grid grid-cols-1 gap-2">
            {[
              { k: "Avg. order", v: "$24.80" },
              { k: "Top category", v: "Coffee" },
              { k: "Open tickets", v: "3" },
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
    </PosShell>
  )
}

