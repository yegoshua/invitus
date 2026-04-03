"use client";

import { motion } from "framer-motion";
import { CTALink } from "@/components/ui/cta-link";
import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/types";

interface ProductShowcaseProps {
  products?: Product[];
}

export function ProductShowcase({ products = [] }: ProductShowcaseProps) {
  if (products.length === 0) return null;

  return (
    <section className="bg-black pb-20 pt-4 lg:pb-44">
      <div className="container-main lg:overflow-visible">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible mb-12">
          {products.map((product, index) => (
            <div key={product.id} className="min-w-[70vw] md:min-w-[318px] lg:min-w-0">
              <ProductCard product={product} index={index} />
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
          <CTALink href="/shop" variant="outline" size="large" color="coral" className="md:w-full lg:w-auto">
            ЧЕКНУТИ УСЕ
          </CTALink>
        </motion.div>
      </div>
    </section>
  );
}
