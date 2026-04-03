"use client";

import { motion } from "framer-motion";
import { CTALink } from "@/components/ui/cta-link";
import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/types";

interface RelatedProductsProps {
  products?: Product[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  // If no products provided, don't render
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="bg-black py-20 lg:py-32">
      <div className="container-main">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-heading text-h2 font-bold text-white text-left lg:text-center mb-8 lg:mb-20"
        >
          Твій фул-сет тут
        </motion.h2>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible mb-12">
          {products.map((product, index) => (
            <div key={product.id} className="min-w-[70vw] md:min-w-[318px] lg:min-w-0">
              <ProductCard
                product={product}
                index={index}
                variant="gray"
              />
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <CTALink href="/shop/belts" variant="outline" size="large" color="coral">
            ЧЕКНУТИ УСЕ
          </CTALink>
        </motion.div>
      </div>
    </section>
  );
}
