// Single source of truth for the site's public origin.
// Used by metadataBase (canonical/OG URLs), sitemap.ts and robots.ts.
//
// Set NEXT_PUBLIC_SITE_URL to the real production domain in .env.local AND in
// the Vercel project env vars. The fallback is only a safety net for local dev.
// It has to stay in sync with the live domain: a mismatch here fails silently —
// nothing errors, canonical/OG/sitemap URLs just point somewhere else.
// NEXT_PUBLIC_* is inlined at build time, so changing it needs a redeploy.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://invitus.com.ua"
).replace(/\/+$/, "");

/** Hostname of the canonical origin, e.g. "invitus.com.ua". */
export const SITE_HOST = new URL(SITE_URL).hostname;
