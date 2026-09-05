"use client";

import { useEffect, useState } from "react";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { gaItem, trackEvent } from "@/lib/gtag";
import { useAddToCart, useOpenCart } from "@/hooks/use-cart";
import { formatPriceWithCurrency } from "@/lib/format";
import type { Product, ProductSize } from "@/types";
import { SizeSelector } from "./size-selector";
import { ProductInfoAccordion } from "./product-info-accordion";
import { productDetailItems, sizeGuideItem } from "./product-info-items";
import { DispatchBadge } from "./dispatch-badge";
import { ModelViewer } from "@/components/models/model-viewer";
import { ProductMedia } from "@/components/ui/product-media";
import { CTAButton } from "@/components/ui/cta-button";

interface ProductPageContentProps {
  product: Product;
}

const PRODUCT_BG_FALLBACK = "/assets/img/product_bg.png";

export function ProductPageContent({ product }: ProductPageContentProps) {
  // The whole size is held, not just its value: the cart needs the label to
  // show what the product page showed, and the order needs the KeyCRM value.
  //
  // The pre-selection skips whatever KeyCRM has none of: landing on a sold-out
  // first size would put a size nobody can buy under the cursor and leave the
  // button dead on arrival, which reads as the page being broken.
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(
    product.sizes?.find((s) => s.inStock) ?? null
  );
  // Sold out only when the product has sizes and none of them is left; a
  // product with no offers at all is not a stock question and stays buyable.
  const soldOut = Boolean(product.sizes?.length) && !selectedSize;
  // Set when the canvas has lost its WebGL context past recovering. The page
  // then shows the product photo instead of an empty box.
  const [modelUnavailable, setModelUnavailable] = useState(false);
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
  const show3dModel = Boolean(product.model3dUrl) && !modelUnavailable;

  // Both layouts are in the tree at once — Tailwind hides one, it does not skip
  // it — so an unguarded viewer mounts twice and the hidden copy quietly holds a
  // second WebGL context and a second copy of the model. Only the layout that is
  // actually on screen gets one, and neither gets one before hydration: mounting
  // the wrong one for a frame and tearing it straight down is what makes r3f
  // fire its deferred `forceContextLoss()` into the surviving canvas.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const isHydrated = useIsHydrated();
  const mobile3d = show3dModel && isHydrated && !isDesktop;
  const desktop3d = show3dModel && isHydrated && isDesktop;

  // Desktop keeps the size guide in the hero and pushes the rest under the
  // photos (ProductDetailsSection); mobile stacks everything under the card.
  // The mobile design also puts the design story last, after care, while the
  // desktop rows go description → story → care, so the order is not shared.
  const sizeGuide = sizeGuideItem(product);
  const details = productDetailItems(product);
  const mobileInfoItems = [
    ...(sizeGuide ? [sizeGuide] : []),
    ...details.filter((item) => item.id !== "story"),
    ...details.filter((item) => item.id === "story"),
  ];

  const handleAddToCart = () => {
    if (soldOut) return;
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
              {mobile3d ? (
                <ModelViewer
                  modelUrl={product.model3dUrl}
                  onGaveUp={() => setModelUnavailable(true)}
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
              {!soldOut && <DispatchBadge className="mb-3" />}
              <h1 className="font-heading text-h2 font-bold text-white tracking-[0.01em]">
                {product.name}
              </h1>
              <p className="font-heading text-h2 font-bold text-white tracking-[0.01em] mt-4">
                {formattedPrice}
              </p>
            </div>
            {/* No wrapper: an empty one would leave its own gap behind on a
                product whose selector renders nothing. The selector carries the
                spacing itself. */}
            <SizeSelector
              sizes={product.sizes}
              selectedSize={selectedSize?.value ?? null}
              onSelect={setSelectedSize}
            />
          </div>
        </div>

        {/* Accordion below card */}
        <div className="mt-4 px-2 md:px-4">
          <ProductInfoAccordion
            items={mobileInfoItems}
            itemClassName="bg-surface backdrop-blur-none"
          />
        </div>
      </div>

      {/* Fixed CTA — mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-3 bg-[#0000008A] backdrop-blur-sm">
        <CTAButton
          width="fill"
          onClick={handleAddToCart}
          disabled={soldOut}
          icon={soldOut ? null : <Plus className="w-5 h-5" />}
        >
          {soldOut ? "Немає в наявності" : "Додати в кошик"}
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
        {desktop3d ? (
          <ModelViewer
            modelUrl={product.model3dUrl}
            onGaveUp={() => setModelUnavailable(true)}
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
                  {!soldOut && <DispatchBadge className="mb-2" />}
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
                  {sizeGuide && <ProductInfoAccordion items={[sizeGuide]} />}
                  <CTAButton
                    width="fill"
                    onClick={handleAddToCart}
                    disabled={soldOut}
                    icon={soldOut ? null : undefined}
                  >
                    {soldOut ? "Немає в наявності" : "Додати в кошик"}
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
