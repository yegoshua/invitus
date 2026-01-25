"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  index?: number;
  variant?: "dark" | "gray" | "coral";
}

export function ProductCard({ product, index = 0, variant = "dark" }: ProductCardProps) {
  const formattedPrice = new Intl.NumberFormat("uk-UA", {
    style: "decimal",
    minimumFractionDigits: 0,
  }).format(product.price);

  const isCoral = variant === "coral";

  const bgColor = {
    dark: "bg-black",
    gray: "bg-[#212121]",
    coral: "bg-black",
  }[variant];

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <Link href={`/product/${product.slug}`} className="block">
        {/* Image container with fluid aspect ratio */}
        <div className={`relative aspect-[3/4] ${bgColor} rounded-[24px] lg:rounded-[32px] overflow-hidden mb-4`}>
          {product.images[0] ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-druk text-[clamp(1.5rem,3vw,2.5rem)] text-neutral-800 select-none">
                INVITUS
              </span>
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="space-y-1">
          <h3
            className={`text-[clamp(0.875rem,1.5vw,1rem)] font-medium leading-tight ${
              isCoral ? "text-black" : "text-white"
            }`}
          >
            {product.name}
          </h3>
          <p className={`text-[clamp(0.875rem,1.5vw,1rem)] ${isCoral ? "text-black/70" : "text-neutral-400"}`}>
            {formattedPrice} ₴
          </p>
        </div>
      </Link>
    </motion.article>
  );
}
