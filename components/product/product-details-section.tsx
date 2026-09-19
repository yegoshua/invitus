"use client";

import { productDetailItems } from "./product-info-items";
import { ProductInfoAccordion } from "./product-info-accordion";
import type { Product } from "@/types";

/**
 * Description, design story and care — the wide rows under the photos.
 *
 * Desktop only: on mobile the same panels sit under the hero card, before the
 * photos, where ProductPageContent draws them. Two placements for one list is
 * the design; one component in two places is how they stay one list.
 */
export function ProductDetailsSection({ product }: { product: Product }) {
  const items = productDetailItems(product);
  if (items.length === 0) return null;

  return (
    <section className="hidden lg:block bg-black pt-4">
      <div className="container-main">
        <ProductInfoAccordion items={items} variant="wide" />
      </div>
    </section>
  );
}
