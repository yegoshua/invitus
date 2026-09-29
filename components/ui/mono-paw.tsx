import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * monobank's paw — the mark the design puts on everything «частинами»: peeking
 * over the corner of the «Від … ₴ / міс» button and of the instalment radio.
 *
 * A 128px WebP (5 KB), not the 480px PNG-in-an-SVG the design exported
 * (104 KB): it is never drawn above 64px, and 2× that is what a retina screen
 * needs.
 *
 * Always carries alt text. On the catalogue card and the product button the
 * paw is the only thing naming the bank, so it is announced; at checkout the
 * radio's label already says "monobank", so `decorative` hides it from screen
 * readers — the same word read twice is noise — while crawlers still read it.
 */
export function MonoPaw({
  className,
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <Image
      src="/assets/img/mono-paw.webp"
      alt="Покупка частинами monobank"
      width={128}
      height={128}
      aria-hidden={decorative || undefined}
      className={cn("pointer-events-none select-none", className)}
    />
  );
}
