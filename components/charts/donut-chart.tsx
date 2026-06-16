"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

export interface DonutSlice {
  /** Display label (e.g. "Bières"). */
  label: string;
  /** Numeric value. */
  value: number;
  /** Override colour. */
  color?: string;
}

export interface DonutChartProps {
  slices: DonutSlice[];
  /** Outer diameter in pixels. */
  size?: number;
  /** Stroke thickness (i.e. donut width). */
  thickness?: number;
  /** Caption shown in the centre of the donut. */
  centerLabel?: string;
  centerValue?: string;
  /** Whether to render a legend beside the donut. */
  showLegend?: boolean;
  formatValue?: (n: number) => string;
  /** Pre-defined palette when slices don't provide their own colour. */
  palette?: string[];
  className?: string;
  emptyLabel?: string;
}

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_PALETTE = [
  "#0EA5E9", // sky-500
  "#22C55E", // green-500
  "#F59E0B", // amber-500
  "#A855F7", // purple-500
  "#EC4899", // pink-500
  "#14B8A6", // teal-500
  "#F97316", // orange-500
  "#6366F1", // indigo-500
  "#84CC16", // lime-500
  "#06B6D4", // cyan-500
];

/**
 * DonutChart — minimal SVG donut with an interactive legend.
 *
 * - Each slice is hoverable; hovered slice is highlighted, others fade.
 * - Coloured segments are sized proportionally to the value.
 * - Centre label/value (e.g. "Total", "12 400 $US").
 */
export function DonutChart({
  slices,
  size = 180,
  thickness = 22,
  centerLabel,
  centerValue,
  showLegend = true,
  formatValue = (n) => String(Math.round(n)),
  palette = DEFAULT_PALETTE,
  className,
  emptyLabel = "Aucune donnée",
}: DonutChartProps) {
  const gradId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const total = useMemo(
    () =>
      slices.reduce((s, x) => s + (Number.isFinite(x.value) ? x.value : 0), 0),
    [slices],
  );

  if (slices.length === 0 || total === 0) {
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

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;

  // Build segments.
  let acc = 0;
  const segments = slices.map((s, i) => {
    const fraction = s.value / total;
    const dash = fraction * circumference;
    const offset = -acc;
    acc += dash;
    return {
      slice: s,
      color: s.color ?? palette[i % palette.length],
      fraction,
      dash,
      offset,
      index: i,
    };
  });

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6",
        className,
      )}
    >
      {/* Donut */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-full w-full -rotate-90"
          role="img"
        >
          <defs>
            <filter id={gradId} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="0.5" />
            </filter>
          </defs>
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeWidth={thickness}
          />
          {/* Slices */}
          {segments.map(({ slice, color, dash, offset, index }) => {
            const isHovered = hoverIdx === index;
            return (
              <circle
                key={`slice-${index}`}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={isHovered ? thickness + 4 : thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                opacity={hoverIdx === null ? 1 : isHovered ? 1 : 0.35}
                style={{
                  transition: "opacity 200ms, stroke-width 200ms",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoverIdx(index)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <title>
                  {slice.label}: {formatValue(slice.value)} (
                  {((slice.value / total) * 100).toFixed(1)}%)
                </title>
              </circle>
            );
          })}
        </svg>
        {/* Centre label */}
        {centerLabel || centerValue ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerLabel ? (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {centerLabel}
              </span>
            ) : null}
            {centerValue ? (
              <span className="mt-0.5 text-lg font-bold tabular-nums">
                {centerValue}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Legend */}
      {showLegend ? (
        <ul className="grid w-full min-w-0 flex-1 grid-cols-1 gap-1.5 text-sm">
          {segments.map(({ slice, color, fraction, index }) => {
            const isHovered = hoverIdx === index;
            return (
              <li
                key={`leg-${index}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
                  isHovered ? "bg-muted/60" : "hover:bg-muted/30",
                )}
                onMouseEnter={() => setHoverIdx(index)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: color }}
                />
                <span className="min-w-0 flex-1 truncate">{slice.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {(fraction * 100).toFixed(0)}%
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatValue(slice.value)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
