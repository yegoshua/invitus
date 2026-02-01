"use client";

import { motion } from "framer-motion";
import { CTALink } from "@/components/ui/cta-link";
import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Classic Lifting Belt",
    slug: "belt-classic",
    price: 4100,
    images: [],
  },
  {
    id: "2",
    name: "Pro Lifting Belt",
    slug: "belt-pro",
    price: 4500,
    images: [],
  },
  {
    id: "3",
    name: "Elite Lifting Belt",
    slug: "belt-elite",
    price: 5200,
    images: [],
  },
  {
    id: "4",
    name: "Limited Lifting Belt",
    slug: "belt-limited",
    price: 5900,
    images: [],
  },
];

export function ProductShowcase() {
  return (
    <section className="bg-black pb-20 pt-4 lg:pb-44">
      <div className="container-main">       
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          {mockProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} variant="gray" />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <CTALink href="/shop" variant="outline" color="coral">
            ЧЕКНУТИ УСЕ
          </CTALink>
        </motion.div>
      </div>
    </section>
  );
}
