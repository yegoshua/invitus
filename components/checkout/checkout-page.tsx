"use client";

import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingBag } from "lucide-react";
import Clarity from "@microsoft/clarity";
import { useCartItems, useCartTotal } from "@/hooks/use-cart";
import { useAppliedPromo, useRejectPromo } from "@/hooks/use-promo";
import {
  usePartsPreference,
  usePaymentMethodPreference,
  useSetPartsPreference,
  useSetPaymentMethodPreference,
} from "@/hooks/use-payment-preference";
import { partsAvailable, promoDiscountFor } from "@/lib/installments";
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
import { PromoCodeField } from "./promo-code-field";
import { CheckoutSuccess } from "./checkout-success";

type SubmittedOrder = React.ComponentProps<typeof CheckoutSuccess>["order"] & {
  items: Array<{
    productId: string;
    name: string;
    size: string | null;
    quantity: number;
    price: number;
  }>;
  totals: { subtotal: number; discount: number; total: number };
  createdAt: string;
};

export function CheckoutPage() {
  const items = useCartItems();
  const subtotal = useCartTotal();
  // Only a code the server has just confirmed; a code mid-re-check reports as
  // none, so the submit can never carry a total the customer has not been shown.
  const { code: appliedCode, discount } = useAppliedPromo();
  const rejectPromo = useRejectPromo();
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(
    null
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // The choice made on the product page («Від 513 ₴ / міс») or on a previous
  // visit opens the checkout pre-selected, provided this cart still qualifies;
  // a cart that does not gets the default rather than a refused method.
  const preferredMethod = usePaymentMethodPreference();
  const preferredParts = usePartsPreference();
  const setPreferredMethod = useSetPaymentMethodPreference();
  const setPreferredParts = useSetPartsPreference();

  const methods = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: checkoutDefaults,
    shouldFocusError: true,
    mode: "onTouched",
  });

  // Seeded after hydration, not in defaultValues: through the hydration render
  // a persisted store reports its *server* snapshot (the defaults), so reading
  // it there gave the form «online» for a customer who had just pressed
  // «Від 513 ₴ / міс» — and the write-back below then saved that over their
  // choice. Once, after hydration, is when the store's value is real.
  const hydrated = useIsHydrated();
  const seeded = useRef(false);
  useEffect(() => {
    if (!hydrated || seeded.current) return;
    seeded.current = true;
    methods.setValue(
      "paymentMethod",
      preferredMethod === "parts" && !partsAvailable(subtotal)
        ? "online"
        : preferredMethod
    );
    methods.setValue("parts", preferredParts);
  }, [hydrated, methods, preferredMethod, preferredParts, subtotal]);

  // A code does not combine with instalments (promoDiscountFor): while they are
  // picked the field is hidden and the code is neither counted nor sent. It is
  // kept, not cleared, so switching back to another method brings it back.
  const paymentMethod = useWatch({ control: methods.control, name: "paymentMethod" });
  const inParts = paymentMethod === "parts";

  // And the other way: what is picked here is what the cart drawer shows next
  // time it opens, so the two never describe two different ways of paying. A
  // subscription rather than a watched value in an effect, because it fires on
  // changes only — never on the initial render, which is the defaults.
  useEffect(() => {
    const subscription = methods.watch((values, { name }) => {
      if (name === "paymentMethod" && values.paymentMethod) {
        setPreferredMethod(values.paymentMethod);
      }
      if (name === "parts" && values.parts) setPreferredParts(values.parts);
    });
    return () => subscription.unsubscribe();
  }, [methods, setPreferredMethod, setPreferredParts]);

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
    if (typeof window !== "undefined" && (window as { clarity?: unknown }).clarity) {
      Clarity.identify(data.email, undefined, undefined, data.fullName);
    }

    // Built once: the success screen and the request body were drifting apart
    // one edit at a time.
    const customer = {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
    };

    const order: SubmittedOrder = {
      customer,
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
        discount: promoDiscountFor(data.paymentMethod, discount),
        total: subtotal - promoDiscountFor(data.paymentMethod, discount),
      },
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
          customer,
          delivery: {
            cityRef: data.cityRef,
            cityName: data.cityName,
            branchRef: data.branchRef,
            branchName: data.branchName,
          },
          paymentMethod: data.paymentMethod,
          parts: data.paymentMethod === "parts" ? data.parts : null,
          promoCode: data.paymentMethod === "parts" ? null : appliedCode,
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
        partsOrderId?: string;
        total?: number;
        discount?: number;
        error?: string;
        promoRejected?: boolean;
      };

      if (!res.ok) {
        // The code stopped working between the screen and the submit. Take it
        // off — so the summary re-renders at the price actually on offer — and
        // put the server's reason where the code used to be, rather than only
        // in the banner by the pay button. The customer then decides whether to
        // place the order at that price.
        if (payload.promoRejected && payload.error) rejectPromo(payload.error);
        throw new Error(payload.error || `HTTP ${res.status}`);
      }

      // The server priced it; its figures are the ones that were charged.
      if (typeof payload.total === "number") {
        order.totals = {
          subtotal,
          discount: payload.discount ?? 0,
          total: payload.total,
        };
      }

      // An online order whose total a promo took to zero has nothing to pay, so
      // there is no invoice to redirect to — it completes here like a
      // cash-on-delivery one. Keyed on the server's total, not on the missing
      // pageUrl, so a genuinely absent link is still an error rather than a
      // success screen over an unpaid order.
      if (data.paymentMethod === "online" && payload.total !== 0) {
        if (!payload.pageUrl) throw new Error("Немає посилання на оплату");
        window.location.href = payload.pageUrl;
        // Block the rest of the handler — page is leaving the SPA.
        await new Promise(() => {});
        return;
      }

      // Instalments: the bank has pushed the customer's phone; the result page
      // waits for the answer. The purchase event fires there, on approval —
      // not here, where nothing has been agreed to yet.
      if (data.paymentMethod === "parts" && payload.total !== 0) {
        if (!payload.partsOrderId) throw new Error("Немає номера заявки monobank");
        // The order number and the server's total travel along for the
        // purchase event only; the outcome itself is always read from the bank.
        const params = new URLSearchParams({
          order: payload.partsOrderId,
          ref: String(payload.orderId ?? ""),
          total: String(payload.total ?? ""),
        });
        window.location.href = `/payment-result/parts?${params}`;
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
              {!inParts && (
                <CheckoutFormSection title="Промокод">
                  <PromoCodeField />
                </CheckoutFormSection>
              )}
              <CheckoutFormSection title="Оплата">
                <PaymentMethodRadio />
                {/* Said, not silently dropped: a customer who applied a code
                    would otherwise watch the discount vanish from the total. */}
                {inParts && appliedCode && (
                  <p className="mt-4 text-xs/4 tracking-[0.02em] lg:text-sm/5 lg:tracking-[0.01em] text-white/64">
                    Промокод {appliedCode} не діє разом з оплатою частинами.
                  </p>
                )}
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
