// Single entry point for placing an order.
//
// Replaces /api/monobank/create-invoice, which took the amount straight from
// the request body. Here the browser only says *what* was ordered; the server
// prices it against KeyCRM, records the order, and only then asks Monobank for
// an invoice for its own figure.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvoice } from "@/lib/monobank";
import {
  createKeyCrmOrder,
  OrderPricingError,
  priceOrder,
  PromoRejectedError,
  type OrderDraft,
} from "@/lib/orders";
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
  paymentMethod: z.enum(["online", "cod"]),
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
    return NextResponse.json(
      { error: "Не вдалося порахувати замовлення" },
      { status: 502 }
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
    return NextResponse.json(
      { error: "Не вдалося оформити замовлення. Спробуй ще раз." },
      { status: 502 }
    );
  }

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

  // 3. Online: invoice for the server's total, referencing the order.
  const base = callbackBase(req);
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
    return NextResponse.json(
      { error: "Не вдалося ініціювати оплату", orderId },
      { status: 502 }
    );
  }
}
