// Is this promo code good, and what is it worth against this cart?
//
// The checkout asks on mount and whenever the customer applies a code, so the
// discount on screen is always one the server has just agreed to. It is not the
// authority on anything: /api/orders re-checks the same code through the same
// function when the order is actually placed. This endpoint exists so the
// customer learns "expired" while they can still do something about it, rather
// than at the moment they press pay.
//
// The cart is priced from KeyCRM here too. Taking a subtotal from the browser
// would let anyone clear a `minOrderTotal` by claiming a bigger basket.

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPromoCode } from "@/lib/promo-codes";
import { PROMO_MESSAGES } from "@/lib/promo";
import { OrderPricingError, priceItems } from "@/lib/orders";

const promoRequestSchema = z.object({
  code: z.string().trim().min(1).max(64),
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

export async function POST(req: Request) {
  let parsed: z.infer<typeof promoRequestSchema>;
  try {
    parsed = promoRequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Некоректний запит" }, { status: 400 });
  }

  let subtotal: number;
  try {
    const lines = await priceItems(parsed.items);
    subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  } catch (err) {
    if (err instanceof OrderPricingError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[promo] could not price the cart:", msg);
    return NextResponse.json(
      { error: PROMO_MESSAGES.unavailable },
      { status: 502 }
    );
  }

  const evaluation = await checkPromoCode(parsed.code, subtotal);

  // A refused code is a complete, correct answer to the question asked — 200
  // with a reason, not an HTTP error. The client renders `message` verbatim.
  return NextResponse.json(
    evaluation.ok
      ? {
          ok: true,
          code: evaluation.code,
          discount: evaluation.discount,
          subtotal,
          total: evaluation.total,
        }
      : { ok: false, reason: evaluation.reason, message: evaluation.message }
  );
}
