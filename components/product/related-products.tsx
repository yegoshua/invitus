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
          className="font-heading text-[32px] lg:text-[40px] font-bold text-white text-center mb-12 lg:mb-16"
        >
          Твій фул-сет тут
        </motion.h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              variant="gray"
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <CTALink href="/shop/belts" variant="outline" color="coral">
            ЧЕКНУТИ УСЕ
          </CTALink>
        </motion.div>
      </div>
    </section>
  );
}
