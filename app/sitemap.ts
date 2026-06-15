import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * sitemap.xml — served at /sitemap.xml
 *
 * Lists the public, indexable pages of the POS. Private pages
 * (login, /api/*, stock-internal) are intentionally absent; they
 * are also `Disallow`-ed in robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const lastModified = now;

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "daily",
      priority: 1.0,
      alternates: {
        languages: {
          "fr-CD": absoluteUrl("/"),
          en: absoluteUrl("/en"),
        },
      },
      images: [absoluteUrl("/opengraph-image")],
    },
    {
      url: absoluteUrl("/dashboard"),
      lastModified,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/menu"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/stock"),
      lastModified,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/categories"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/reports"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/history"),
      lastModified,
      changeFrequency: "hourly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/users"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.4,
    },
  ];
}
