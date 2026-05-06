"use client";

import { ProductCard } from "@/components/ui/product-card";
import { FadeUp } from "@/components/ui/fade-up";
import type { Product } from "@/types";

interface CatalogGridProps {
  products: Product[];
}

export function CatalogGrid({ products }: CatalogGridProps) {
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

  // Create grid items with size information
  // Pattern: 2 large, 4 small, 4 small, 2 large (repeating)
  // Large cards span 2 columns, small cards span 1 column
  const getItemSize = (index: number): "large" | "small" => {
    const patternPosition = index % 12;
    // Positions 0,1 and 10,11 are large (2 at start, 2 at end of 12-item cycle)
    if (patternPosition < 2 || patternPosition >= 10) {
      return "large";
    }
    return "small";
  };

  return (
    <section className="bg-black">
      <div className="container-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-12">
          {products.map((product, index) => {
            const isLarge = getItemSize(index) === "large";
            return (
              <FadeUp
                key={product.id}
                duration={0.5}
                delay={(index % 4) * 0.1}
                className={isLarge ? "lg:col-span-2" : "lg:col-span-1"}
              >
                <ProductCard product={product} />
              </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
