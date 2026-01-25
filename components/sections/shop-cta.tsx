"use client";

import { motion } from "framer-motion";
import { CTALink } from "@/components/ui/cta-link";
import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/types";

const featuredProducts: Product[] = [
  {
    id: "5",
    name: "Berserk Lifting Belt",
    slug: "berserk-lifting-belt",
    price: 4100,
    images: [],
  },
  {
    id: "6",
    name: "Tiger Lifting Belt",
    slug: "tiger-lifting-belt",
    price: 4100,
    images: [],
  },
  {
    id: "7",
    name: "Koi Lifting Belt",
    slug: "koi-lifting-belt",
    price: 4100,
    images: [],
  },
  {
    id: "8",
    name: "Poseidon Lifting Belt",
    slug: "poseidon-lifting-belt",
    price: 4100,
    images: [],
  },
];

export function ShopCTA() {
  return (
    <div className="bg-black p-2 sm:p-3 lg:p-4">
      <section className="relative bg-coral overflow-hidden rounded-section py-16 lg:py-24">
        <div className="container-main relative z-10">
          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 lg:mb-16"
          >
            <h2 className="font-druk text-[32px] lg:text-[40px] font-bold text-black">
              Обирай екіп для нових рекордів
            </h2>
          </motion.div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12 lg:mb-16">
            {featuredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                variant="coral"
              />
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
            <CTALink href="/shop" variant="outline" color="black">
              ЧЕКНУТИ УСЕ
            </CTALink>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
