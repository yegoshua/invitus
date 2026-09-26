"use client";

import Image from "next/image";
import Link from "next/link";
import { warmModelViewer } from "@/components/models/model-viewer";
import { CUSTOM_BASE } from "@/lib/custom-base";
import { formatPriceWithCurrency } from "@/lib/format";
import { trackEvent } from "@/lib/gtag";

/**
 * The one way into /custom-belt: the last card in the belts grid, in a product
 * card's clothes. Not a product — nothing to add to a cart, no GA item — so it
 * has its own event instead of `select_item`.
 *
 * Its "photo" is the catalogue hero's red glow with the promise written on it:
 * any product photo here would read as a second listing of that belt.
 */
export function CustomBeltCard() {
  return (
    <article className="group md:w-[318px] md:flex-shrink-0 lg:w-auto">
      <Link
        href="/custom-belt"
        className="block"
        // The builder renders with the 3D viewer; warm it the way a product
        // card does, through the viewer's own dynamic import.
        onPointerEnter={warmModelViewer}
        onTouchStart={warmModelViewer}
        onClick={() => trackEvent("custom_belt_card_click", {})}
      >
        <div className="overflow-hidden rounded-[24px] bg-surface lg:rounded-[32px]">
          <div className="@container relative flex aspect-square items-center justify-center overflow-hidden">
            <Image
              src="/assets/img/bg-catalog.png"
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <p className="relative px-6 text-center font-heading text-[11cqw] font-bold uppercase leading-none text-white">
              Твій
              <br />
              малюнок
              <br />
              на поясі
            </p>
          </div>

          <div className="px-5 pb-5 pt-4 lg:px-6 lg:pb-6 lg:pt-5">
            <h3 className="font-golos text-base font-medium leading-tight tracking-[0.01em] text-white lg:text-lg">
              Свій дизайн
            </h3>
            <p className="mt-2 font-golos text-base font-medium leading-tight tracking-[0.01em] text-white lg:mt-3 lg:text-lg">
              від {formatPriceWithCurrency(CUSTOM_BASE.fromPrice)}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
