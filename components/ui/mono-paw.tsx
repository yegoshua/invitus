import Image from "next/image";
import { cn } from "@/lib/utils";

/** Alt text where the paw is the only thing on screen naming the bank. */
export const MONO_PAW_LABEL = "Покупка частинами monobank";

/**
 * monobank's paw — the mark the design puts on everything «частинами»: peeking
 * over the corner of the «Від … ₴ / міс» button and of the instalment radio.
 *
 * A 128px WebP (5 KB), not the 480px PNG-in-an-SVG the design exported
 * (104 KB): it is never drawn above 64px, and 2× that is what a retina screen
 * needs.
 *
 * `label` is for the places where the paw is the only thing naming the bank:
 * the catalogue card and the product button say «від … / міс» and nothing
 * else, so there the image carries meaning and gets alt text. Where the label
 * beside it already says "monobank" (the checkout radio) it is left out and
 * the paw stays decorative — the same word read twice is noise.
 */
export function MonoPaw({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Image
      src="/assets/img/mono-paw.webp"
      alt={label ?? ""}
      width={128}
      height={128}
      aria-hidden={label ? undefined : true}
      className={cn("pointer-events-none select-none", className)}
    />
  );
}
