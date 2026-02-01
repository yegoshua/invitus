"use client";

import { motion } from "framer-motion";
import { CTALink } from "@/components/ui/cta-link";
import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/types";

const relatedProducts: Product[] = [
  {
    id: "related-1",
    name: "Berserk Lifting Belt",
    slug: "belt-berserk",
    price: 4100,
    images: [],
  },
  {
    id: "related-2",
    name: "Tiger Lifting Belt",
    slug: "belt-tiger",
    price: 4100,
    images: [],
  },
  {
    id: "related-3",
    name: "Koi Lifting Belt",
    slug: "belt-koi",
    price: 4100,
    images: [],
  },
  {
    id: "related-4",
    name: "Poseidon Lifting Belt",
    slug: "belt-poseidon",
    price: 4100,
    images: [],
  },
];

export function RelatedProducts() {
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
          {relatedProducts.map((product, index) => (
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
          <CTALink href="/shop" variant="outline" color="coral">
            ЧЕКНУТИ УСЕ
          </CTALink>
        </motion.div>
      </div>
    </section>
  );
}
