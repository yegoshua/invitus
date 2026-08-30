"use client";

import Image from "next/image";
import { motion } from "framer-motion";

// The banner at the top of every non-landing page: catalogue, refund policy,
// 404, error. It used to exist as three byte-identical copies — CatalogHero,
// NotFoundHero and RefundHero — differing only in what went inside the <h1>,
// each carrying its own note saying it mirrored the others. Four copies was the
// point to stop: the geometry below is a design spec, and a spec that lives in
// four files drifts in four directions.
//
// CatalogSkeleton used to reproduce this footprint independently, back when the
// shop hero sat inside the catalogue's Suspense boundary. It no longer does
// (#79) — the hero renders above the boundary, so the skeleton covers the grid
// alone and the two are free to drift.

type Props = {
  /** Rendered inside the h1. A node, so a caller can emphasise part of it. */
  title: React.ReactNode;
};

export function PageHero({ title }: Props) {
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
            {title}
          </motion.h1>
        </div>
      </section>
    </div>
  );
}
