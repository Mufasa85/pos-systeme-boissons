# Métadonnées & SEO

Ce document liste **toutes** les surfaces de métadonnées exposées
par l'application et explique comment les mettre à jour.

## Fichiers concernés

| Fichier                   | Rôle                                                             |
| ------------------------- | ---------------------------------------------------------------- |
| `app/layout.tsx`          | `<head>` global (OpenGraph, Twitter, viewport, JSON-LD, …)       |
| `app/manifest.ts`         | PWA / Web App Manifest (servi sur `/manifest.webmanifest`)       |
| `app/robots.ts`           | `robots.txt`                                                     |
| `app/sitemap.ts`          | `sitemap.xml`                                                    |
| `app/opengraph-image.tsx` | Image OpenGraph dynamique (1200×630)                             |
| `app/twitter-image.tsx`   | Image Twitter / X dynamique (1200×675)                           |
| `app/icon.tsx`            | Favicon dynamique (32×32)                                        |
| `app/apple-icon.tsx`      | Apple touch icon dynamique (180×180)                             |
| `lib/site.ts`             | Source unique de vérité pour URL, nom, couleurs, mots-clés, etc. |

## Variables d'environnement (cf. `.env.example`)

| Variable                               | Description                                     |
| -------------------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | URL canonique du site (https, sans slash final) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Valeur de la balise Google Search Console       |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION`   | Valeur de la balise Bing Webmaster              |
| `NEXT_PUBLIC_FB_APP_ID`                | ID de l'application Facebook                    |
| `NEXT_PUBLIC_IOS_APP_ID`               | App Store ID pour `applinks.ios.app_store_id`   |
| `NEXT_PUBLIC_ANDROID_PACKAGE`          | Package Android pour `applinks.android.package` |

## Ce qui est exposé automatiquement

- **OpenGraph** (Facebook, LinkedIn, Discord, WhatsApp, Telegram, …) :
  `og:type`, `og:locale`, `og:url`, `og:site_name`, `og:title`,
  `og:description`, `og:image` (1 200×630, généré à la volée),
  `og:image:alt`, `og:email`, `og:phone_number`, `og:country_name`,
  `og:locale:alternate`.
- **Twitter / X** : `summary_large_image`, `@site`, `@creator`,
  image 1 200×675, alt, titre, description.
- **Viewport** : `width=device-width`, `initial-scale=1`,
  `theme-color` (light + dark), `color-scheme`, `viewport-fit=cover`.
- **Robots** : `index, follow`, Googlebot avec `max-image-preview=large`,
  `max-snippet=-1`, `max-video-preview=-1`. Crawlers AI (GPTBot, ClaudeBot,
  CCBot, anthropic-ai, PerplexityBot, Bytespider, Google-Extended) **bloqués**.
- **PWA Manifest** : nom, icônes maskable + any, screenshots, shortcuts
  (Caisse / Dashboard / Stock / Rapports), `share_target`,
  `file_handlers`, `protocol_handlers`, lang `fr-CD`.
- **Sitemap** : 8 routes publiques indexables avec `changeFrequency`
  et `priority` adaptés.
- **JSON-LD** : `Organization`, `WebSite` (avec SearchAction) et
  `SoftwareApplication` — pour les rich results Google.

## Comment changer la marque

Toutes les valeurs partagées vivent dans **`lib/site.ts`** :

- `SITE_URL` → URL canonique
- `SITE_NAME` → Nom commercial
- `SITE_DESCRIPTION` → Description FR par défaut
- `BRAND_COLORS` → Couleurs du brand (sync avec `globals.css`)
- `ORGANIZATION` → Raison sociale, adresse, contact, géoloc
- `SOCIAL` → Comptes Twitter / FB / Insta / LinkedIn
- `KEYWORDS` → Mots-clés SEO

Il suffit de modifier ce fichier — toutes les autres surfaces se
mettent à jour automatiquement.

## Comment tester localement

```bash
pnpm dev
# ou
npm run dev
```

Puis ouvrir :

- `http://localhost:3000/` → page d'accueil (vérifier `<head>`)
- `http://localhost:3000/manifest.webmanifest` → PWA manifest
- `http://localhost:3000/robots.txt` → robots
- `http://localhost:3000/sitemap.xml` → sitemap
- `http://localhost:3000/opengraph-image` → image OG (PNG)
- `http://localhost:3000/twitter-image` → image Twitter (PNG)
- `http://localhost:3000/icon` → favicon (PNG)
- `http://localhost:3000/apple-icon` → icône Apple (PNG)

Pour prévisualiser les partages sociaux, utilisez :

- <https://www.opengraph.xyz/>
- <https://cards-dev.twitter.com/validator>
- <https://developers.facebook.com/tools/debug/>
