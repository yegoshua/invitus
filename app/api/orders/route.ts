// Single entry point for placing an order.
//
// Replaces /api/monobank/create-invoice, which took the amount straight from
// the request body. Here the browser only says *what* was ordered; the server
// prices it against KeyCRM, records the order, and only then asks Monobank for
// an invoice for its own figure.

import { after, NextResponse } from "next/server";
import { z } from "zod";
import { createInvoice } from "@/lib/monobank";
import { createPartsOrder, isPartsConfigured } from "@/lib/monobank-parts";
import {
  isPartsCount,
  PARTS_MIN_TOTAL,
  partsAvailable,
  partsPhone,
  partsProducts,
} from "@/lib/installments";
import { formatPrice } from "@/lib/format";
import {
  attachPartsOrderId,
  createKeyCrmOrder,
  OrderPricingError,
  priceOrder,
  PromoRejectedError,
  type OrderDraft,
} from "@/lib/orders";
import { reportFailure } from "@/lib/alerts";
import { notifyNewOrder } from "@/lib/order-notifications";
import { SITE_URL } from "@/lib/site";

const orderRequestSchema = z.object({
  customer: z.object({
    fullName: z.string().trim().min(2).max(200),
    phone: z.string().trim().min(5).max(32),
    // Required, same as the checkout form (lib/checkout-schema.ts). The browser
    // is no more the authority on this than it is on prices.
    email: z.string().trim().min(1).email().max(320),
  }),
  delivery: z.object({
    cityRef: z.string().trim().min(1).max(64),
    cityName: z.string().trim().min(1).max(200),
    branchRef: z.string().trim().min(1).max(64),
    branchName: z.string().trim().min(1).max(500),
  }),
  paymentMethod: z.enum(["online", "parts", "cod"]),
  // Instalment count. Loose here (an integer) and checked against the offered
  // list below, so the refusal names the rule rather than being a bare 400.
  parts: z.number().int().nullish(),
  // Only the code travels. The discount it is worth is decided server-side in
  // lib/promo.ts, for the same reason prices are.
  promoCode: z.string().trim().max(64).nullish(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        size: z.string().trim().max(64).nullish(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(50),
});

/**
 * Base URL for Monobank's callbacks.
 *
 * Never derived from the request's Origin header: that is client-controlled, so
 * a forged value would point our payment webhook at somebody else's server.
 * Production always uses the canonical origin; only dev falls back to the
 * request so local runs are testable.
 */
function callbackBase(req: Request): string {
  // Vercel preview deploys also run with NODE_ENV=production, so keying off
  // that alone would send every preview's callbacks to the live site — and make
  // it impossible to test a payment anywhere but production. VERCEL_URL is set
  // by the platform, not the client, so it is safe to trust.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NODE_ENV === "production") return SITE_URL;
  return req.headers.get("origin") || "http://localhost:3000";
}

export async function POST(req: Request) {
  let parsed: OrderDraft;
  try {
    parsed = orderRequestSchema.parse(await req.json()) as OrderDraft;
  } catch {
    return NextResponse.json(
      { error: "Некоректні дані замовлення" },
      { status: 400 }
    );
  }

  // Instalments have two preconditions the browser cannot be trusted on: the
  // count must be one we offer, and the phone must be one a Monobank account
  // can sit behind. Both are cheap and are checked before any pricing so a
  // bad request costs nothing. The total floor is checked after pricing.
  const wantsParts = parsed.paymentMethod === "parts";
  const phoneForParts = wantsParts ? partsPhone(parsed.customer.phone) : null;
  if (wantsParts) {
    // The checkout never sends a code with instalments (promoDiscountFor); one
    // arriving anyway is a stale tab or a hand-made request, and pricing it
    // either way would charge a figure the customer was not shown.
    if (parsed.promoCode?.trim()) {
      return NextResponse.json(
        { error: "Промокод не діє разом з оплатою частинами. Обери інший спосіб оплати або прибери промокод." },
        { status: 409 }
      );
    }
    if (!isPartsConfigured()) {
      return NextResponse.json(
        { error: "Покупка частинами тимчасово недоступна. Обери інший спосіб оплати." },
        { status: 409 }
      );
    }
    if (!isPartsCount(parsed.parts)) {
      return NextResponse.json(
        { error: "Некоректна кількість платежів" },
        { status: 400 }
      );
    }
    if (!phoneForParts) {
      return NextResponse.json(
        { error: "Покупка частинами доступна лише для українського номера monobank." },
        { status: 409 }
      );
    }
  }

  // 1. Price it ourselves.
  let priced;
  try {
    priced = await priceOrder(parsed);
  } catch (err) {
    if (err instanceof OrderPricingError) {
      // `promoRejected` tells the checkout to take the code off and show why,
      // rather than leaving it applied next to a message explaining it isn't.
      return NextResponse.json(
        {
          error: err.message,
          ...(err instanceof PromoRejectedError ? { promoRejected: true } : {}),
        },
        { status: 409 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[orders] pricing failed:", msg);
    // The customer is looking at "не вдалося порахувати" right now. Nothing
    // was recorded, so this leaves no trace anywhere else.
    after(() =>
      reportFailure({
        scope: "orders.pricing",
        title: "Не вдалося порахувати замовлення",
        detail: msg,
        context: { Телефон: parsed.customer.phone },
        action: "Клієнт бачить помилку і піти оформити не може. Перевір KeyCRM.",
        severity: "critical",
      })
    );
    return NextResponse.json(
      { error: "Не вдалося порахувати замовлення" },
      { status: 502 }
    );
  }

  // The floor is on the charged total — a promo that takes a 4 200 ₴ cart to
  // 3 900 ₴ takes the option with it. The checkout hides the radio for the same
  // figure, so this only fires on a stale tab or a hand-made request.
  if (wantsParts && !partsAvailable(priced.total)) {
    return NextResponse.json(
      {
        error: `Покупка частинами доступна для замовлень від ${formatPrice(PARTS_MIN_TOTAL)} ₴. Обери інший спосіб оплати.`,
      },
      { status: 409 }
    );
  }

  // 2. Record it before taking any money, so a payment can never exist without
  //    an order to attach it to.
  let orderId: number;
  try {
    orderId = await createKeyCrmOrder(parsed, priced);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[orders] KeyCRM order creation failed:", msg, {
      phone: parsed.customer.phone,
      total: priced.total,
    });
    // A checkout that got all the way to the end and produced nothing. This is
    // a lost sale with a known phone number — someone can still call back.
    after(() =>
      reportFailure({
        scope: "orders.create",
        title: "Замовлення не створилось у KeyCRM",
        detail: msg,
        context: {
          Клієнт: parsed.customer.fullName,
          Телефон: parsed.customer.phone,
          Сума: priced.total,
        },
        action: "Втрачене замовлення — передзвони клієнту й оформи вручну.",
        severity: "critical",
      })
    );
    return NextResponse.json(
      { error: "Не вдалося оформити замовлення. Спробуй ще раз." },
      { status: 502 }
    );
  }

  // KeyCRM has no "order created" trigger, so the notification is ours to
  // send. after() rather than a floating promise: the customer is not made to
  // wait for Telegram, and the work is still guaranteed to run — a bare
  // `void notify()` can be cut off when the function instance is reclaimed
  // after the response, which is exactly when this fires.
  const notification = {
    orderId,
    customer: parsed.customer,
    delivery: parsed.delivery,
    paymentMethod: parsed.paymentMethod,
    parts: wantsParts ? parsed.parts : null,
    lines: priced.lines,
    subtotal: priced.subtotal,
    discount: priced.discount,
    total: priced.total,
    promoCode: priced.promoCode,
  };
  after(() => notifyNewOrder(notification));

  // Nothing left to charge — a promo covered the goods in full. Acquiring is
  // skipped rather than attempted: Monobank rejects an invoice for 0, and by
  // this point the order exists, so trying would leave a real order behind a
  // failure the customer can do nothing about. The order simply completes, the
  // way a cash-on-delivery one does, with its 0 UAH payment row for the manager
  // to see. (Only reachable if someone creates a `fixed` code worth at least
  // the whole cart, or a 100% one — issue #48 sanctions the arithmetic but did
  // not say what to do at the bottom of it.)
  if (parsed.paymentMethod === "cod" || priced.totalCopecks === 0) {
    return NextResponse.json({
      orderId,
      total: priced.total,
      discount: priced.discount,
    });
  }

  const base = callbackBase(req);

  // 3a. Instalments: ask Monobank to push the customer's app. There is no page
  //     to redirect to — the answer comes back on the callback below, and the
  //     browser polls /api/monobank/parts/status meanwhile.
  if (wantsParts && phoneForParts && isPartsCount(parsed.parts)) {
    try {
      const { orderId: partsOrderId } = await createPartsOrder({
        storeOrderId: String(orderId),
        clientPhone: phoneForParts,
        total: priced.total,
        parts: parsed.parts,
        // Lines that sum to `total` to the copeck — with a promo the catalogue
        // prices no longer do, and the bank has both figures to compare.
        products: partsProducts(priced.lines, priced.total),
        // The shop's day, not the server's: Vercel runs in UTC and an order
        // placed at 01:00 in Kyiv would carry yesterday's invoice date.
        invoiceDate: new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Kyiv",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()),
        // Our order number rides in the callback URL: Monobank's payload
        // carries only its own uuid, and its /api/order/data lookup is not
        // something to depend on (the sandbox answers 400 to it). The
        // callback cross-checks the uuid against the one recorded on the
        // order, so the query alone cannot mark somebody else's order paid.
        callbackUrl: `${base}/api/monobank/parts/callback?order=${orderId}`,
      });

      // Best effort: the buttons in Telegram need this id later, but a
      // customer who is already looking at their phone must not be failed
      // over a KeyCRM write that a manager can repeat by hand.
      try {
        await attachPartsOrderId(orderId, partsOrderId);
      } catch (err) {
        console.error(
          `[orders] could not record parts order ${partsOrderId} on order ${orderId}:`,
          err instanceof Error ? err.message : err
        );
      }

      const res = NextResponse.json({
        orderId,
        total: priced.total,
        discount: priced.discount,
        partsOrderId,
      });
      // Same trick as the invoice id: the result page can recover it after a
      // reload or a tab the customer closed while in the mono app.
      res.cookies.set("invitus_last_parts_order", partsOrderId, {
        maxAge: 60 * 60,
        path: "/",
        sameSite: "lax",
      });
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[orders] parts order failed for order ${orderId}:`, msg);
      after(() =>
        reportFailure({
          scope: "orders.parts",
          title: "Замовлення створено, але покупку частинами не вдалося запустити",
          detail: msg,
          context: {
            Замовлення: orderId,
            Клієнт: parsed.customer.fullName,
            Телефон: parsed.customer.phone,
            Сума: priced.total,
          },
          action: "Зв'яжись із клієнтом — запропонуй інший спосіб оплати або оформи ПЧ вручну.",
          severity: "critical",
        })
      );
      return NextResponse.json(
        {
          error:
            "Не вдалося запустити покупку частинами. Спробуй ще раз або обери інший спосіб оплати.",
          orderId,
        },
        { status: 502 }
      );
    }
  }

  // 3b. Online: invoice for the server's total, referencing the order.
  try {
    const invoice = await createInvoice({
      amount: priced.totalCopecks,
      reference: String(orderId),
      destination: `Замовлення №${orderId} — INVITUS`,
      // Monobank requires sum(basketOrder[].total) + basket discounts == amount.
      // The basket lists the goods at catalogue price, exactly as KeyCRM
      // records them, and a promo goes in `discounts` at basket level — never
      // as a negative line, which would put it on the fiscal receipt as goods.
      // Both figures come from orderTotals(), so they cannot drift apart.
      ...(priced.discountCopecks > 0
        ? {
            discounts: [
              {
                type: "DISCOUNT" as const,
                mode: "VALUE" as const,
                value: priced.discountCopecks,
              },
            ],
          }
        : {}),
      basketOrder: priced.lines.map((line) => ({
        name: line.size ? `${line.name} (${line.size})` : line.name,
        qty: line.quantity,
        sum: Math.round(line.unitPrice * 100),
        total: Math.round(line.lineTotal * 100),
        ...(line.sku ? { code: line.sku } : {}),
      })),
      // Always present now, and this is what it is for: Monobank sends the
      // receipt only to an invoice that carries an address.
      customerEmails: [parsed.customer.email],
      redirectUrl: `${base}/payment-result`,
      webHookUrl: `${base}/api/monobank/webhook`,
      validity: 60 * 60,
    });

    const res = NextResponse.json({
      orderId,
      total: priced.total,
      discount: priced.discount,
      pageUrl: invoice.pageUrl,
    });
    // Monobank calls redirectUrl with no query params — stash the invoice id so
    // /payment-result can recover it.
    res.cookies.set("invitus_last_invoice_id", invoice.invoiceId, {
      maxAge: 60 * 60,
      path: "/",
      sameSite: "lax",
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // The order already exists in KeyCRM and stays there, unpaid — better a
    // visible unpaid order than a silent lost sale.
    console.error(`[orders] invoice failed for order ${orderId}:`, msg);
    // The order is in KeyCRM and the customer cannot pay it. Left alone it
    // looks like an ordinary unpaid order and ages quietly.
    after(() =>
      reportFailure({
        scope: "orders.invoice",
        title: "Замовлення створено, але оплату не вдалося запустити",
        detail: msg,
        context: {
          Замовлення: orderId,
          Клієнт: parsed.customer.fullName,
          Телефон: parsed.customer.phone,
          Сума: priced.total,
        },
        action: "Надішли клієнту посилання на оплату вручну.",
        severity: "critical",
      })
    );
    return NextResponse.json(
      { error: "Не вдалося ініціювати оплату", orderId },
      { status: 502 }
    );
  }
}
