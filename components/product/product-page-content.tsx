"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { gaItem, trackEvent } from "@/lib/gtag";
import { useAddToCart, useOpenCart } from "@/hooks/use-cart";
import { formatPriceWithCurrency } from "@/lib/format";
import type { Product, ProductSize } from "@/types";
import { SizeSelector } from "./size-selector";
import { ProductInfoAccordion } from "./product-info-accordion";
import { ModelLoader } from "@/components/models/model-loader";
import { ProductMedia } from "@/components/ui/product-media";
import { CTAButton } from "@/components/ui/cta-button";

interface ProductPageContentProps {
  product: Product;
}

const PRODUCT_BG_FALLBACK = "/assets/img/product_bg.png";

export function ProductPageContent({ product }: ProductPageContentProps) {
  // The whole size is held, not just its value: the cart needs the label to
  // show what the product page showed, and the order needs the KeyCRM value.
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(
    product.sizes?.[0] ?? null
  );
  const addItem = useAddToCart();
  const openCart = useOpenCart();

  const formattedPrice = formatPriceWithCurrency(product.price);

  // GA4: one view_item per product opened.
  useEffect(() => {
    trackEvent("view_item", {
      value: product.price,
      items: [gaItem(product)],
    });
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only ever show the 3D viewer when this product actually has a model.
  //
  // This used to be `|| product.category === "belts"`, which forced the viewer
  // on for every belt and let ModelLoader fall back to a bundled .glb. That
  // bundled model is the Akatsuki belt (despite its "black_belt" filename), so
  // any belt without a model of its own rendered as a *different product*:
  // permanently for the one belt Strapi has no model for, and for every belt
  // whenever Strapi was unreachable while the page was generated — ISR then
  // cached that render, so the next first-time visitor was served it.
  //
  // Without a model we now show the product's own photo instead: a Strapi
  // outage degrades to "real photo, no 3D" rather than "wrong belt".
  const show3dModel = Boolean(product.model3dUrl);

  const handleAddToCart = () => {
    addItem(product, selectedSize?.value, selectedSize?.label);
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

          {/* Hero media: 3D model (belts) or product photo */}
          <div className="py-[60px] sm:py-0 rounded-t-[28px] overflow-hidden">
            <div className="relative h-[200px] sm:h-[340px] md:h-[420px]">
              {show3dModel ? (
                <ModelLoader
                  modelUrl={product.model3dUrl}
                />
              ) : (
                <ProductMedia
                  image={product.heroImage}
                  alt={product.name}
                  fill
                  className="object-contain"
                  priority
                />
              )}
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
                selectedSize={selectedSize?.value ?? null}
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
        <CTAButton
          width="fill"
          onClick={handleAddToCart}
          icon={<Plus className="w-5 h-5" />}
        >
          Додати в кошик
        </CTAButton>
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="hidden lg:block bg-black lg:p-4">
      <section className="relative h-[calc(100svh-32px)] w-full overflow-hidden bg-black rounded-[48px]">
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

        {/* Hero media: 3D model (belts) or product photo */}
        {show3dModel ? (
          <ModelLoader
            modelUrl={product.model3dUrl}
          />
        ) : (
          <div className="absolute inset-0 z-10 flex items-center justify-center pb-40">
            <div className="relative w-full max-w-[520px] aspect-square">
              <ProductMedia
                image={product.heroImage}
                alt={product.name}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        )}

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
                  className="flex flex-col pointer-events-auto"
                >
                  <h1 className="font-heading text-h2 font-bold text-white tracking-normal">
                    {product.name}
                  </h1>
                  <p className="font-heading text-h2 font-bold text-white tracking-normal mt-4 lg:mt-6">
                    {formattedPrice}
                  </p>
                  <SizeSelector
                    sizes={product.sizes}
                    selectedSize={selectedSize?.value ?? null}
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
                  <CTAButton width="fill" onClick={handleAddToCart}>
                    Додати в кошик
                  </CTAButton>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
