"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingBag } from "lucide-react";
import Clarity from "@microsoft/clarity";
import { useCartItems, useCartTotal } from "@/hooks/use-cart";
import { gaItems, trackEvent } from "@/lib/gtag";
import { TrackOnce } from "@/components/analytics/track-once";
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
import { CTAButton } from "@/components/ui/cta-button";
import { OrderSummary, OrderSummaryMobileTop } from "./order-summary";
import { CheckoutSuccess } from "./checkout-success";

type SubmittedOrder = React.ComponentProps<typeof CheckoutSuccess>["order"] & {
  items: Array<{
    productId: string;
    name: string;
    size: string | null;
    quantity: number;
    price: number;
  }>;
  totals: { subtotal: number; total: number };
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
      totals: { subtotal, total: subtotal },
      createdAt: new Date().toISOString(),
    };

    // The server prices the order and records it in KeyCRM. Only *what* was
    // ordered goes over the wire — no amounts, so nothing here can decide what
    // the customer is charged.
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            fullName: data.fullName,
            phone: data.phone,
            email: data.email || null,
          },
          delivery: {
            cityRef: data.cityRef,
            cityName: data.cityName,
            branchRef: data.branchRef,
            branchName: data.branchName,
          },
          paymentMethod: data.paymentMethod,
          items: items.map((i) => ({
            productId: Number(i.product.id),
            size: i.size ?? null,
            quantity: i.quantity,
          })),
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        orderId?: number;
        pageUrl?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(payload.error || `HTTP ${res.status}`);
      }

      if (data.paymentMethod === "online") {
        if (!payload.pageUrl) throw new Error("Немає посилання на оплату");
        window.location.href = payload.pageUrl;
        // Block the rest of the handler — page is leaving the SPA.
        await new Promise(() => {});
        return;
      }

      // COD — the order is placed here, so this is the conversion. Online
      // purchases fire on /payment-result instead.
      trackEvent("purchase", {
        transaction_id: String(payload.orderId),
        value: order.totals.total,
        items: gaItems(items),
      });
      setSubmittedOrder(order);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[INVITUS checkout] order failed:", msg);
      setPaymentError(
        msg ||
          "Не вдалося оформити замовлення. Спробуй ще раз або обери оплату при отриманні."
      );
    }
  };

  return (
    <FormProvider {...methods}>
      {/* This branch only renders with a non-empty cart, so mounting it IS
          the begin_checkout moment. */}
      <TrackOnce
        event="begin_checkout"
        params={{ value: subtotal, items: gaItems(items) }}
      />
      <form onSubmit={methods.handleSubmit(onSubmit)} noValidate>
        <OrderSummaryMobileTop />

        <main className="container-main [--container-px:0.5rem] lg:[--container-px:2rem] pt-8 pb-8 lg:pt-32 lg:pb-32">
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
        <CTAButton href="/shop/belts" width="fill">
          У каталог
        </CTAButton>
      </div>
    </main>
  );
}
