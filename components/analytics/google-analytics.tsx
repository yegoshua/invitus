import Script from "next/script";

// GA4 Measurement ID, e.g. "G-XXXXXXXXXX". Set in .env.local + Vercel envs.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// Loads GA4 only in production and only when an ID is configured — mirrors the
// dev/localhost gating in ClarityAnalytics so local dev never pollutes stats.
// SPA route changes are captured by GA4 Enhanced Measurement (on by default),
// which tracks History API navigations that Next.js App Router uses.
export function GoogleAnalytics() {
  if (!GA_ID || process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
