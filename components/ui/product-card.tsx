"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ProductMedia } from "@/components/ui/product-media";
import {
  useWarmModelViewerWhenIdle,
  warmModelViewer,
} from "@/components/models/model-viewer";
import { formatPrice } from "@/lib/format";
import { orFromMonthlyLabel } from "@/lib/installments";
import { MonoPaw } from "@/components/ui/mono-paw";
import { gaItem, trackEvent } from "@/lib/gtag";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  index?: number;
  /** Name of the list this card belongs to (correlates view_item_list ↔ select_item). */
  listName?: string;
  /**
   * This card is on screen before the visitor scrolls, so it is a candidate for
   * the page's LCP. Its image is fetched eagerly and at high priority, and it
   * does not fade in — both of which are the difference between an 8.4 s LCP
   * and a fast one on the catalog (#60).
   *
   * Only pass it for cards genuinely in the first screenful. Every `priority`
   * image is also a `<link rel=preload>`, and a page that preloads everything
   * has prioritised nothing.
   */
  aboveTheFold?: boolean;
  /**
   * Show the instalment offer — the paw on the photo and «або від … / міс»
   * after the price — for a product priced over the floor. The catalogue asks
   * for it; the homepage rows and cross-sell keep the plain card.
   */
  showInstalments?: boolean;
}

export function ProductCard({
  product,
  index = 0,
  listName,
  aboveTheFold = false,
  showInstalments = false,
}: ProductCardProps) {
  // For the visitor who never hovers — a phone, where the first contact with a
  // card is the tap itself. Owned by the card rather than by each grid, so a
  // new listing surface cannot forget it. Only the first card on a page
  // actually schedules anything.
  useWarmModelViewerWhenIdle();

  const formattedPrice = formatPrice(product.price);
  const partsLabel = showInstalments ? orFromMonthlyLabel(product.price) : null;

  // A card that decides the LCP does not get to spend half a second being
  // transparent first. Cards further down keep the entrance they always had.
  const entrance = aboveTheFold
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5, delay: index * 0.1 },
      };

  return (
    <motion.article
      {...entrance}
      className="group md:flex-shrink-0 md:w-[318px] lg:w-auto"
    >
      <Link
        href={`/product/${product.slug}`}
        className="block"
        // Reaching for a product is the earliest honest signal that its 3D is
        // about to be wanted. Next is already prefetching the route itself;
        // this fetches the chunk that route renders with, so the tap that
        // follows lands on something warm.
        onPointerEnter={warmModelViewer}
        onTouchStart={warmModelViewer}
        onClick={() =>
          trackEvent("select_item", {
            item_list_name: listName,
            items: [gaItem(product, { index })],
          })
        }
      >
        <div className="bg-surface rounded-[24px] lg:rounded-[32px] overflow-hidden">
          <div className="relative aspect-square overflow-hidden">
            <ProductMedia
              image={product.mainImage}
              fill
              // `priority` buys eager loading and a preload hint for the whole
              // first row. The hint that says "this one before the others" goes
              // to one card only — the top-left, which is the LCP element in
              // both the one-column and the four-column layout. Next does not
              // emit it by itself, and Lighthouse checks for it by name.
              priority={aboveTheFold}
              fetchPriority={aboveTheFold && index === 0 ? "high" : undefined}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {partsLabel && <MonoPaw className="absolute left-4 bottom-3 size-14" />}
          </div>

          <div className="px-5 lg:px-6 pt-4 pb-5 lg:pt-5 lg:pb-6">
            <h3 className="font-golos text-base lg:text-lg leading-tight tracking-[0.01em] font-medium text-white">
              {product.name}
            </h3>
            <p className="font-golos text-base lg:text-lg leading-tight tracking-[0.01em] font-medium text-white mt-2 lg:mt-3">
              {formattedPrice} ₴
              {partsLabel && (
                <span className="ml-2 whitespace-nowrap text-sm/5 lg:text-base/6 tracking-normal text-white/64">
                  {partsLabel}
                </span>
              )}
            </p>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
