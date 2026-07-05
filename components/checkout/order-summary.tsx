"use client";

import { ArrowUpRight } from "lucide-react";
import { ProductMedia } from "@/components/ui/product-media";
import { formatPrice } from "@/lib/format";
import { useCartItems, useCartTotal } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

export const SHIPPING_COST = 120; // TODO: replace with real Nova Poshta rate API

interface OrderSummaryProps {
  variant?: "desktop" | "mobile-bottom";
  submitting?: boolean;
}

/**
 * Full body of the order summary: line items + totals + CTA.
 * Used by the desktop sticky sidebar AND the mobile bottom block.
 * The compact mobile-top block has its own component.
 */
export function OrderSummary({
  variant = "desktop",
  submitting = false,
}: OrderSummaryProps) {
  const items = useCartItems();
  const subtotal = useCartTotal();
  const total = subtotal + SHIPPING_COST;

  const isDesktop = variant === "desktop";

  return (
    <aside
      className={cn(
        isDesktop && "flex flex-col gap-6",
        !isDesktop && "flex flex-col gap-5"
      )}
    >
      {isDesktop && (
        <ul className="flex flex-col gap-5">
          {items.map((item) => (
            <li
              key={`${item.product.id}-${item.size ?? "_"}`}
              className="flex gap-5 items-start"
            >
              <div className="relative w-[108px] h-[132px] rounded-[18px] overflow-hidden bg-[var(--color-checkout-field)] shrink-0">
                <ProductMedia
                  image={item.product.mainImage}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-[22px] leading-tight text-white">
                  {item.product.name}
                </h3>
                <p className="mt-2 text-[22px] font-semibold text-white">
                  {formatPrice(item.product.price * item.quantity)} ₴
                </p>
                <div className="mt-4 space-y-1">
                  {item.size && (
                    <p className="text-[15px] text-white/78">
                      Розмір: {item.size}
                    </p>
                  )}
                  {item.quantity > 1 && (
                    <p className="text-[15px] text-white/78">
                      Кількість: {item.quantity}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={cn("flex flex-col gap-3", isDesktop && "mt-6")}>
        <div className="flex justify-between items-baseline text-[17px] text-white/78">
          <span>Замовлення</span>
          <span className="text-white font-medium">
            {formatPrice(subtotal)} ₴
          </span>
        </div>
        <div className="flex justify-between items-baseline text-[17px] text-white/78">
          <span>Доставка</span>
          <span className="text-white font-medium">
            від {SHIPPING_COST} ₴
          </span>
        </div>
        <div className="flex justify-between items-baseline mt-3">
          <span className="font-heading text-xl text-white">ДО ОПЛАТИ:</span>
          <span className="font-heading text-2xl text-white">
            {formatPrice(total)} ₴
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || items.length === 0}
        className={cn(
          "group mt-4 inline-flex w-full items-center justify-center gap-4",
          "font-heading font-bold tracking-[0.05em] uppercase",
          "bg-coral text-black rounded-[40px]",
          "h-[68px] lg:h-[84px] text-[18px] lg:text-[22px]",
          "transition-[filter,transform] duration-150",
          "hover:brightness-110 active:translate-y-px",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100"
        )}
      >
        До оплати
        <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
      </button>
    </aside>
  );
}

/**
 * Compact mobile-top product summary (matches design mockup).
 * Shows only the first item's media + name + price + size.
 */
export function OrderSummaryMobileTop() {
  const items = useCartItems();
  if (items.length === 0) return null;

  const first = items[0];
  const more = items.length - 1;

  return (
    <div className="lg:hidden mt-20 sm:mt-24 pl-6 pr-4 flex gap-4 items-start">
      <div className="relative w-20 h-25 rounded-2xl overflow-hidden bg-[var(--color-checkout-field)] shrink-0">
        <ProductMedia
          image={first.product.mainImage}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-sans font-medium text-base/5 text-white">
          {first.product.name}
        </h3>
        <p className="mt-2 font-sans font-medium text-base/6 text-white">
          {formatPrice(first.product.price * first.quantity)} ₴
        </p>
        {first.size && (
          <p className="mt-4 font-sans font-medium text-base/6 text-white/50">
            {first.size}
            {more > 0 ? ` · та ще ${more} ${more === 1 ? "товар" : "товари"}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
