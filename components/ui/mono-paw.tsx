import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * monobank's paw — the mark the design puts on everything «частинами»: peeking
 * over the corner of the «Від … ₴ / міс» button and of the instalment radio.
 *
 * A 128px WebP (5 KB), not the 480px PNG-in-an-SVG the design exported
 * (104 KB): it is never drawn above 64px, and 2× that is what a retina screen
 * needs. Decorative, so no alt text — the label beside it already says
 * "monobank".
 */
export function MonoPaw({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/img/mono-paw.webp"
      alt=""
      width={128}
      height={128}
      aria-hidden
      className={cn("pointer-events-none select-none", className)}
    />
  );
}
