import type { Metadata } from "next";
import { Golos_Text } from "next/font/google";
import { Providers } from "./providers";
import { ClarityAnalytics } from "@/components/analytics/clarity";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/site";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";
import localFont from "next/font/local";
import "./globals.css";

// 1. Golos з Google
const golosText = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// Шлях './fonts/...' означає "в папці fonts поруч з цим файлом"
const drukWide = localFont({
  src: [
    {
      path: './fonts/Display-font.woff2', 
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-druk',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "INVITUS | Екіпірування для пауерліфтингу",
  description:
    "Український бренд екіпірування для пауерліфтингу. Атлетичні пояси, кистьові бинти та аксесуари для важкої атлетики.",
  keywords: [
    "пауерліфтинг",
    "атлетичний пояс",
    "важка атлетика",
    "INVITUS",
    "спортивне екіпірування",
    "Україна",
  ],
  // No `icons` block on purpose: app/favicon.ico and app/apple-icon.png are
  // picked up by Next's file convention and linked automatically. Declaring
  // them here too would emit a second, competing <link rel="icon">.
  // Google Search Console: renders <meta name="google-site-verification" ...>
  // when GOOGLE_SITE_VERIFICATION is set (URL-prefix / HTML-tag method).
  // Index and follow are what a crawler assumes anyway; spelling them out is
  // for the audits that read a missing tag as "no control", and the Google
  // directives let a result show a large image and a full-length snippet.
  // Inherited by every page, so a page that must stay out of the index
  // (checkout, payment result) overrides it with its own `robots`. Preview
  // deploys need nothing here — Vercel sends X-Robots-Tag: noindex for them.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  // No `alternates.canonical` here on purpose: metadata is inherited by every
  // segment that does not override it, so a canonical set at the root would
  // declare the homepage as the canonical of the entire site. Each page
  // declares its own.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className="dark">
      <body className={`${golosText.variable} ${drukWide.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <ClarityAnalytics />
        <GoogleAnalytics />
        <MetaPixel />
      </body>
    </html>
  );
}
