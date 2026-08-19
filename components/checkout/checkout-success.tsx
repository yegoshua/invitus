"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { CTAButton } from "@/components/ui/cta-button";
import { useClearCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";

interface CheckoutSuccessProps {
  order: {
    customer: { fullName: string; phone: string; email: string };
    delivery: {
      city: { name: string };
      branch: { name: string };
    };
    paymentMethod: "online" | "cod";
    totals: { total: number };
  };
}

export function CheckoutSuccess({ order }: CheckoutSuccessProps) {
  const clearCart = useClearCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <main className="container-main pt-28 lg:pt-40 pb-20 min-h-screen flex flex-col items-center justify-center">
      <div className="w-full max-w-xl bg-surface rounded-[var(--radius-checkout-card)] p-8 sm:p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-coral/15 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-9 h-9 text-coral" strokeWidth={1.6} />
        </div>
        <h1 className="font-heading text-h3 lg:text-h2 text-white mb-3">
          Дякуємо за замовлення!
        </h1>
        <p className="text-white/78 text-base lg:text-lg mb-8">
          Ми зв&apos;яжемося з тобою найближчим часом для підтвердження.
        </p>

        <div className="text-left space-y-3 mb-8 border-t border-white/10 pt-6">
          <Row label="Ім'я" value={order.customer.fullName} />
          <Row label="Телефон" value={order.customer.phone} />
          <Row label="Місто" value={order.delivery.city.name} />
          <Row label="Відділення" value={order.delivery.branch.name} />
          <Row
            label="Оплата"
            value={
              order.paymentMethod === "online"
                ? "Онлайн"
                : "Після отримання"
            }
          />
          <Row
            label="Сума"
            value={`${formatPrice(order.totals.total)} ₴`}
            emphasis
          />
        </div>

        <CTAButton href="/" width="fill">
          На головну
        </CTAButton>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline gap-4 text-base">
      <span className="text-white/50">{label}</span>
      <span
        className={
          emphasis
            ? "font-heading text-white text-lg"
            : "text-white font-medium text-right truncate max-w-[60%]"
        }
      >
        {value}
      </span>
    </div>
  );
}
