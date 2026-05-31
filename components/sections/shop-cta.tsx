import { ProductRow } from "@/components/sections/product-row";
import type { Product } from "@/types";

interface ShopCTAProps {
  products?: Product[];
}

export function ShopCTA({ products = [] }: ShopCTAProps) {
  return (
    <ProductRow
      products={products}
      title="Обирай екіп для нових рекордів"
      ctaHref="/shop/belts"
      ctaLabel="ЧЕКНУТИ УСЕ"
      rounded
      className="pt-20 lg:pt-45"
      titleClassName="text-left md:text-center mb-10 lg:mb-20"
      gridWrapperClassName="mb-12 lg:mb-16"
      ctaClassName="md:w-full lg:w-auto"
    />
  );
}
