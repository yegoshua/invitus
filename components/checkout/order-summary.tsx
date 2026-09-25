"use client";

import { ProductMedia } from "@/components/ui/product-media";
import { CTAButton } from "@/components/ui/cta-button";
import { formatPrice } from "@/lib/format";
import { cartSizeLabel } from "@/lib/size-display";
import { useCartItems, useCartTotal } from "@/hooks/use-cart";
import { useAppliedPromo, usePromoStatus } from "@/hooks/use-promo";
import { useFormContext, useWatch } from "react-hook-form";
import type { CheckoutFormData } from "@/lib/checkout-schema";
import {
  partsAvailable,
  promoDiscountFor,
  partsSchedule,
  remainingLabel,
} from "@/lib/installments";
import { cn } from "@/lib/utils";

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
  // Only a discount the server has confirmed for this exact cart is ever shown;
  // while a re-check is in flight this reports nothing applied, so nobody reads
  // a total the invoice is about to disagree with.
  const applied = useAppliedPromo();
  const promoStatus = usePromoStatus();
  const { control } = useFormContext<CheckoutFormData>();
  const method = useWatch({ control, name: "paymentMethod" });
  const parts = useWatch({ control, name: "parts" });
  // A code does not combine with instalments, so on them it shows no line.
  const discount = promoDiscountFor(method, applied.discount);

  // Delivery is paid to Nova Poshta on collection, so "Тарифи оператора" is the
  // whole delivery line and the total is the goods, less any promo.
  const total = subtotal - discount;

  // Instalments split the same total; nothing else changes. The schedule is
  // the same arithmetic the chips and the cart drawer use, so the figure here
  // is the figure the customer picked one section up.
  const schedule =
    method === "parts" && partsAvailable(total) ? partsSchedule(total, parts) : null;

  const isDesktop = variant === "desktop";

  return (
    <aside
      className={cn( "flex flex-col gap-6",
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
                  {cartSizeLabel(item) && (
                    <p className="text-[15px] text-white/78">
                      Розмір: {cartSizeLabel(item)}
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

      <div className={cn("flex flex-col", isDesktop && "mt-6")}>
        <div className="flex justify-between items-baseline text-base leading-6 font-medium tracking-[0.01em] text-white">
          <span>Замовлення</span>
          <span className="font-medium">
            {formatPrice(subtotal)} ₴
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between items-baseline mt-2 text-base leading-6 font-medium tracking-[0.01em] text-white">
            <span>Промокод</span>
            <span className="font-medium whitespace-nowrap">
              -{formatPrice(discount)} ₴
            </span>
          </div>
        )}
        <div className="flex justify-between items-baseline mt-2 text-base leading-6 font-medium tracking-[0.01em] text-white">
          <span>Доставка</span>
          <span className="font-medium">Тарифи оператора</span>
        </div>
        {schedule && (
          <div className="flex justify-between items-baseline mt-2 text-base leading-6 font-medium tracking-[0.01em] text-white">
            <span>Оплата</span>
            <span className="font-medium">Частинами • {schedule.parts} платежів</span>
          </div>
        )}
        <div className="flex justify-between items-baseline mt-4">
          <span className="font-heading font-bold text-base leading-6 tracking-[0.05em] uppercase text-white">
            {schedule ? "До оплати зараз:" : "До оплати:"}
          </span>
          <span className="font-heading font-bold text-base leading-6 tracking-[0.05em] uppercase text-white">
            {formatPrice(schedule ? schedule.monthly : total)} ₴
          </span>
        </div>
        {schedule && (
          <div className="flex justify-between items-baseline mt-2 text-base leading-6 font-medium tracking-[0.01em] text-white/64">
            <span>Далі щомісяця</span>
            <span>{remainingLabel(schedule)}</span>
          </div>
        )}
      </div>

      {/* Held while a code is being checked: a customer who applies a code and
          hits pay in the same second would otherwise place the order before the
          discount lands, and be charged full price for a code that was good. */}
      <CTAButton
        type="submit"
        width="fill"
        disabled={
          submitting ||
          items.length === 0 ||
          (method !== "parts" && promoStatus === "checking")
        }
      >
        До оплати
      </CTAButton>
    </aside>
  );
}

/**
 * Compact mobile-top product summary (matches design mockup).
 * Shows only the first item's media + name + price + size (when the product is
 * made in more than one — see lib/size-display.ts).
 */
export function OrderSummaryMobileTop() {
  const items = useCartItems();
  if (items.length === 0) return null;

  const first = items[0];
  const more = items.length - 1;
  // Null for a one-size product; the "and N more" tail still has to survive it.
  const firstSize = cartSizeLabel(first);

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
        {(firstSize || more > 0) && (
          <p className="mt-4 font-sans font-medium text-base/6 text-white/50">
            {[
              firstSize,
              more > 0
                ? `та ще ${more} ${more === 1 ? "товар" : "товари"}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
