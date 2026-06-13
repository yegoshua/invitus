"use client";

import { ProductMedia } from "@/components/ui/product-media";
import { FadeUp } from "@/components/ui/fade-up";
import type { ProductImage } from "@/types";

interface ProductImagesSectionProps {
  images: ProductImage[];
}

export function ProductImagesSection({ images }: ProductImagesSectionProps) {
  if (images.length === 0) return null;

  return (
    <section className="bg-black lg:pt-4">
      <div className="container-main [--container-px:0.5rem] md:[--container-px:clamp(1.5rem,5vw,2rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((image, index) => (
            <FadeUp
              key={index}
              delay={index * 0.15}
              className="relative aspect-[696/870] rounded-3xl md:rounded-[48px] overflow-hidden"
            >
              <ProductMedia image={image} fill className="object-cover" />
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
