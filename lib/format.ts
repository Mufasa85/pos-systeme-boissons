/**
 * Formatting & number helpers used by the analytics, reports and
 * dashboard surfaces. Centralised so we keep currency, locale and
 * rounding consistent across the whole app.
 */

/* -------------------------------------------------------------------------- */
/*                                  Currency                                  */
/* -------------------------------------------------------------------------- */

/**
 * Format a numeric amount as a currency string.
 *
 *   formatCurrency(1284.5, "USD") -> "1 284,50 $US"
 *   formatCurrency(1284.5, "CDF") -> "1 284,50 FC"
 *
 * Defaults to the site locale (fr-CD) so the rest of the UI is
 * automatically localized without each call site having to pass it.
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: "USD" | "CDF" | string = "USD",
  options: Intl.NumberFormatOptions = {},
): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "—";
  const fractionDigits = options.maximumFractionDigits ?? 2;
  try {
    return new Intl.NumberFormat("fr-CD", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: currency === "CDF" ? 0 : fractionDigits,
      maximumFractionDigits: currency === "CDF" ? 0 : fractionDigits,
      ...options,
    }).format(n);
  } catch {
    return `${n.toFixed(fractionDigits)} ${currency}`;
  }
}

/** Compact currency, e.g. `12,4 k $US` for 12 400 USD. */
export function formatCurrencyCompact(
  value: number | string | null | undefined,
  currency: "USD" | "CDF" | string = "USD",
): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("fr-CD", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return `${n.toFixed(0)} ${currency}`;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Numbers                                   */
/* -------------------------------------------------------------------------- */

/** Coerce anything (number, string, Decimal-like) to a finite number. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return NaN;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/,/g, ".");
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : NaN;
  }
  const n = Number(value as { toString(): string });
  return Number.isFinite(n) ? n : NaN;
}

/** Format a plain integer with thousands separators (no decimals). */
export function formatNumber(value: number | string | null | undefined): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("fr-CD", {
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

/** Format a percentage with the given number of fraction digits. */
export function formatPercent(
  value: number | string | null | undefined,
  digits = 1,
): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("fr-CD", {
      style: "percent",
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(n / 100);
  } catch {
    return `${n.toFixed(digits)} %`;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Time                                     */
/* -------------------------------------------------------------------------- */

/** "lundi 16 juin" — short, locale-aware. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("fr-CD", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

/** "09:15" */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("fr-CD", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
}

/** "16/06/2026 09:15" — used in dense log lists. */
export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("fr-CD", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

/** "il y a 3 min" */
export function formatRelative(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffH = Math.round(diffMin / 60);
  const diffD = Math.round(diffH / 24);
  try {
    const rtf = new Intl.RelativeTimeFormat("fr-CD", { numeric: "auto" });
    if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, "second");
    if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, "minute");
    if (Math.abs(diffH) < 24) return rtf.format(-diffH, "hour");
    if (Math.abs(diffD) < 30) return rtf.format(-diffD, "day");
    return formatDate(d);
  } catch {
    return d.toLocaleString();
  }
}

/* -------------------------------------------------------------------------- */
/*                              Price formatting                              */
/* -------------------------------------------------------------------------- */

/**
 * Hard-coded exchange rate used by the POS UI.
 *
 * In production this should come from the backend (the order model
 * already stores the FX rate used at the time of the sale). For
 * now we mirror the value exposed by the server's business config
 * so the on-screen prices match what the printed receipt will show.
 */
export const FX_USD_TO_CDF = 2289.3077;

/**
 * The national currency of the DRC, used for all customer-facing
 * amounts (cart, totals, receipt, on-screen invoice). The receipt
 * convention is to write "10 000 FC" — `formatPrice` always uses
 * that exact spelling.
 */
export type PriceCurrency = "CDF";

/**
 * Format a numeric amount as a Congolese-Franc string.
 *
 *   formatPrice(68679.23)  // → "68 679,23 FC"
 *   formatPrice(0)         // → "0 FC"
 *   formatPrice(null)      // → "—"
 *
 * The "FC" suffix is appended manually so the output is identical
 * on every browser — the `narrowSymbol` for CDF is inconsistent
 * across runtimes (some return "FC", some "CDF", some "Fr").
 */
export function formatPrice(
  value: number | string | null | undefined,
  currency: PriceCurrency = "CDF",
): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "—";
  try {
    const formatted = new Intl.NumberFormat("fr-CD", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
    return `${formatted} ${currency}`;
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

/** Compact variant: "12,4 k FC" for 12 400. */
export function formatPriceCompact(
  value: number | string | null | undefined,
  currency: PriceCurrency = "CDF",
): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "—";
  try {
    const formatted = new Intl.NumberFormat("fr-CD", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
    return `${formatted} ${currency}`;
  } catch {
    return `${n.toFixed(0)} ${currency}`;
  }
}

/**
 * Format an amount that is already in USD. Used for the
 * "Équivalent USD" line on the receipt — the value is computed
 * by dividing the FC total by `FX_USD_TO_CDF`.
 */
export function formatUsd(
  value: number | string | null | undefined,
): string {
  return formatCurrency(value, "USD");
}

/**
 * Convert an FC amount to its USD equivalent using the hard-coded
 * FX rate, then format it with `formatUsd`. Returns "—" for any
 * non-finite input.
 *
 *   formatFcAsUsd(10000)  // → "4,37 $US"  (10000 / 2289.3077)
 */
export function formatFcAsUsd(
  valueFc: number | string | null | undefined,
): string {
  const n = toNumber(valueFc);
  if (!Number.isFinite(n)) return "—";
  return formatUsd(n / FX_USD_TO_CDF);
}

/**
 * Same as `formatFcAsUsd` but uses a dynamic FX rate (e.g. fetched
 * from the branding API) instead of the hard-coded constant.
 */
export function formatFcAsUsdWithRate(
  valueFc: number | string | null | undefined,
  rate: number,
): string {
  const n = toNumber(valueFc);
  if (!Number.isFinite(n) || !Number.isFinite(rate) || rate <= 0) return "—";
  return formatUsd(n / rate);
}

/* -------------------------------------------------------------------------- */
/*                                Math helpers                                */
/* -------------------------------------------------------------------------- */

/** Clamp a value to the [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Given a series of numbers, return the *relative* percent change
 * between the last and the previous-to-last values. Returns `null`
 * if there is no comparable previous value.
 */
export function pctChange(values: number[]): number | null {
  if (values.length < 2) return null;
  const prev = values[values.length - 2];
  const curr = values[values.length - 1];
  if (!Number.isFinite(prev) || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

/** Sum of an iterable of numbers (coerced). */
export function sum(values: Iterable<number | string>): number {
  let total = 0;
  for (const v of values) {
    const n = toNumber(v);
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

/** Sort-key helper that returns the appropriate string for a YYYY-MM-DD date. */
export function isoDay(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
