import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/components/auth-provider";
import {
  BRAND_COLORS,
  KEYWORDS,
  ORGANIZATION,
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_EN,
  SITE_LANGUAGE,
  SITE_LOCALE,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_URL,
  SOCIAL,
  absoluteUrl,
} from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* -------------------------------------------------------------------------- */
/*                                  Viewport                                  */
/* -------------------------------------------------------------------------- */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: BRAND_COLORS.backgroundLight,
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: BRAND_COLORS.backgroundDark,
    },
  ],
  colorScheme: "light dark",
  viewportFit: "cover",
};

/* -------------------------------------------------------------------------- */
/*                                   Metadata                                 */
/* -------------------------------------------------------------------------- */

export const metadata: Metadata = {
  // -------------------------------------------------------------------- //
  // Core                                                                  //
  // -------------------------------------------------------------------- //
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Point de vente moderne pour boissons`,
    template: `%s · ${SITE_NAME}`,
  },
  applicationName: SITE_SHORT_NAME,
  description: SITE_DESCRIPTION,
  abstract: SITE_DESCRIPTION_EN,
  keywords: [...KEYWORDS],
  category: "business",
  classification: "Business Application",
  authors: [{ name: SITE_NAME, url: absoluteUrl("/") }],
  creator: SITE_NAME,
  publisher: ORGANIZATION.legalName,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // -------------------------------------------------------------------- //
  // Language / alternates                                                  //
  // -------------------------------------------------------------------- //
  alternates: {
    canonical: absoluteUrl("/"),
    languages: {
      "fr-CD": absoluteUrl("/"),
      en: absoluteUrl("/en"),
    },
    media: {
      "only screen and (max-width: 640px)": absoluteUrl("/mobile"),
    },
    types: {
      "application/rss+xml": absoluteUrl("/feed.xml"),
    },
  },
  // -------------------------------------------------------------------- //
  // Robots                                                                //
  // -------------------------------------------------------------------- //
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // -------------------------------------------------------------------- //
  // Icons                                                                 //
  // -------------------------------------------------------------------- //
  icons: {
    icon: [
      { url: "/icon", type: "image/svg+xml", sizes: "any" },
      {
        url: "/icon-light-32x32.png",
        type: "image/png",
        sizes: "32x32",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        type: "image/png",
        sizes: "32x32",
        media: "(prefers-color-scheme: dark)",
      },
      { url: "/icon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/icon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: BRAND_COLORS.primary,
      },
    ],
  },
  // -------------------------------------------------------------------- //
  // Manifest / PWA                                                        //
  // -------------------------------------------------------------------- //
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_SHORT_NAME,
    statusBarStyle: "black-translucent",
    startupImage: [
      {
        url: "/apple-icon",
        media:
          "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  // -------------------------------------------------------------------- //
  // OpenGraph (Facebook, LinkedIn, Discord, WhatsApp, …)                  //
  // -------------------------------------------------------------------- //
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Point de vente moderne pour boissons`,
    description: SITE_DESCRIPTION,
    emails: [ORGANIZATION.email],
    phoneNumbers: [ORGANIZATION.phone],
    faxNumbers: undefined,
    determiner: "auto",
    countryName: ORGANIZATION.address.countryName,
    ttl: 3600,
    images: [
      {
        url: absoluteUrl("/logo_ass_N-clair.png"),
        secureUrl: absoluteUrl("/logo_ass_N-clair.png"),
        alt: `${SITE_NAME} — Point de vente moderne pour boissons`,
        width: 1200,
        height: 630,
        type: "image/png",
      },
      {
        url: absoluteUrl("/logo_ass_N-clair.png"),
        alt: `${SITE_NAME} logo`,
        width: 512,
        height: 512,
        type: "image/png",
      },
    ],
    videos: [],
    audio: [],
    alternateLocale: ["fr_CD", "en_US"],
  },
  // -------------------------------------------------------------------- //
  // Twitter / X                                                           //
  // -------------------------------------------------------------------- //
  twitter: {
    card: "summary_large_image",
    site: SOCIAL.twitter,
    siteId: undefined,
    creator: SOCIAL.twitter,
    creatorId: undefined,
    title: `${SITE_NAME} — Point de vente moderne pour boissons`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/twitter-image"),
        alt: `${SITE_NAME} — Point de vente moderne pour boissons`,
        width: 1200,
        height: 675,
        type: "image/png",
      },
    ],
  },
  // -------------------------------------------------------------------- //
  // Facebook-specific (kept for backwards compatibility)                  //
  // -------------------------------------------------------------------- //
  facebook: {
    appId: process.env.NEXT_PUBLIC_FB_APP_ID,
  },
  // -------------------------------------------------------------------- //
  // AppLinks (deep-linking for iOS / Android)                             //
  // -------------------------------------------------------------------- //
  // appLinks: {
  //   ios: {
  //     url: absoluteUrl("/"),
  //     app_store_id: process.env.NEXT_PUBLIC_IOS_APP_ID,
  //     app_name: SITE_SHORT_NAME,
  //   },
  //   android: {
  //     url: absoluteUrl("/"),
  //     package: process.env.NEXT_PUBLIC_ANDROID_PACKAGE,
  //   },
  //   web: {
  //     url: absoluteUrl("/"),
  //     should_fallback: true,
  //   },
  // },
  // -------------------------------------------------------------------- //
  // Verification (search engine consoles)                                 //
  // -------------------------------------------------------------------- //
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_FB_DOMAIN_VERIFICATION
      ? {
          "facebook-domain-verification":
            process.env.NEXT_PUBLIC_FB_DOMAIN_VERIFICATION,
        }
      : {}),
    ...(process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION
      ? {
          "pinterest-site-verification":
            process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION,
        }
      : {}),
  },
  // -------------------------------------------------------------------- //
  // Archives / bookmarks                                                  //
  // -------------------------------------------------------------------- //
  archives: [absoluteUrl("/feed.xml"), absoluteUrl("/sitemap.xml")],
  assets: [absoluteUrl("/"), absoluteUrl("/api")],
  bookmarks: [
    absoluteUrl("/"),
    absoluteUrl("/login"),
    absoluteUrl("/dashboard"),
    absoluteUrl("/stock"),
    absoluteUrl("/reports"),
  ],
  // -------------------------------------------------------------------- //
  // Other / miscellaneous                                                  //
  // -------------------------------------------------------------------- //
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": SITE_SHORT_NAME,
    "application-name": SITE_SHORT_NAME,
    "mobile-web-app-capable": "yes",
    "theme-color": BRAND_COLORS.primary,
    "color-scheme": "light dark",
    "supported-color-schemes": "light dark",
    "format-detection": "telephone=no",
    HandheldFriendly: "True",
    MobileOptimized: "320",
    "msapplication-TileColor": BRAND_COLORS.primary,
    "msapplication-TileImage": "/mstile-144x144.png",
    "msapplication-config": "/browserconfig.xml",
    "og:locale:alternate": "en_US",
    "geo.region": "CD-KN",
    "geo.placename": "Kinshasa",
    "geo.position": `${ORGANIZATION.geo.latitude};${ORGANIZATION.geo.longitude}`,
    ICBM: `${ORGANIZATION.geo.latitude}, ${ORGANIZATION.geo.longitude}`,
    rating: "general",
    distribution: "global",
    "revisit-after": "7 days",
    language: SITE_LANGUAGE,
    copyright: `© ${new Date().getFullYear()} ${ORGANIZATION.legalName}. Tous droits réservés.`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      dir="ltr"
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
    >
      <head>
        {/* JSON-LD structured data — Organization + WebSite.
            Search engines and crawlers read this to enrich results
            (logo, social links, sitelinks search box, …). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "@id": `${SITE_URL}#organization`,
                name: ORGANIZATION.name,
                legalName: ORGANIZATION.legalName,
                url: ORGANIZATION.url,
                logo: absoluteUrl(ORGANIZATION.logo),
                email: ORGANIZATION.email,
                telephone: ORGANIZATION.phone,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: ORGANIZATION.address.street,
                  addressLocality: ORGANIZATION.address.city,
                  addressRegion: ORGANIZATION.address.region,
                  postalCode: ORGANIZATION.address.postalCode,
                  addressCountry: ORGANIZATION.address.country,
                },
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: ORGANIZATION.geo.latitude,
                  longitude: ORGANIZATION.geo.longitude,
                },
                sameAs: [
                  `https://twitter.com/${SOCIAL.twitter.replace(/^@/, "")}`,
                  `https://www.facebook.com/${SOCIAL.facebook}`,
                  `https://www.instagram.com/${SOCIAL.instagram}`,
                  `https://www.linkedin.com/company/${SOCIAL.linkedin}`,
                ].filter(Boolean),
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "@id": `${SITE_URL}#website`,
                name: SITE_NAME,
                url: absoluteUrl("/"),
                inLanguage: SITE_LANGUAGE,
                publisher: { "@id": `${SITE_URL}#organization` },
                potentialAction: {
                  "@type": "SearchAction",
                  target: `${absoluteUrl("/")}?q={search_term_string}`,
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: SITE_SHORT_NAME,
                applicationCategory: "BusinessApplication",
                applicationSubCategory: "Point of Sale",
                operatingSystem: "Web, iOS, Android",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                },
                description: SITE_DESCRIPTION,
                image: absoluteUrl(ORGANIZATION.logo),
                url: absoluteUrl("/"),
                aggregateRating: undefined,
              },
            ]),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        {process.env.NODE_ENV === "production" && (
          <Suspense fallback={null}>
            <Analytics />
          </Suspense>
        )}
      </body>
    </html>
  );
}
