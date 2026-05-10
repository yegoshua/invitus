"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useAddToCart, useOpenCart } from "@/hooks/use-cart";
import { formatPriceWithCurrency } from "@/lib/format";
import type { Product } from "@/types";
import { SizeSelector } from "./size-selector";
import { ProductInfoAccordion } from "./product-info-accordion";
import { ModelLoader } from "@/components/models/model-loader";
import { ProductMedia } from "@/components/ui/product-media";
import ArrowOutForwardIcon from "@/public/assets/icons/arrow-outforward-icon.svg";

interface ProductPageContentProps {
  product: Product;
}

const PRODUCT_BG_FALLBACK = "/assets/img/product_bg.png";
const MODEL_FALLBACK = "/models/black_belt-transformed.glb";

export function ProductPageContent({ product }: ProductPageContentProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(product.sizes?.[0] ?? null);
  const addItem = useAddToCart();
  const openCart = useOpenCart();

  const formattedPrice = formatPriceWithCurrency(product.price);

  const handleAddToCart = () => {
    addItem(product, selectedSize ?? undefined);
    openCart();
  };

  return (
    <>
      {/* ===== MOBILE LAYOUT ===== */}
      <div className="lg:hidden bg-black pb-4 md:pb-28">
        {/* Hero Card */}
        <div className="relative mx-2 mt-16 rounded-[28px]">
          {/* Background image */}
          <div className="absolute inset-0 rounded-[28px] overflow-hidden">
            <ProductMedia
              image={product.bgImage}
              fallbackSrc={PRODUCT_BG_FALLBACK}
              alt=""
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* 3D Model area */}
          <div className="py-[60px] sm:py-0 rounded-t-[28px] overflow-hidden">
            <div className="relative h-[200px] sm:h-[340px] md:h-[420px]">
              <ModelLoader
                modelUrl={product.model3dUrl}
                fallbackModelUrl={MODEL_FALLBACK}
              />
            </div>
          </div>

          {/* Name / price / sizes */}
          <div className="relative z-10 pt-2 pb-6 bg-gradient-to-t from-black/70 to-transparent">
            <div className="px-5">
              <h1 className="font-heading text-h3 font-bold text-white">
                {product.name}
              </h1>
              <p className="font-heading text-h3 font-bold text-white mt-4">
                {formattedPrice}
              </p>
            </div>
            <div className="mt-6">
              <SizeSelector
                sizes={product.sizes}
                selectedSize={selectedSize}
                onSelect={setSelectedSize}
              />
            </div>
          </div>
        </div>

        {/* Accordion below card */}
        <div className="mt-4 px-2 md:px-4">
          <ProductInfoAccordion
            description={product.description}
            howToMeasure={product.howToMeasure}
            careInstructions={product.careInstructions}
            itemClassName="bg-[#141414] backdrop-blur-none"
          />
        </div>
      </div>

      {/* Fixed CTA — mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-3 bg-[#0000008A] backdrop-blur-sm">
        <button
          onClick={handleAddToCart}
          className="group inline-flex w-full items-center justify-center gap-4 text-btn font-heading font-bold tracking-[0.05em] uppercase rounded-3xl bg-coral text-black py-5"
        >
          Додати в кошик
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      <section className="hidden lg:block relative h-screen w-full overflow-hidden bg-black">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <ProductMedia
            image={product.bgImage}
            fallbackSrc={PRODUCT_BG_FALLBACK}
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* 3D Product model */}
        <ModelLoader
          modelUrl={product.model3dUrl}
          fallbackModelUrl={MODEL_FALLBACK}
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
                    <ArrowOutForwardIcon className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
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
