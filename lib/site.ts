/**
 * Site-wide configuration & helpers for metadata.
 *
 * Centralising these values keeps OpenGraph, Twitter, sitemap,
 * robots and the manifest in sync — change them once and every
 * metadata surface updates automatically.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://joac.cd";

export const SITE_NAME = "JOAC";
export const SITE_SHORT_NAME = "JOAC POS";
export const SITE_DESCRIPTION =
  "JOAC — système de point de vente moderne pour boissons, avec gestion du stock, des ventes, des caissiers et facturation FC / USD. Conçu à Kinshasa.";
export const SITE_DESCRIPTION_EN =
  "A modern, glassmorphism beverage point-of-sale system with dynamic branding, cart, discounts, tax and sales analytics.";
export const SITE_LOCALE = "fr_CD";
export const SITE_LANGUAGE = "fr-CD";

export const ORGANIZATION = {
  name: "JOAC",
  legalName: "JOAC — Specialty drinks & more",
  url: SITE_URL,
  logo: "/logo_ass_N-clair.png",
  logoDark: "/logo_ass_N-noir.png",
  email: "contact@joac.cd",
  phone: "+243-000-000-000",
  address: {
    street: "03 Avenue Mbiloa, Ngaliema",
    city: "Kinshasa",
    region: "Kinshasa",
    postalCode: "00000",
    country: "CD",
    countryName: "République Démocratique du Congo",
  },
  geo: {
    latitude: -4.3276,
    longitude: 15.3136,
  },
} as const;

export const BRAND_COLORS = {
  // Used for theme-color, manifest and OG image backgrounds.
  // Keep in sync with the CSS variables in globals.css.
  primary: "#0EA5E9",
  primaryDark: "#0B1220",
  accent: "#F59E0B",
  backgroundLight: "#F8FAFC",
  backgroundDark: "#0B1220",
} as const;

export const SOCIAL = {
  twitter: "@joac_cd",
  facebook: "joac.cd",
  instagram: "joac.cd",
  linkedin: "joac",
} as const;

export const KEYWORDS: readonly string[] = [
  "POS",
  "point of sale",
  "caisse",
  "point de vente",
  "boissons",
  "beverage",
  "JOAC",
  "Kinshasa",
  "RDC",
  "Congo",
  "gestion de stock",
  "caisse enregistreuse",
  "facturation",
  "USD",
  "FC",
  "analytics",
  "tableau de bord",
  "caissier",
  "restaurant",
  "bar",
  "café",
];

/**
 * Build an absolute URL from a path (always returns https://.../...).
 * Safe to call with paths that already start with http(s):// — they
 * are returned untouched.
 */
export function absoluteUrl(path = "/"): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalised}`;
}

/**
 * Common OpenGraph image — used by `opengraph-image.tsx`,
 * `twitter-image.tsx` and any other surface that needs a hero
 * preview. We point at the dynamically generated route so the
 * image can be themed (colors, locale) without committing a
 * binary asset to the repo.
 */
export const OG_IMAGE_PATH = "/opengraph-image";
export const TWITTER_IMAGE_PATH = "/twitter-image";
