"use client";

import { ProductMedia } from "@/components/ui/product-media";
import { FadeUp } from "@/components/ui/fade-up";
import type { ProductImage } from "@/types";
import { ProductAttributes } from "./product-attributes";

interface ProductImagesSectionProps {
  images: ProductImage[];
  /**
   * When given, the bullet list is slotted in after the first two photos and
   * the remaining photos follow it — the belt layout. Without it the photos
   * simply run in pairs.
   */
  attributes?: string[];
}

const FRAME_CLASS =
  "relative aspect-[374/467] md:aspect-[696/870] rounded-3xl md:rounded-[48px] overflow-hidden";

export function ProductImagesSection({
  images,
  attributes,
}: ProductImagesSectionProps) {
  if (images.length === 0) return null;

  const hasAttributes = Boolean(attributes?.length);
  const firstRow = hasAttributes ? images.slice(0, 2) : images;
  const secondRow = hasAttributes ? images.slice(2, 4) : [];
  // A belt is meant to have four photos. Three is a photo still to be shot, so
  // the fourth slot is kept as an empty frame — as the design draws it — rather
  // than letting one photo sit alone at full width and pretend to be the
  // layout.
  const secondRowPlaceholders =
    secondRow.length === 1 ? [null] : ([] as null[]);

  return (
    <section className="bg-black lg:pt-4">
      <div className="container-main [--container-px:0.5rem] md:[--container-px:clamp(1.5rem,5vw,2rem)] flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {firstRow.map((image, index) => (
            <FadeUp key={index} delay={index * 0.15} className={FRAME_CLASS}>
              <ProductMedia image={image} fill className="object-cover" />
            </FadeUp>
          ))}
        </div>

        {hasAttributes && (
          <FadeUp>
            <ProductAttributes items={attributes!} />
          </FadeUp>
        )}

        {secondRow.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {secondRow.map((image, index) => (
              <FadeUp key={index} delay={index * 0.15} className={FRAME_CLASS}>
                <ProductMedia image={image} fill className="object-cover" />
              </FadeUp>
            ))}
            {secondRowPlaceholders.map((_, index) => (
              <FadeUp
                key={`placeholder-${index}`}
                delay={0.15}
                className={`${FRAME_CLASS} bg-surface`}
                aria-hidden
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
