import type { Metadata } from "next";
import { Archivo, Golos_Text } from "next/font/google";
import { Providers } from "./providers";
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
  title: "INVITUS | Екіпірування для пауерліфтингу",
  description:
    "Український бренд екіпірування для пауерліфтингу. Атлетичні пояси, футболки, кистьові бинти та аксесуари для важкої атлетики.",
  keywords: [
    "пауерліфтинг",
    "атлетичний пояс",
    "важка атлетика",
    "INVITUS",
    "спортивне екіпірування",
    "Україна",
  ],
  icons: {
    icon: "/assets/icons/favico.jpeg",
  },
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
      </body>
    </html>
  );
}
