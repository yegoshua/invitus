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

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const formattedPrice = new Intl.NumberFormat("uk-UA", {
    style: "decimal",
    minimumFractionDigits: 0,
  }).format(product.price);

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
        <div className={`relative aspect-[3/4] bg-[#212121] rounded-[24px] lg:rounded-[32px] overflow-hidden`}>
          {product.images[0] ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-heading text-[clamp(1.5rem,3vw,2.5rem)] text-neutral-800 select-none">
                INVITUS
              </span>
            </div>
          )}

          {/* Product info overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md px-4 py-3 lg:px-5 lg:py-4 rounded-b-[24px] lg:rounded-b-[32px]">
            <h3 className="font-golos text-base lg:text-lg leading-tight tracking-[0.01em] font-medium text-white">
              {product.name}
            </h3>
            <p className="font-golos text-base lg:text-lg leading-tight tracking-[0.01em] font-medium text-white/80 mt-1">
              {formattedPrice} ₴
            </p>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
