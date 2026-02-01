"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useCartStore } from "@/stores/cart";
import type { ProductDetail } from "@/data/products";
import { SizeSelector } from "./size-selector";
import { ProductInfoAccordion } from "./product-info-accordion";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Float } from "@react-three/drei";
import {BlackBeltModel} from "@/components/models/Black_belt"

interface ProductPageContentProps {
  product: ProductDetail;
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
    <section className="relative h-screen w-full overflow-hidden bg-black">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={product.bgImage}
          alt=""
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* 3D Product model */}
      <div className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing">
        <Canvas id="canvas" camera={{ position: [0, 0.5, 3], fov: 45 }}>
          <ambientLight intensity={0.1} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <directionalLight position={[-3, 2, -2]} intensity={0.3} />
          <Environment preset="city" background={false} />
          <OrbitControls
            target={[0, 0, 0]}
            enablePan={false}
            enableZoom={false}
            autoRotate
            autoRotateSpeed={0.7}
            enableDamping
            dampingFactor={0.05}
          />
          <Float
            speed={1.5}
            rotationIntensity={0.2}
            floatIntensity={0.4}
            floatingRange={[-0.05, 0.05]}
          >
            <BlackBeltModel position={[0, 0, 0]} />
          </Float>
          <ContactShadows
            position={[0, -1, 0]}
            opacity={0.4}
            scale={5}
            blur={2.5}
            far={4}
          />
        </Canvas>
      </div>

      {/* Bottom content overlay */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-32 pb-8 lg:pb-12">
          <div className="container-main">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              {/* Left: Name, price, sizes */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col gap-4"
              >
                <h1 className="font-heading text-[40px] leading-[52px] font-bold text-white tracking-normal">
                  {product.name}
                </h1>
                <p className="font-heading text-[40px] leading-[52px] font-bold text-white tracking-normal">
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
                className="flex flex-col gap-4 lg:w-[420px]"
              >
                <ProductInfoAccordion
                  description={product.description}
                  howToMeasure={product.howToMeasure}
                  careInstructions={product.careInstructions}
                />
                <button
                  onClick={handleAddToCart}
                  className="group inline-flex w-full items-center justify-center gap-4 text-btn font-heading font-bold tracking-[0.05em] uppercase rounded-full transition-all duration-300 bg-coral text-black hover:brightness-110 px-8 lg:px-12 py-5"
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
  );
}
