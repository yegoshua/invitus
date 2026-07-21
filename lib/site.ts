// Single source of truth for the site's public origin.
// Used by metadataBase (canonical/OG URLs), sitemap.ts and robots.ts.
//
// Set NEXT_PUBLIC_SITE_URL to the real production domain in .env.local AND in
// the Vercel project env vars. The fallback is only a safety net for local dev.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://invitus.ua"
).replace(/\/+$/, "");
