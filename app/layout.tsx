import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  display: "swap",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className="dark">
      <body className={`${archivo.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
