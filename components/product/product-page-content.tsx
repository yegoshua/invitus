"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import type { TransformedProduct } from "@/types/strapi";
import { SizeSelector } from "./size-selector";
import { ProductInfoAccordion } from "./product-info-accordion";
import { ModelLoader } from "@/components/models/model-loader";

interface ProductPageContentProps {
  product: TransformedProduct;
}

export function ProductPageContent({ product }: ProductPageContentProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const formattedPrice = new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    minimumFractionDigits: 0,
  }).format(product.price);

  const handleAddToCart = () => {
    addItem(product, selectedSize ?? undefined);
    openCart();
  };

  return (
    <>
      {/* ===== MOBILE LAYOUT ===== */}
      <div className="lg:hidden bg-black pb-4 sm:pb-28">
        {/* Hero Card */}
        <div className="relative mx-4 mt-4 rounded-[28px] overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <Image
              src={product.bgImage || "/assets/img/product_bg.png"}
              alt=""
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* 3D Model area */}
          <div className="relative h-[340px] sm:h-[440px] md:h-[540px]">
            <ModelLoader
              modelUrl={product.model3dUrl}
              fallbackModelUrl="/models/black_belt-transformed.glb"
            />
          </div>

          {/* Name / price / sizes */}
          <div className="relative z-10 px-5 pb-6 pt-2 bg-gradient-to-t from-black/70 to-transparent">
            <h1 className="font-heading text-h3 font-bold text-white">
              {product.name}
            </h1>
            <p className="font-heading text-h3 font-bold text-white mt-1">
              {formattedPrice}
            </p>
            <div className="mt-4">
              <SizeSelector
                sizes={product.sizes}
                selectedSize={selectedSize}
                onSelect={setSelectedSize}
              />
            </div>
          </div>
        </div>

        {/* Accordion below card */}
        <div className="mt-4 px-4">
          <ProductInfoAccordion
            description={product.description}
            howToMeasure={product.howToMeasure}
            careInstructions={product.careInstructions}
            itemClassName="bg-[#141414] backdrop-blur-none"
          />
        </div>
      </div>

      {/* Fixed CTA — mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-3">
        <button
          onClick={handleAddToCart}
          className="group inline-flex w-full items-center justify-center gap-4 text-btn font-heading font-bold tracking-[0.05em] uppercase rounded-full bg-coral text-black py-5"
        >
          Додати в кошик
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      <section className="hidden lg:block relative h-screen w-full overflow-hidden bg-black">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <Image
            src={product.bgImage || "/assets/img/product_bg.png"}
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* 3D Product model */}
        <ModelLoader
          modelUrl={product.model3dUrl}
          fallbackModelUrl="/models/black_belt-transformed.glb"
        />

        {/* Bottom content overlay */}
        <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
          <div className="pt-32 pb-12">
            <div className="container-main">
              <div className="flex flex-row items-end justify-between gap-8">
                {/* Left: Name, price, sizes */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex flex-col gap-4 pointer-events-auto"
                >
                  <h1 className="font-heading text-h2 font-bold text-white tracking-normal">
                    {product.name}
                  </h1>
                  <p className="font-heading text-h2 font-bold text-white tracking-normal">
                    {formattedPrice}
                  </p>
                  <SizeSelector
                    sizes={product.sizes}
                    selectedSize={selectedSize}
                    onSelect={setSelectedSize}
                  />
                </motion.div>

                {/* Right: Accordion + Add to cart */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex flex-col gap-4 w-[420px] pointer-events-auto"
                >
                  <ProductInfoAccordion
                    description={product.description}
                    howToMeasure={product.howToMeasure}
                    careInstructions={product.careInstructions}
                  />
                  <button
                    onClick={handleAddToCart}
                    className="group inline-flex w-full items-center justify-center gap-4 text-btn font-heading font-bold tracking-[0.05em] uppercase rounded-full transition-all duration-300 bg-coral text-black hover:brightness-110 px-12 py-5"
                  >
                    Додати в кошик
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                    >
                      <path
                        d="M6.65078 18.825L4.42578 16.6L13.4508 7.57499H5.67578V4.42499H18.8258V17.575H15.6758V9.79999L6.65078 18.825Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
