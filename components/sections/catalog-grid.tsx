"use client";

import { motion } from "framer-motion";
import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/types";

interface CatalogGridProps {
  products: Product[];
}

export function CatalogGrid({ products }: CatalogGridProps) {
  if (products.length === 0) {
    return (
      <section className="bg-black py-12 lg:py-20">
        <div className="container-main">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-neutral-400 text-xl"
          >
            Товарів не знайдено
          </motion.p>
        </div>
      </section>
    );
  }

  // Create grid items with size information
  // Pattern: 2 large, 4 small, 4 small, 2 large (repeating)
  // Large cards span 2 columns, small cards span 1 column
  const getItemSize = (index: number): "large" | "small" => {
    const patternPosition = index % 12;
    // Positions 0,1 and 10,11 are large (2 at start, 2 at end of 12-item cycle)
    if (patternPosition < 2 || patternPosition >= 10) {
      return "large";
    }
    return "small";
  };

  return (
    <section className="bg-black">
      <div className="container-main">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12">
          {products.map((product, index) => {
            const size = getItemSize(index);
            const isLarge = size === "large";

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (index % 4) * 0.1 }}
                className={isLarge ? "col-span-1 lg:col-span-2" : "col-span-1"}
              >
                <ProductCard product={product} variant="dark" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
