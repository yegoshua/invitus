"use client";

import { useEffect } from "react";
import Image from "next/image";
import { CTAButton } from "@/components/ui/cta-button";
import { Minus } from "lucide-react";
import BinIcon from "@/public/assets/icons/bin-icon.svg";
import CloseIcon from "@/public/assets/icons/Close.svg";
import PlusIcon from "@/public/assets/icons/plus-icon.svg";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCartCount,
  useCartIsOpen,
  useCartItems,
  useCartTotal,
  useCloseCart,
  useRemoveFromCart,
  useUpdateCartQuantity,
} from "@/hooks/use-cart";
import { ProductMedia } from "@/components/ui/product-media";
import { formatPrice } from "@/lib/format";
import type { CartItem } from "@/types";

export function CartDrawer() {
  const isOpen = useCartIsOpen();
  const closeCart = useCloseCart();
  const items = useCartItems();
  const removeItem = useRemoveFromCart();
  const updateQuantity = useUpdateCartQuantity();
  const itemCount = useCartCount();
  const total = useCartTotal();

  const formattedTotal = formatPrice(total);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-[#0000007A] backdrop-blur-[24px]"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "105%" }}
            animate={{ x: 0 }}
            exit={{ x: "105%" }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-2 top-2 bottom-2 z-[70] w-[calc(100%-16px)] rounded-section lg:right-4 lg:top-4 lg:bottom-4 lg:w-[calc(50%-32px)] bg-white flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 lg:p-8">
              <h2 className="font-heading text-h3 font-bold text-black">
                Кошик ({itemCount})
              </h2>
              <button
                onClick={closeCart}
                className="p-2 text-black hover:text-neutral-600 transition-colors cursor-pointer"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8">
              {itemCount === 0 ? (
                <EmptyState />
              ) : (
                <CartItems
                  items={items}
                  removeItem={removeItem}
                  updateQuantity={updateQuantity}
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-6 lg:p-8">
              {itemCount > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-heading text-base font-bold text-black uppercase tracking-[0.05em]">
                      До оплати:
                    </span>
                    <span className="font-heading text-base font-bold text-black">
                      {formattedTotal} ₴
                    </span>
                  </div>
                  <CTAButton href="/checkout" width="fill" onClick={closeCart}>
                    До оплати
                  </CTAButton>
                </>
              ) : (
                <CTAButton href="/shop/belts" width="fill" onClick={closeCart}>
                  Знайти пояс
                </CTAButton>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="relative w-[320px] h-80">
        <Image
          src="/assets/img/cart-empry-state.png"
          alt="Порожній кошик"
          fill
          className="object-contain"
        />
      </div>
      <p className="font-heading text-h4 font-bold text-black leading-tight">
        Кошик поки порожній,
        <br />
        виправимо це?
      </p>
    </div>
  );
}

function CartItems({
  items,
  removeItem,
  updateQuantity,
}: {
  items: CartItem[];
  removeItem: (id: string, size?: string) => void;
  updateQuantity: (id: string, quantity: number, size?: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {items.map((item) => {
        const { product, quantity, size, sizeLabel } = item;
        const formattedPrice = formatPrice(product.price * quantity);

        return (
          <div key={`${product.id}-${size}`} className="flex gap-4">
            {/* Thumbnail */}
            <div className="relative w-24 h-30 bg-[#EBEBEB] rounded-[12px] overflow-hidden shrink-0">
              <ProductMedia
                image={product.mainImage}
                fill
                className="object-cover"
                fallbackBrandTextClassName="text-xs text-neutral-600"
              />
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-black text-xl leading-6 font-medium tracking-[0.01em]">
                  {product.name}
                </h3>
                <p className="text-black text-xl leading-6 font-medium tracking-[0.01em] mt-2">
                  {formattedPrice} ₴
                </p>
              </div>
              <div className="flex items-center justify-between">
                {size && (
                  <span className="text-black text-xl leading-6 font-medium tracking-[0.01em]">
                    <span className="hidden lg:inline">Розмір: </span>
                    {sizeLabel ?? size}
                  </span>
                )}
                <div className="flex items-center gap-3 ml-auto">
                  {quantity === 1 ? (
                    <button
                      onClick={() => removeItem(product.id, size)}
                      className="text-black hover:text-neutral-500 transition-colors cursor-pointer"
                    >
                      <BinIcon className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        updateQuantity(product.id, quantity - 1, size)
                      }
                      className="text-black hover:text-neutral-500 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                  <span className="text-black text-base font-medium w-4 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(product.id, quantity + 1, size)
                    }
                    className="text-black hover:text-neutral-500 transition-colors cursor-pointer"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
