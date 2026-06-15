import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * robots.txt — served at /robots.txt
 *
 * Allows all well-behaved crawlers, points them at the sitemap, and
 * explicitly disallows indexing of the login & internal API routes
 * (those are the only pages we never want to leak in search results).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/login",
          "/_next/",
          "/admin",
          "/stock/internal",
        ],
        crawlDelay: 0,
      },
      {
        userAgent: [
          "Googlebot",
          "Googlebot-Image",
          "Googlebot-News",
          "Googlebot-Video",
        ],
        allow: ["/"],
        disallow: ["/api/", "/login"],
      },
      {
        // AI training crawlers — opt out explicitly.
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "ClaudeBot", "Claude-Web", "PerplexityBot", "Bytespider", "Google-Extended"],
        disallow: ["/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
