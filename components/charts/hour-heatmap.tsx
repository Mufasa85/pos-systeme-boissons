"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

export interface HourHeatmapPoint {
  /** 0-23 */
  hour: number;
  /** Number of orders this hour. */
  count: number;
  /** Total sales this hour. */
  total?: number;
}

export interface HourHeatmapProps {
  data: HourHeatmapPoint[];
  /** Value to colour-code by: "count" | "total". */
  metric?: "count" | "total";
  className?: string;
  formatValue?: (n: number) => string;
}

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

/**
 * HourHeatmap — 24-cell heatmap of business activity by hour.
 *
 * The colour intensity of each cell reflects the relative activity
 * of that hour, and a tooltip on hover surfaces the exact value.
 * Below the heatmap, "Open / Peak / Closed" badges summarise the
 * day at a glance.
 */
export function HourHeatmap({
  data,
  metric = "count",
  className,
  formatValue = (n) => String(Math.round(n)),
}: HourHeatmapProps) {
  const [hover, setHover] = useState<{
    hour: number;
    x: number;
    y: number;
  } | null>(null);

  const byHour = useMemo(() => {
    const map = new Map<number, HourHeatmapPoint>();
    for (const p of data) map.set(p.hour, p);
    return Array.from(
      { length: 24 },
      (_, h) => map.get(h) ?? { hour: h, count: 0, total: 0 },
    );
  }, [data]);

  const max = useMemo(
    () => byHour.reduce((m, p) => Math.max(m, p[metric] ?? 0), 0),
    [byHour, metric],
  );

  const total = useMemo(
    () => byHour.reduce((s, p) => s + (p[metric] ?? 0), 0),
    [byHour, metric],
  );

  // Summary KPIs
  const peak = useMemo(() => {
    return byHour.reduce(
      (best, p) =>
        (p[metric] ?? 0) > (byHour[best]?.[metric] ?? 0) ? p.hour : best,
      0,
    );
  }, [byHour, metric]);

  const openHour = useMemo(() => {
    return byHour.findIndex((p) => (p[metric] ?? 0) > 0);
  }, [byHour, metric]);

  const lastActiveHour = useMemo(() => {
    let last = -1;
    byHour.forEach((p, h) => {
      if ((p[metric] ?? 0) > 0) last = h;
    });
    return last;
  }, [byHour, metric]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Heatmap grid */}
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-12">
        {byHour.map((p) => {
          const value = p[metric] ?? 0;
          const intensity = max > 0 ? value / max : 0;
          const isPeak = p.hour === peak && value > 0;
          return (
            <button
              key={p.hour}
              type="button"
              className={cn(
                "group relative flex aspect-square items-center justify-center rounded-lg text-[10px] font-medium tabular-nums transition-all",
                "border border-border/40 bg-muted/30",
                "hover:scale-105 hover:border-foreground/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2",
                isPeak && "ring-2 ring-[var(--brand)]/50",
              )}
              style={{
                background: intensityBg(intensity),
                color: intensity > 0.55 ? "#fff" : undefined,
              }}
              onMouseEnter={(e) => {
                const rect = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                const parentRect = (
                  (e.currentTarget as HTMLElement).closest(
                    "[data-heatmap-root]",
                  ) as HTMLElement
                )?.getBoundingClientRect();
                setHover({
                  hour: p.hour,
                  x: rect.left - (parentRect?.left ?? 0) + rect.width / 2,
                  y: rect.top - (parentRect?.top ?? 0),
                });
              }}
              onMouseLeave={() => setHover(null)}
              onFocus={(e) => {
                const rect = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                const parentRect = (
                  (e.currentTarget as HTMLElement).closest(
                    "[data-heatmap-root]",
                  ) as HTMLElement
                )?.getBoundingClientRect();
                setHover({
                  hour: p.hour,
                  x: rect.left - (parentRect?.left ?? 0) + rect.width / 2,
                  y: rect.top - (parentRect?.top ?? 0),
                });
              }}
              onBlur={() => setHover(null)}
              aria-label={`${p.hour}h: ${formatValue(value)}`}
            >
              {String(p.hour).padStart(2, "0")}h
            </button>
          );
        })}
      </div>

      {/* Legend / summary */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-2.5 py-1 text-muted-foreground">
          <span className="font-semibold text-foreground">Ouverture</span>
          {openHour >= 0 ? `${String(openHour).padStart(2, "0")}h` : "—"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/40 bg-[var(--brand)]/10 px-2.5 py-1 text-[var(--brand)]">
          <span className="font-semibold">Pic</span>
          {peak >= 0 && max > 0 ? `${String(peak).padStart(2, "0")}h` : "—"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-2.5 py-1 text-muted-foreground">
          <span className="font-semibold text-foreground">Fermeture</span>
          {lastActiveHour >= 0
            ? `${String(lastActiveHour).padStart(2, "0")}h`
            : "—"}
        </span>
        <span className="ml-auto text-muted-foreground">
          Total :{" "}
          <span className="font-semibold text-foreground">
            {formatValue(total)}
          </span>
        </span>
      </div>

      {/* Tooltip — positioned absolutely relative to the chart root */}
      {hover ? (
        <div
          className="glass-strong pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: hover.x, top: hover.y - 6 }}
        >
          <span className="font-semibold">
            {String(hover.hour).padStart(2, "0")}h –{" "}
            {String((hover.hour + 1) % 24).padStart(2, "0")}h
          </span>
          <span className="ml-2 text-muted-foreground">
            {metric === "count" ? "Commandes" : "Ventes"} :{" "}
            <span className="font-semibold text-foreground">
              {formatValue(byHour[hover.hour]?.[metric] ?? 0)}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Helpers                                     */
/* -------------------------------------------------------------------------- */

/** Map a 0..1 intensity to a "brand-tinted" background colour. */
function intensityBg(intensity: number): string {
  if (intensity <= 0) return "var(--muted, #f1f5f9)";
  // Use color-mix with the brand colour to get a soft, brand-consistent ramp.
  const pct = Math.round(Math.max(0.12, Math.min(1, intensity)) * 100);
  return `color-mix(in srgb, var(--brand) ${pct}%, var(--muted, #f1f5f9))`;
}
