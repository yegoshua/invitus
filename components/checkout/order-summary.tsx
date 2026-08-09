"use client";

import { ProductMedia } from "@/components/ui/product-media";
import { CTAButton } from "@/components/ui/cta-button";
import { formatPrice } from "@/lib/format";
import { useCartItems, useCartTotal } from "@/hooks/use-cart";
import { useAppliedPromo, usePromoStatus } from "@/hooks/use-promo";
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
  const { code: promoCode, discount } = useAppliedPromo();
  const promoStatus = usePromoStatus();

  // Delivery is paid to Nova Poshta on collection, so "Тарифи оператора" is the
  // whole delivery line and the total is the goods, less any promo.
  const total = subtotal - discount;

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
                  {item.size && (
                    <p className="text-[15px] text-white/78">
                      Розмір: {item.sizeLabel ?? item.size}
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
          <div className="flex justify-between items-baseline mt-2 text-base leading-6 font-medium tracking-[0.01em] text-coral">
            <span className="truncate pr-4">Промокод {promoCode}</span>
            <span className="font-medium whitespace-nowrap">
              −{formatPrice(discount)} ₴
            </span>
          </div>
        )}
        <div className="flex justify-between items-baseline mt-2 text-base leading-6 font-medium tracking-[0.01em] text-white">
          <span>Доставка</span>
          <span className="font-medium">Тарифи оператора</span>
        </div>
        <div className="flex justify-between items-baseline mt-4">
          <span className="font-heading font-bold text-base leading-6 tracking-[0.05em] uppercase text-white">
            ДО ОПЛАТИ:
          </span>
          <span className="font-heading font-bold text-base leading-6 tracking-[0.05em] uppercase text-white">
            {formatPrice(total)} ₴
          </span>
        </div>
      </div>

      {/* Held while a code is being checked: a customer who applies a code and
          hits pay in the same second would otherwise place the order before the
          discount lands, and be charged full price for a code that was good. */}
      <CTAButton
        type="submit"
        width="fill"
        disabled={submitting || items.length === 0 || promoStatus === "checking"}
      >
        До оплати
      </CTAButton>
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
            {first.sizeLabel ?? first.size}
            {more > 0 ? ` · та ще ${more} ${more === 1 ? "товар" : "товари"}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
