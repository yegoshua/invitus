"use client";

import { CTALink } from "@/components/ui/cta-link";
import { ProductScrollGrid } from "@/components/ui/product-scroll-grid";
import { FadeUp } from "@/components/ui/fade-up";
import type { Product } from "@/types";

interface ShopCTAProps {
  products?: Product[];
}

export function ShopCTA({ products = [] }: ShopCTAProps) {
  if (products.length === 0) return null;

  return (
    <div className="bg-black p-2 sm:p-3 lg:p-4">
      <section className="relative overflow-hidden rounded-section pt-20 lg:pt-45">
        <div className="relative z-10">
          {/* Heading */}
          <FadeUp className="container-main text-left md:text-center mb-10 lg:mb-20">
            <h2 className="font-heading text-h2 font-bold text-white">
              Обирай екіп для нових рекордів
            </h2>
          </FadeUp>

          {/* Products */}
          <div className="mb-12 lg:mb-16">
            <ProductScrollGrid products={products} />
          </div>

          {/* CTA Button */}
          <FadeUp delay={0.4} className="container-main text-center">
            <CTALink href="/shop" variant="outline" size="large" color="coral" className="md:w-full lg:w-auto">
              ЧЕКНУТИ УСЕ
            </CTALink>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
