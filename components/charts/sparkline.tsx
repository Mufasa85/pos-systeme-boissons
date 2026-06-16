"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Sparkline — a tiny, dependency-free inline line chart used to
 * summarise a trend (e.g. today's hourly revenue, weekly sales).
 *
 * Designed for KPI cards: no axes, no grid, no legend. Just a
 * smooth curve, an end-dot, and an optional area fill.
 */
export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** Stroke colour. Defaults to the brand colour. */
  stroke?: string;
  /** Area fill colour (defaults to `stroke` with low alpha). */
  fill?: string;
  /** Whether the area under the curve should be filled. */
  showArea?: boolean;
  /** Whether to draw a dot at the last value. */
  showEndDot?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function Sparkline({
  values,
  width = 120,
  height = 36,
  stroke = "var(--brand)",
  fill,
  showArea = true,
  showEndDot = true,
  className,
  ariaLabel,
}: SparklineProps) {
  const safe = useMemo(
    () => values.filter((v) => Number.isFinite(v)),
    [values],
  );
  if (safe.length === 0) {
    return (
      <svg
        className={cn("text-muted-foreground/30", className)}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel ?? "sparkline"}
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
      </svg>
    );
  }

  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const stepX = safe.length > 1 ? width / (safe.length - 1) : 0;
  const padY = 4;
  const innerH = height - padY * 2;

  const points = safe.map((v, i) => {
    const x = i * stepX;
    const y = padY + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L${(
    points[points.length - 1]?.[0] ?? 0
  ).toFixed(2)},${height} L0,${height} Z`;

  const [endX, endY] = points[points.length - 1] ?? [0, height / 2];
  const fillColor = fill ?? stroke;
  const gradId = `spark-${Math.abs(
    (stroke + width + height)
      .split("")
      .reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7),
  )}`;

  return (
    <svg
      className={cn("overflow-visible", className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? "sparkline"}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity={0.35} />
          <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      {showArea ? <path d={areaPath} fill={`url(#${gradId})`} /> : null}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showEndDot ? (
        <>
          <circle cx={endX} cy={endY} r={6} fill={stroke} fillOpacity={0.15} />
          <circle cx={endX} cy={endY} r={3} fill={stroke} />
        </>
      ) : null}
    </svg>
  );
}
