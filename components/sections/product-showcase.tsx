"use client";

import { CTALink } from "@/components/ui/cta-link";
import { ProductScrollGrid } from "@/components/ui/product-scroll-grid";
import { FadeUp } from "@/components/ui/fade-up";
import type { Product } from "@/types";

interface ProductShowcaseProps {
  products?: Product[];
}

export function ProductShowcase({ products = [] }: ProductShowcaseProps) {
  if (products.length === 0) return null;

  return (
    <section className="bg-black pb-20 pt-4 lg:pb-44">
      <div className="mb-10 lg:mb-12">
        <ProductScrollGrid products={products} />
      </div>

      <div className="container-main">
        <FadeUp delay={0.4} className="text-center">
          <CTALink href="/shop" variant="outline" size="large" color="coral" className="md:w-full lg:w-auto">
            ЧЕКНУТИ УСЕ
          </CTALink>
        </FadeUp>
      </div>
    </section>
  );
}
