"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

export interface BarChartItem {
  /** Display label (e.g. "Coca-Cola"). */
  label: string;
  /** Numeric value. */
  value: number;
  /** Optional secondary value (rendered as a faded inline indicator). */
  secondaryValue?: number;
  /** Optional secondary label (e.g. "142 vendus"). */
  secondaryLabel?: string;
  /** Override colour (otherwise uses brand). */
  color?: string;
}

export interface BarChartProps {
  items: BarChartItem[];
  /** Render horizontal bars (default) or vertical. */
  orientation?: "horizontal" | "vertical";
  width?: number;
  /** Compact mode: smaller bar height, useful inside KPI cards. */
  compact?: boolean;
  /** Show the value at the end of each bar. */
  showValue?: boolean;
  /** Tooltip formatter. */
  formatValue?: (n: number) => string;
  /** Optional value formatter for the secondary inline label. */
  formatSecondary?: (n: number) => string;
  /** Cap the number of items rendered. */
  maxItems?: number;
  className?: string;
  emptyLabel?: string;
}

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

/**
 * BarChart — horizontal bar list (a la "top sellers").
 *
 * - Smart width: longest bar takes 100 % of the row, others scale.
 * - Animated entrance via CSS keyframes (no JS perf hit).
 * - Compact mode for KPI cards.
 * - Hover state highlights the bar and shows the value.
 */
export function BarChart({
  items,
  orientation = "horizontal",
  compact = false,
  showValue = true,
  formatValue = (n) => String(Math.round(n)),
  formatSecondary = (n) => String(Math.round(n)),
  maxItems,
  className,
  emptyLabel = "Aucune donnée",
}: BarChartProps) {
  const gradId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const data = useMemo(() => {
    const list = maxItems ? items.slice(0, maxItems) : items;
    return [...list].sort((a, b) => b.value - a.value);
  }, [items, maxItems]);

  const max = useMemo(
    () => data.reduce((m, it) => Math.max(m, it.value), 0),
    [data],
  );

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20 p-8 text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  if (orientation === "vertical") {
    return (
      <VerticalBars
        data={data}
        max={max}
        formatValue={formatValue}
        className={className}
        gradId={gradId}
      />
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {data.map((it, idx) => {
        const pct = max > 0 ? (it.value / max) * 100 : 0;
        const color = it.color ?? "var(--brand)";
        const isHovered = hoverIdx === idx;
        return (
          <div
            key={`${it.label}-${idx}`}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl p-2 transition-colors",
              compact ? "py-1.5" : "py-2.5",
              isHovered ? "bg-muted/50" : "hover:bg-muted/30",
            )}
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Label */}
            <div
              className={cn(
                "min-w-0 truncate font-medium",
                compact ? "w-28 text-xs" : "w-40 text-sm",
              )}
              title={it.label}
            >
              {it.label}
            </div>

            {/* Bar */}
            <div
              className={cn(
                "relative flex-1 overflow-hidden rounded-full bg-muted/40",
                compact ? "h-2" : "h-3",
              )}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.max(pct, 1.5)}%`,
                  background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 65%, white))`,
                  boxShadow: isHovered
                    ? `0 0 0 1px ${color}33, 0 4px 12px -2px ${color}55`
                    : "none",
                }}
              />
              {/* Subtle shimmer when hovered */}
              {isHovered ? (
                <div
                  className="absolute inset-y-0 right-0 w-1/4 animate-pulse rounded-full opacity-30"
                  style={{ background: color }}
                />
              ) : null}
            </div>

            {/* Value(s) */}
            <div
              className={cn(
                "flex shrink-0 items-center gap-2 text-right tabular-nums",
                compact ? "min-w-[5.5rem] text-xs" : "min-w-[7rem] text-sm",
              )}
            >
              {showValue ? (
                <span className="font-bold">{formatValue(it.value)}</span>
              ) : null}
              {it.secondaryValue !== undefined ? (
                <span className="text-muted-foreground">
                  · {it.secondaryLabel ?? formatSecondary(it.secondaryValue)}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Vertical orientation                              */
/* -------------------------------------------------------------------------- */

function VerticalBars({
  data,
  max,
  formatValue,
  className,
  gradId,
}: {
  data: BarChartItem[];
  max: number;
  formatValue: (n: number) => string;
  className?: string;
  gradId: string;
}) {
  const padTop = 18;
  const padBottom = 32;
  const padLeft = 24;
  const padRight = 12;
  const width = 480;
  const height = 240;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;
  const slotW = innerW / data.length;
  const barW = Math.min(40, slotW * 0.65);

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        {data.map((it, i) => {
          const pct = max > 0 ? it.value / max : 0;
          const h = pct * innerH;
          const x = padLeft + i * slotW + (slotW - barW) / 2;
          const y = padTop + innerH - h;
          return (
            <g key={`${it.label}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                rx={6}
                fill={`url(#${gradId})`}
              >
                <title>
                  {it.label}: {formatValue(it.value)}
                </title>
              </rect>
              <text
                x={x + barW / 2}
                y={height - padBottom + 16}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 10 }}
              >
                {it.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
