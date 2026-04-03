"use client";

import { motion } from "framer-motion";
import { CTALink } from "@/components/ui/cta-link";
import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/types";

interface ShopCTAProps {
  products?: Product[];
}

export function ShopCTA({ products = [] }: ShopCTAProps) {
  if (products.length === 0) return null;

  return (
    <div className="bg-black p-2 sm:p-3 lg:p-4">
      <section className="relative overflow-hidden rounded-section pt-20 lg:pt-45">
        <div className="container-main relative z-10">
          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 lg:mb-20"
          >
            <h2 className="font-heading text-h2 font-bold text-white">
              Обирай екіп для нових рекордів
            </h2>
          </motion.div>

          {/* Products Grid */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible mb-12 lg:mb-16">
            {products.map((product, index) => (
              <div key={product.id} className="min-w-[70vw] md:min-w-[318px] lg:min-w-0">
                <ProductCard
                  product={product}
                  index={index}
                />
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <CTALink href="/shop" variant="outline" size="large" color="coral" className="md:w-full lg:w-auto">
              ЧЕКНУТИ УСЕ
            </CTALink>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
