import { ProductRow } from "@/components/sections/product-row";
import type { Product } from "@/types";

interface ProductShowcaseProps {
  products?: Product[];
}

export function ProductShowcase({ products = [] }: ProductShowcaseProps) {
  return (
    <ProductRow
      products={products}
      ctaHref="/shop/belts"
      ctaLabel="ЧЕКНУТИ УСЕ"
      className="pb-20 pt-4 lg:pb-44"
      gridWrapperClassName="mb-10 lg:mb-12"
      ctaClassName="md:w-full lg:w-auto"
    />
  );
}
