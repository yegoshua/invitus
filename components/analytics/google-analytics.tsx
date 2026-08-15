import Script from "next/script";

// GA4 Measurement ID, e.g. "G-XXXXXXXXXX". Set in .env.local + Vercel envs.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// Loads GA4 only in production and only when an ID is configured — mirrors the
// dev/localhost gating in ClarityAnalytics so local dev never pollutes stats.
// SPA route changes are captured by GA4 Enhanced Measurement (on by default),
// which tracks History API navigations that Next.js App Router uses.
//
// The two halves are loaded deliberately differently, and swapping either one
// back breaks something:
//
//   - The queue stub is a plain <script>, NOT next/script. In the App Router,
//     `strategy="afterInteractive"` does not put the tag in the server HTML at
//     all — it lives in the RSC payload and this component injects it from an
//     effect. React runs effects child-first, and <GoogleAnalytics> is the last
//     child of <body>, so every mount effect under {children} had already run
//     and found window.gtag undefined. trackEvent silently no-ops when it does,
//     so first-commit events were dropped on every cold load: view_item,
//     view_item_list, and — the expensive one — the `purchase` on
//     /payment-result, which is the ONLY place an online sale is ever counted.
//     A plain inline script runs during HTML parse, so the queue always exists
//     before hydration.
//
//   - gtag.js itself stays afterInteractive. It is ~90 KB and nothing needs it
//     early: it replays whatever is already in window.dataLayer when it loads.
//     Making it beforeInteractive would buy nothing and cost the perf budget.
export function GoogleAnalytics() {
  if (!GA_ID || process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <script
        id="ga-init"
        dangerouslySetInnerHTML={{
          __html:
            `window.dataLayer=window.dataLayer||[];` +
            `function gtag(){dataLayer.push(arguments);}` +
            `gtag('js',new Date());` +
            `gtag('config','${GA_ID}');`,
        }}
      />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
    </>
  );
}
