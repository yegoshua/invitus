"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/types";

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Атлетичний пояс Classic",
    slug: "belt-classic",
    price: 4100,
    images: [],
  },
  {
    id: "2",
    name: "Атлетичний пояс Pro",
    slug: "belt-pro",
    price: 4500,
    images: [],
  },
  {
    id: "3",
    name: "Атлетичний пояс Elite",
    slug: "belt-elite",
    price: 5200,
    images: [],
  },
  {
    id: "4",
    name: "Атлетичний пояс Limited",
    slug: "belt-limited",
    price: 5900,
    images: [],
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
          <Link
            href="/shop"
            className="group inline-flex items-center gap-6 border-2 border-coral text-coral font-druk font-bold px-12 py-5 rounded-full hover:bg-coral hover:text-black transition-all duration-300"
          >
            ЧЕКНУТИ УСЕ
            <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
