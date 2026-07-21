"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ProductMedia } from "@/components/ui/product-media";
import { formatPrice } from "@/lib/format";
import { gaItem, trackEvent } from "@/lib/gtag";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  index?: number;
  /** Name of the list this card belongs to (correlates view_item_list ↔ select_item). */
  listName?: string;
}

export function ProductCard({ product, index = 0, listName }: ProductCardProps) {
  const formattedPrice = formatPrice(product.price);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group md:flex-shrink-0 md:w-[318px] lg:w-auto"
    >
      <Link
        href={`/product/${product.slug}`}
        className="block"
        onClick={() =>
          trackEvent("select_item", {
            item_list_name: listName,
            items: [gaItem(product, { index })],
          })
        }
      >
        <div className="bg-surface rounded-[24px] lg:rounded-[32px] overflow-hidden">
          <div className="relative aspect-square overflow-hidden">
            <ProductMedia
              image={product.mainImage}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          <div className="px-5 lg:px-6 pt-4 pb-5 lg:pt-5 lg:pb-6">
            <h3 className="font-golos text-base lg:text-lg leading-tight tracking-[0.01em] font-medium text-white">
              {product.name}
            </h3>
            <p className="font-golos text-base lg:text-lg leading-tight tracking-[0.01em] font-medium text-white mt-2 lg:mt-3">
              {formattedPrice} ₴
            </p>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
