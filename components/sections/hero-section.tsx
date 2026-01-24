"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <div className="bg-black p-2 sm:p-3 lg:p-4">
      <section className="relative h-[calc(90vh-16px)] sm:h-[calc(90vh-24px)] lg:h-[calc(90vh-32px)] flex items-end bg-[#1a1a1a] overflow-hidden rounded-2xl lg:rounded-3xl">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover grayscale opacity-30"
          >
            <source src="/assets/Hero Section.mp4" type="video/mp4" />
          </video>
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-[#1a1a1a]/60" />
        </div>

        {/* Content */}
        <div className="container-main relative z-10 pb-12 lg:pb-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-16">
            {/* H1 Title - Left Bottom */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="font-druk flex-1 text-[32px] sm:text-[40px] md:text-[48px] lg:text-[56px] font-bold text-white leading-[1.1] max-w-4xl"
            >
              Твій Gym Bro
              <br />
              на кожному підході
            </motion.h1>

            {/* CTA Button - Right Bottom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="shrink-0"
            >
              <Link
                href="/shop/belts"
                className="group inline-flex items-center gap-4 bg-coral text-black font-druk font-bold text-base lg:text-base px-8 lg:px-10 py-5 rounded-full transition-all duration-300 hover:brightness-110"
              >
                ЗАБРАТИ СВІЙ ПОЯС
                <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
