"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Trash2, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cart";

function ArrowRightUpIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6.65078 18.825L4.42578 16.6L13.4508 7.57499H5.67578V4.42499H18.8258V17.575H15.6758V9.79999L6.65078 18.825Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getTotal = useCartStore((state) => state.getTotal);
  const getItemCount = useCartStore((state) => state.getItemCount);

  const itemCount = getItemCount();
  const total = getTotal();

  const formattedTotal = new Intl.NumberFormat("uk-UA", {
    style: "decimal",
    minimumFractionDigits: 0,
  }).format(total);

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
            className="fixed right-4 top-4 bottom-4 z-[70] w-[calc(100%-32px)] sm:w-[calc(50%-32px)] bg-white rounded-3xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 lg:p-8">
              <h2 className="font-heading text-2xl lg:text-3xl font-bold text-black">
                Кошик ({itemCount})
              </h2>
              <button
                onClick={closeCart}
                className="p-2 text-black hover:text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8">
              {itemCount === 0 ? (
                <EmptyState onClose={closeCart} />
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
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="group flex w-full items-center justify-center gap-4 text-btn font-heading font-bold tracking-[0.05em] uppercase rounded-full transition-all duration-300 bg-coral text-black hover:brightness-110 py-5"
                  >
                    Перейти до оплати
                    <ArrowRightUpIcon className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </Link>
                </>
              ) : (
                <Link
                  href="/shop"
                  onClick={closeCart}
                  className="group flex w-full items-center justify-center gap-4 text-btn font-heading font-bold tracking-[0.05em] uppercase rounded-full transition-all duration-300 bg-coral text-black hover:brightness-110 py-5"
                >
                  Знайти свій пояс
                  <ArrowRightUpIcon className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </Link>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="relative w-48 h-48 mb-8">
        <Image
          src="/assets/img/cart-empry-state.png"
          alt="Порожній кошик"
          fill
          className="object-contain"
        />
      </div>
      <p className="font-heading text-xl lg:text-2xl font-bold text-black leading-tight">
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
  items: ReturnType<typeof useCartStore.getState>["items"];
  removeItem: (id: string, size?: string) => void;
  updateQuantity: (id: string, quantity: number, size?: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {items.map((item) => {
        const formattedPrice = new Intl.NumberFormat("uk-UA", {
          style: "decimal",
          minimumFractionDigits: 0,
        }).format(item.price * item.quantity);

        return (
          <div key={`${item.id}-${item.size}`} className="flex gap-4">
            {/* Thumbnail */}
            <div className="relative w-24 h-30 bg-[#212121] rounded-[12px] overflow-hidden shrink-0">
              {item.images[0] ? (
                <Image
                  src={item.images[0].url}
                  alt={item.images[0].alt}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-heading text-xs text-neutral-600">
                    INVITUS
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-black text-xl leading-6 font-medium tracking-[0.01em]">
                  {item.name}
                </h3>
                <p className="text-black text-xl leading-6 font-medium tracking-[0.01em]">
                  {formattedPrice} ₴
                </p>
              </div>
              <div className="flex items-center justify-between">
                {item.size && (
                  <span className="text-black text-xl leading-6 font-medium tracking-[0.01em]">
                    Розмір: {item.size}
                  </span>
                )}
                <div className="flex items-center gap-3 ml-auto">
                  {item.quantity === 1 ? (
                    <button
                      onClick={() => removeItem(item.id, item.size)}
                      className="text-black hover:text-neutral-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          item.quantity - 1,
                          item.size
                        )
                      }
                      className="text-black hover:text-neutral-500 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                  <span className="text-black text-base font-medium w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.quantity + 1, item.size)
                    }
                    className="text-black hover:text-neutral-500 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
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
