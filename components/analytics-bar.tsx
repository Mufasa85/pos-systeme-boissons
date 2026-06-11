"use client"

import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react"
import { salesTrend, topSellers } from "@/lib/data"

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string
  value: string
  delta: string
  icon: React.ElementType
}) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3">
      <div className="brand-soft flex h-10 w-10 items-center justify-center rounded-xl">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-bold leading-tight">{value}</p>
      </div>
      <span className="ml-auto text-xs font-semibold text-emerald-600">
        {delta}
      </span>
    </div>
  )
}

export function AnalyticsBar() {
  const max = Math.max(...salesTrend.map((d) => d.sales))

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Today's sales"
        value="$1,284"
        delta="+12%"
        icon={DollarSign}
      />
      <StatCard
        label="Orders"
        value="86"
        delta="+8%"
        icon={ShoppingCart}
      />

      {/* Weekly trend */}
      <div className="glass rounded-2xl p-3 sm:col-span-2 xl:col-span-1">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">This week</p>
          <TrendingUp className="brand-text h-4 w-4" />
        </div>
        <div className="flex h-12 items-end gap-1.5">
          {salesTrend.map((d) => (
            <div
              key={d.day}
              className="brand-bg flex-1 rounded-md"
              style={{ height: `${Math.max((d.sales / max) * 100, 12)}%` }}
              title={`${d.day}: $${d.sales}`}
            />
          ))}
        </div>
      </div>

      {/* Top seller */}
      <div className="glass rounded-2xl p-3 sm:col-span-2 xl:col-span-1">
        <p className="mb-2 text-xs text-muted-foreground">Best seller</p>
        <p className="text-sm font-bold leading-tight">{topSellers[0].name}</p>
        <p className="text-xs text-muted-foreground">
          {topSellers[0].sold} sold today
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="brand-bg h-full w-4/5 rounded-full" />
        </div>
      </div>
    </div>
  )
}
