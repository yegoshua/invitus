import { ProductRow } from "@/components/sections/product-row";
import type { Product } from "@/types";

interface RelatedProductsProps {
  products?: Product[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  return (
    <ProductRow
      products={products}
      title="Твій фул-сет тут"
      ctaHref="/shop/belts"
      ctaLabel="ЧЕКНУТИ УСЕ"
      className="pt-20 lg:pt-32"
      titleClassName="text-left lg:text-center mb-10 lg:mb-20"
      gridWrapperClassName="mb-10"
    />
  );
}
