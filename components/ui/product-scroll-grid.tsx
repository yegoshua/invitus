"use client";

import { ProductCard } from "@/components/ui/product-card";
import { useWarmModelViewerWhenIdle } from "@/components/models/model-viewer";
import type { Product } from "@/types";

interface ProductScrollGridProps {
  products: Product[];
}

export function ProductScrollGrid({ products }: ProductScrollGridProps) {
  // For the visitor who never hovers — a phone, where the first contact with a
  // card is the tap itself.
  useWarmModelViewerWhenIdle();

  return (
    <>
      {/* Mobile: horizontal scroll, escapes container to show right overflow */}
      <div className="overflow-x-auto overflow-y-hidden scrollbar-hide pb-2 lg:hidden">
        <div className="flex w-max gap-4 px-[clamp(1rem,5vw,2rem)]">
          {products.map((product, index) => (
            <div key={product.id} className="min-w-[70vw] md:min-w-[318px] shrink-0">
              <ProductCard product={product} index={index} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: grid inside container */}
      <div className="container-main hidden lg:block">
        <div className="grid grid-cols-4 gap-6">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </>
  );
}
