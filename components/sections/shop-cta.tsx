"use client";

import { motion } from "framer-motion";
import { CTALink } from "@/components/ui/cta-link";
import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/types";

const featuredProducts: Product[] = [
  {
    id: "5",
    name: "Berserk Lifting Belt",
    slug: "belt-naruto",
    price: 2800,
    images: [{ url: "/assets/img/belts/berserk-belt.jpeg", alt: "Пояс Berserk" }],
  },
  {
    id: "6",
    name: "Akatsuki Lifting Belt",
    slug: "belt-akatsuki",
    price: 2800,
    images: [{ url: "/assets/img/belts/akatsuki-belt.jpeg", alt: "Пояс Akatsuki" }],
  },
  {
    id: "7",
    name: "Poseidon Lifting Belt",
    slug: "belt-poseidon",
    price: 3200,
    images: [{ url: "/assets/img/belts/poseidon-belt.jpeg", alt: "Пояс Poseidon" }],
  },
  {
    id: "8",
    name: "Dragon Wave Belt",
    slug: "belt-dragon",
    price: 3000,
    images: [{ url: "/assets/img/belts/berserk-belt.jpeg", alt: "Пояс Dragon Wave" }],
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
            <h2 className="font-heading text-h2 font-bold text-black">
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
