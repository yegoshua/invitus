"use client";

import { motion } from "framer-motion";
import { CTALink } from "@/components/ui/cta-link";
import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Akatsuki Lifting Belt",
    slug: "belt-akatsuki",
    price: 2800,
    images: [{ url: "/assets/img/belts/akatsuki-belt.jpeg", alt: "Пояс Akatsuki" }],
  },
  {
    id: "2",
    name: "Berserk Lifting Belt",
    slug: "belt-naruto",
    price: 2800,
    images: [{ url: "/assets/img/belts/berserk-belt.jpeg", alt: "Пояс Berserk" }],
  },
  {
    id: "3",
    name: "Poseidon Lifting Belt",
    slug: "belt-poseidon",
    price: 3200,
    images: [{ url: "/assets/img/belts/poseidon-belt.jpeg", alt: "Пояс Poseidon" }],
  },
  {
    id: "4",
    name: "Zeus Power Belt",
    slug: "belt-zeus",
    price: 3200,
    images: [{ url: "/assets/img/belts/akatsuki-belt.jpeg", alt: "Пояс Zeus" }],
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
