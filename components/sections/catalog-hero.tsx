"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface CatalogHeroProps {
  categoryName: string;
  productCount: number;
}

export function CatalogHero({ categoryName, productCount }: CatalogHeroProps) {
  return (
    <div className="bg-black pb-4 sm:p-3 lg:p-4 px-2">
      <section className="relative py-6 lg:pt-36 lggj:pb-16 overflow-hidden rounded-section mt-16 lg:mt-0">
        {/* Background image */}
        <Image
          src="/assets/img/catalog-bg.png"
          alt=""
          fill
          className="object-cover object-center pointer-events-none"
          priority
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        <div className="container-main relative z-10">
          {/* Category title with count */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-heading text-[32px] lg:text-[48px] font-bold text-white"
          >
            {categoryName} ({productCount})
          </motion.h1>
        </div>
      </section>
    </div>
  );
}
