"use client";

import { useEffect } from "react";
import { ProductCard } from "@/components/ui/product-card";
import { CustomBeltCard } from "@/components/custom-belt/custom-belt-card";
import { FadeUp } from "@/components/ui/fade-up";
import { gaItem, trackEvent } from "@/lib/gtag";
import type { Product } from "@/types";

const LIST_NAME = "Каталог";

// One desktop row (`lg:grid-cols-4`). On mobile the grid is a single column, so
// this is more cards than are strictly visible — but they are ~30 KB thumbnails
// and guessing the viewport on the server is not possible. Measured both ways;
// see the note on #60.
const ABOVE_THE_FOLD = 4;

interface CatalogGridProps {
  products: Product[];
  /** End the grid with the «Свій дизайн» card — the belts catalogue only. */
  withCustomBelt?: boolean;
}

export function CatalogGrid({ products, withCustomBelt = false }: CatalogGridProps) {
  // GA4: view_item_list once the catalog is rendered.
  useEffect(() => {
    if (products.length) {
      trackEvent("view_item_list", {
        item_list_name: LIST_NAME,
        items: products.map((p, index) => gaItem(p, { index })),
      });
    }
  }, [products]);

  // The card is the only way into the builder, so an empty or unreachable
  // catalogue still shows it. Painted, not faded, when it lands in the first
  // row — the same rule as the product cards there.
  const customBeltCard = withCustomBelt ? (
    products.length < ABOVE_THE_FOLD ? (
      <CustomBeltCard />
    ) : (
      <FadeUp duration={0.5} delay={(products.length % 4) * 0.1}>
        <CustomBeltCard />
      </FadeUp>
    )
  ) : null;

  if (products.length === 0) {
    return (
      <section className="bg-black py-12 lg:py-20">
        <div className="container-main flex flex-col gap-8">
          <p className="text-center text-neutral-400 text-xl">
            Товарів не знайдено
          </p>
          {customBeltCard && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">{customBeltCard}</div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-black">
      <div className="container-main">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-6">
          {products.map((product, index) => {
            const card = (
              <ProductCard
                product={product}
                index={index}
                listName={LIST_NAME}
                aboveTheFold={index < ABOVE_THE_FOLD}
              />
            );

            // The first row carries the LCP, so it is painted rather than
            // animated in. `FadeUp` here wrapped a card that was *already*
            // fading itself — two entrance animations stacked on the element
            // the page is judged by.
            return index < ABOVE_THE_FOLD ? (
              <div key={product.id}>{card}</div>
            ) : (
              <FadeUp key={product.id} duration={0.5} delay={(index % 4) * 0.1}>
                {card}
              </FadeUp>
            );
          })}
          {customBeltCard}
        </div>
      </div>
    </section>
  );
}
