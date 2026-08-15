"use client";

import { useEffect } from "react";
import { ProductCard } from "@/components/ui/product-card";
import { useWarmModelViewerWhenIdle } from "@/components/models/model-viewer";
import { FadeUp } from "@/components/ui/fade-up";
import { gaItem, trackEvent } from "@/lib/gtag";
import type { Product } from "@/types";

const LIST_NAME = "Каталог";

interface CatalogGridProps {
  products: Product[];
}

export function CatalogGrid({ products }: CatalogGridProps) {
  // For the visitor who never hovers — a phone, where the first contact with a
  // card is the tap itself.
  useWarmModelViewerWhenIdle();

  // GA4: view_item_list once the catalog is rendered.
  useEffect(() => {
    if (products.length) {
      trackEvent("view_item_list", {
        item_list_name: LIST_NAME,
        items: products.map((p, index) => gaItem(p, { index })),
      });
    }
  }, [products]);

  if (products.length === 0) {
    return (
      <section className="bg-black py-12 lg:py-20">
        <div className="container-main">
          <p className="text-center text-neutral-400 text-xl">
            Товарів не знайдено
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-black">
      <div className="container-main">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-6">
          {products.map((product, index) => (
            <FadeUp key={product.id} duration={0.5} delay={(index % 4) * 0.1}>
              <ProductCard
                product={product}
                index={index}
                listName={LIST_NAME}
              />
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
