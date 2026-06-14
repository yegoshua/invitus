"use client";

import { useState } from "react";
import Link from "next/link";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import Clarity from "@microsoft/clarity";
import { useCartItems, useCartTotal } from "@/hooks/use-cart";
import {
  checkoutDefaults,
  checkoutSchema,
  type CheckoutFormData,
} from "@/lib/checkout-schema";
import { CheckoutFormSection } from "./checkout-form-section";
import { CustomerInfoFields } from "./customer-info-fields";
import { DeliveryFields } from "./delivery-fields";
import { PaymentMethodRadio } from "./payment-method-radio";
import { NovaPoshtaIcon } from "./nova-poshta-icon";
import {
  OrderSummary,
  OrderSummaryMobileTop,
  SHIPPING_COST,
} from "./order-summary";
import { CheckoutSuccess } from "./checkout-success";

type SubmittedOrder = React.ComponentProps<typeof CheckoutSuccess>["order"] & {
  items: Array<{
    productId: string;
    name: string;
    size: string | null;
    quantity: number;
    price: number;
  }>;
  totals: { subtotal: number; shipping: number; total: number };
  createdAt: string;
};

export function CheckoutPage() {
  const items = useCartItems();
  const subtotal = useCartTotal();
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(
    null
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const methods = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: checkoutDefaults,
    shouldFocusError: true,
    mode: "onTouched",
  });

  if (submittedOrder) {
    return <CheckoutSuccess order={submittedOrder} />;
  }

  if (items.length === 0) {
    return <EmptyCart />;
  }

  const onSubmit = async (data: CheckoutFormData) => {
    setPaymentError(null);

    // PII: upgrade Clarity identity from anon UUID to customer email so post-payment
    // sessions are grouped with checkout sessions in the dashboard.
    if (data.email && typeof window !== "undefined" && (window as { clarity?: unknown }).clarity) {
      Clarity.identify(data.email, undefined, undefined, data.fullName);
    }

    const reference = `invitus-${Date.now()}`;
    const totalCopecks = Math.round((subtotal + SHIPPING_COST) * 100);
    const order: SubmittedOrder = {
      customer: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email && data.email.length > 0 ? data.email : null,
      },
      delivery: {
        city: { name: data.cityName },
        branch: { name: data.branchName },
      },
      paymentMethod: data.paymentMethod,
      items: items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        size: i.size ?? null,
        quantity: i.quantity,
        price: i.product.price,
      })),
      totals: {
        subtotal,
        shipping: SHIPPING_COST,
        total: subtotal + SHIPPING_COST,
      },
      createdAt: new Date().toISOString(),
    };

    if (data.paymentMethod === "online") {
      console.log("[INVITUS checkout] Initiating Monobank payment:", {
        reference,
        order,
      });
      try {
        const res = await fetch("/api/monobank/create-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: totalCopecks,
            reference,
            destination: `Замовлення INVITUS (${items.length} ${
              items.length === 1 ? "товар" : "товари"
            })`,
            email: data.email || undefined,
            basketOrder: items.map((i) => ({
              name: i.product.name + (i.size ? ` (${i.size})` : ""),
              qty: i.quantity,
              sum: Math.round(i.product.price * 100), // unit price in copecks
            })),
          }),
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const { pageUrl } = (await res.json()) as { pageUrl: string };
        window.location.href = pageUrl;
        // Block the rest of the handler — page is leaving the SPA.
        await new Promise(() => {});
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[INVITUS checkout] Monobank failed:", msg);
        setPaymentError(
          "Не вдалося ініціювати оплату. Спробуй ще раз або обери оплату при отриманні."
        );
      }
      return;
    }

    // COD path — no external payment, show success directly.
    console.log("[INVITUS checkout] Order submitted (COD):", order);
    setSubmittedOrder(order);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} noValidate>
        <OrderSummaryMobileTop />

        <main className="container-main pt-8 pb-8 lg:pt-32 lg:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_500px] gap-6 lg:gap-10 items-start">
            <div className="flex flex-col gap-6 lg:gap-8">
              <CheckoutFormSection title="Твої дані">
                <CustomerInfoFields />
              </CheckoutFormSection>
              <CheckoutFormSection
                title="Доставка"
                headerSlot={<NovaPoshtaIcon className="shrink-0" />}
              >
                <DeliveryFields />
              </CheckoutFormSection>
              <CheckoutFormSection title="Оплата">
                <PaymentMethodRadio />
                {paymentError && (
                  <p
                    role="alert"
                    className="mt-4 text-sm text-[var(--color-error)]"
                  >
                    {paymentError}
                  </p>
                )}
              </CheckoutFormSection>
            </div>

            <div className="hidden lg:block lg:sticky lg:top-32">
              <OrderSummary
                variant="desktop"
                submitting={methods.formState.isSubmitting}
              />
            </div>
          </div>

          <div className="lg:hidden mt-6">
            <OrderSummary
              variant="mobile-bottom"
              submitting={methods.formState.isSubmitting}
            />
          </div>
        </main>
      </form>
    </FormProvider>
  );
}

function EmptyCart() {
  return (
    <main className="container-main pt-32 lg:pt-40 pb-20 min-h-screen flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-surface rounded-[var(--radius-checkout-card)] p-8 sm:p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <ShoppingBag
            className="w-8 h-8 text-white/60"
            strokeWidth={1.6}
          />
        </div>
        <h1 className="font-heading text-h3 text-white mb-3">
          Кошик порожній
        </h1>
        <p className="text-white/78 text-base mb-8">
          Додай товари в кошик, щоб оформити замовлення.
        </p>
        <Link
          href="/shop/belts"
          className="group inline-flex items-center justify-center gap-3 w-full h-14 rounded-[40px] bg-coral text-black font-heading font-bold tracking-[0.05em] uppercase text-base transition-[filter] duration-150 hover:brightness-110"
        >
          У каталог
          <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
        </Link>
      </div>
    </main>
  );
}
