"use client";

import Image from "next/image";
import { motion } from "framer-motion";

// Mirrors CatalogHero 1:1 (same bg-catalog.png banner, overlay, spacing and
// heading treatment), the way RefundHero does — only the title text differs.
export function NotFoundHero() {
  return (
    <div className="bg-black pb-4 sm:p-3 lg:p-4 px-2">
      <section className="relative py-6 lg:pt-30 lg:pb-16 overflow-hidden rounded-[24px] lg:rounded-section mt-16 lg:mt-0">
        {/* Background image */}
        <Image
          src="/assets/img/bg-catalog.png"
          alt=""
          fill
          className="object-cover object-center pointer-events-none"
          priority
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        <div className="container-main relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-heading text-[32px] lg:text-[48px] font-bold text-white"
          >
            Сторінку не знайдено
          </motion.h1>
        </div>
      </section>
    </div>
  );
}
