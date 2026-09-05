import type { Product } from "@/types";

export interface ProductInfoItem {
  id: string;
  title: string;
  content: string;
}

/**
 * The size guide, on its own: it sits beside the size chips in the hero on
 * desktop and heads the list on mobile.
 */
export function sizeGuideItem(product: Product): ProductInfoItem | null {
  return product.howToMeasure
    ? { id: "measure", title: "Як визначити розмір?", content: product.howToMeasure }
    : null;
}

/**
 * The panels that describe the product — under the photos on desktop, under
 * the size guide on mobile. Anything the product has no text for is left out
 * rather than drawn empty.
 */
export function productDetailItems(product: Product): ProductInfoItem[] {
  const isBelt = product.category === "belts";
  return [
    {
      id: "description",
      title: isBelt ? "Опис поясу" : "Опис товару",
      content: product.description,
    },
    { id: "story", title: "Історія дизайну", content: product.designStory },
    { id: "care", title: "Інструкція з догляду", content: product.careInstructions },
  ].filter((item): item is ProductInfoItem => Boolean(item.content));
}
