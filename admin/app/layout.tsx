import type { Metadata } from "next";
import { Golos_Text } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const golosText = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// The site's own Druk file, so the two apps cannot drift apart.
const drukWide = localFont({
  src: [{ path: "../../app/fonts/Display-font.woff2", weight: "700", style: "normal" }],
  variable: "--font-druk",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "INVITUS Admin", template: "%s · INVITUS Admin" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className="dark">
      <body className={`${golosText.variable} ${drukWide.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
