"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

export interface LineChartPoint {
  /** X-axis label (e.g. "Lun", "Mar", "12/06"). */
  label: string;
  /** Numeric Y value. */
  value: number;
}

export interface LineChartSeries {
  id: string;
  name: string;
  values: number[];
  /** Optional pre-formatted labels for each point (overrides `labels`). */
  pointLabels?: string[];
  /** Stroke colour (defaults to brand). */
  color?: string;
  /** Whether to fill the area under the curve. */
  fill?: boolean;
}

export interface LineChartProps {
  /** Single-series shortcut (just an array of points). */
  points?: LineChartPoint[];
  /** Multi-series (overrides `points`). */
  series?: LineChartSeries[];
  /** X-axis labels (used when `series` is provided). */
  labels?: string[];
  width?: number;
  height?: number;
  /** Show a faint grid in the background. */
  showGrid?: boolean;
  /** Show a legend below the chart. */
  showLegend?: boolean;
  /** Force Y-axis minimum (otherwise computed from the data). */
  yMin?: number;
  /** Force Y-axis maximum (otherwise computed from the data). */
  yMax?: number;
  /** Tooltip formatter for a Y value. */
  formatValue?: (n: number) => string;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

/**
 * LineChart — minimal, dependency-free, multi-series SVG line chart.
 *
 * - Tooltip on hover (one tooltip per series line)
 * - Smart Y-axis ticks (4 nice round values)
 * - Responsive via viewBox + preserveAspectRatio
 * - Theme-aware (uses `var(--brand)` etc.)
 */
export function LineChart({
  points,
  series,
  labels,
  width = 720,
  height = 280,
  showGrid = true,
  showLegend = true,
  yMin,
  yMax,
  formatValue = (n) => String(Math.round(n)),
  className,
}: LineChartProps) {
  const gradSeed = useId();
  const [hover, setHover] = useState<{
    index: number;
    seriesId?: string;
  } | null>(null);

  // Normalise into `series` shape.
  const seriesData = useMemo<LineChartSeries[]>(() => {
    if (series && series.length > 0) return series;
    if (points && points.length > 0) {
      return [
        {
          id: "default",
          name: "Valeur",
          values: points.map((p) => p.value),
          pointLabels: points.map((p) => p.label),
        },
      ];
    }
    return [];
  }, [points, series]);

  const xLabels: string[] = useMemo(() => {
    if (seriesData[0]?.pointLabels && seriesData[0].pointLabels.length > 0) {
      return seriesData[0].pointLabels;
    }
    return labels ?? [];
  }, [labels, seriesData]);

  const pointCount = xLabels.length || (seriesData[0]?.values.length ?? 0);

  // Compute Y bounds.
  const allValues = seriesData.flatMap((s) => s.values).filter(Number.isFinite);
  const computedYMax = Math.max(0, ...allValues);
  const computedYMin = Math.min(0, ...allValues);
  const finalYMax = yMax ?? niceCeil(computedYMax);
  const finalYMin = yMin ?? Math.min(0, niceFloor(computedYMin));
  const yRange = finalYMax - finalYMin || 1;

  // Padding for the inner plot area.
  const padTop = 16;
  const padBottom = 32;
  const padLeft = 44;
  const padRight = 12;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const xFor = (i: number) => {
    if (pointCount <= 1) return padLeft + innerW / 2;
    return padLeft + (i / (pointCount - 1)) * innerW;
  };
  const yFor = (v: number) => {
    return padTop + innerH - ((v - finalYMin) / yRange) * innerH;
  };

  // Y-axis ticks (4 horizontal lines).
  const ticks = useMemo(
    () => buildTicks(finalYMin, finalYMax, 4),
    [finalYMin, finalYMax],
  );

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
      >
        <defs>
          {seriesData.map((s, i) => (
            <linearGradient
              key={`${gradSeed}-${s.id}-${i}`}
              id={`${gradSeed}-grad-${s.id}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={s.color ?? "var(--brand)"}
                stopOpacity={0.32}
              />
              <stop
                offset="100%"
                stopColor={s.color ?? "var(--brand)"}
                stopOpacity={0}
              />
            </linearGradient>
          ))}
        </defs>

        {/* Grid + Y-axis labels */}
        {showGrid
          ? ticks.map((t) => (
              <g key={`grid-${t}`}>
                <line
                  x1={padLeft}
                  x2={width - padRight}
                  y1={yFor(t)}
                  y2={yFor(t)}
                  stroke="currentColor"
                  strokeOpacity={0.08}
                  strokeDasharray="2 4"
                />
                <text
                  x={padLeft - 6}
                  y={yFor(t)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: 10 }}
                >
                  {formatTick(t)}
                </text>
              </g>
            ))
          : null}

        {/* X-axis labels */}
        {xLabels.map((label, i) => {
          // Only show every Nth label to avoid overlap
          const step = Math.max(1, Math.ceil(xLabels.length / 8));
          if (i % step !== 0 && i !== xLabels.length - 1) return null;
          return (
            <text
              key={`x-${i}`}
              x={xFor(i)}
              y={height - padBottom + 16}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 10 }}
            >
              {label}
            </text>
          );
        })}

        {/* Series lines + areas */}
        {seriesData.map((s, sIdx) => {
          const color = s.color ?? "var(--brand)";
          const values = s.values;
          if (values.length === 0) return null;
          const linePath = values
            .map(
              (v, i) =>
                `${i === 0 ? "M" : "L"}${xFor(i).toFixed(2)},${yFor(v).toFixed(2)}`,
            )
            .join(" ");
          const areaPath = `${linePath} L${xFor(values.length - 1).toFixed(2)},${padTop + innerH} L${xFor(0).toFixed(2)},${padTop + innerH} Z`;
          return (
            <g key={s.id}>
              {s.fill !== false ? (
                <path
                  d={areaPath}
                  fill={`url(#${gradSeed}-grad-${s.id})`}
                  opacity={0.85}
                />
              ) : null}
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* dots */}
              {values.map((v, i) => (
                <circle
                  key={`dot-${s.id}-${i}`}
                  cx={xFor(i)}
                  cy={yFor(v)}
                  r={
                    hover && hover.index === i && hover.seriesId === s.id
                      ? 5
                      : 2.5
                  }
                  fill="var(--background)"
                  stroke={color}
                  strokeWidth={2}
                />
              ))}
            </g>
          );
        })}

        {/* Hover target (invisible rect per point) */}
        {Array.from({ length: pointCount }).map((_, i) => (
          <rect
            key={`hover-${i}`}
            x={xFor(i) - innerW / Math.max(1, pointCount) / 2}
            y={padTop}
            width={innerW / Math.max(1, pointCount)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover({ index: i })}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "crosshair" }}
          />
        ))}

        {/* Hover line + tooltip */}
        {hover ? (
          <g pointerEvents="none">
            <line
              x1={xFor(hover.index)}
              x2={xFor(hover.index)}
              y1={padTop}
              y2={padTop + innerH}
              stroke="currentColor"
              strokeOpacity={0.15}
            />
          </g>
        ) : null}
      </svg>

      {/* Tooltip (HTML, on top of SVG) */}
      {hover ? (
        <div
          className="glass-strong pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl px-3 py-2 text-xs shadow-xl"
          style={{
            left: `${(xFor(hover.index) / width) * 100}%`,
            top: `${(Math.min(...seriesData.map((s) => yFor(s.values[hover.index] ?? 0))) / height) * 100}%`,
            transform: "translate(-50%, calc(-100% - 8px))",
          }}
        >
          <p className="font-semibold">{xLabels[hover.index] ?? ""}</p>
          <div className="mt-1 space-y-0.5">
            {seriesData.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: s.color ?? "var(--brand)" }}
                />
                <span className="text-muted-foreground">{s.name}:</span>
                <span className="font-semibold">
                  {formatValue(s.values[hover.index] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Legend */}
      {showLegend && seriesData.length > 1 ? (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          {seriesData.map((s) => (
            <div key={`legend-${s.id}`} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: s.color ?? "var(--brand)" }}
              />
              <span className="text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Helpers                                       */
/* -------------------------------------------------------------------------- */

/** Round a number *up* to a "nice" value (1, 2, 5, 10 × 10^n). */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / Math.pow(10, exponent);
  let niceFraction: number;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * Math.pow(10, exponent);
}

/** Round a number *down* to a "nice" value. */
function niceFloor(value: number): number {
  if (value >= 0) return 0;
  return -niceCeil(-value);
}

/** Build N evenly spaced tick values between min and max. */
function buildTicks(min: number, max: number, count: number): number[] {
  if (max <= min) return [min];
  const step = (max - min) / count;
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) ticks.push(min + step * i);
  return ticks;
}

/** Compact tick formatter: 12 500 -> "12.5k", 1 200 000 -> "1.2M". */
function formatTick(n: number): string {
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}
