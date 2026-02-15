"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { FilterChip } from "@/components/ui/filter-chip";
interface CatalogHeroProps {
  categoryName: string;
  productCount: number;
  filters: { slug: string; label: string }[];
  activeFilter: string;
}

export function CatalogHero({
  categoryName,
  productCount,
  filters,
  activeFilter,
}: CatalogHeroProps) {
  return (
    <div className="bg-black p-2 sm:p-3 lg:p-4">
      <section className="relative pt-28 pb-12 lg:pt-36 lg:pb-16 overflow-hidden rounded-section">
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
            className="font-heading text-[32px] lg:text-[48px] font-bold text-white mb-8 lg:mb-12"
          >
            {categoryName}{" "}
            ({productCount})
          </motion.h1>

          {/* Filter chips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-wrap gap-3"
          >
            {filters.map((filter) => (
              <FilterChip
                key={filter.slug}
                slug={filter.slug}
                label={filter.label}
                isActive={activeFilter === filter.slug}
              />
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
