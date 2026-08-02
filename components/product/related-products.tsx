import { ProductRow } from "@/components/sections/product-row";
import type { Product } from "@/types";

interface RelatedProductsProps {
  products?: Product[];
  /** Category slug of the product being viewed — the CTA points at its catalog page. */
  categorySlug?: string;
}

export function RelatedProducts({ products, categorySlug }: RelatedProductsProps) {
  return (
    <ProductRow
      products={products}
      title="Твій фул-сет тут"
      ctaHref={`/shop/${categorySlug ?? "belts"}`}
      ctaLabel="ЧЕКНУТИ УСЕ"
      className="pt-20 lg:pt-32"
      titleClassName="text-left lg:text-center mb-10 lg:mb-20"
      gridWrapperClassName="mb-10"
    />
  );
}
