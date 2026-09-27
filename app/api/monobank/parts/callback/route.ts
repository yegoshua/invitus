// Monobank «Покупка частинами» callback.
//
// Monobank calls this twice at most per order: once when the customer approves
// in the app (IN_PROCESS / WAITING_FOR_STORE_CONFIRM) and once if anything
// fails (FAIL / *). Nothing in between — a customer still deciding is polled
// for by the result page, not pushed here.
//
// Approval is what marks the KeyCRM payment paid. The money itself arrives
// only after the plan is *confirmed* (/api/order/confirm), which the shop does
// from the «ТТН створено» button — Monobank's rule is confirm on handover, and
// for a parcel shop the handover is the dispatch. Marking paid now is what
// tells the manager to go and pack it.
//
// Which order? The payload carries only Monobank's uuid. Our order number is in
// the callback URL (`?order=`, set when the order was created), and it is
// trusted only once the uuid recorded on that order's payment row matches the
// uuid in the signed body — the signature covers the body, not the URL, so a
// replayed body under a different `?order=` must not mark a second order paid.
// When the order carries no uuid (the KeyCRM write failed at creation) the
// fallback is Monobank's own /api/order/data, which echoes `store_order_id`.

import { NextResponse } from "next/server";
import {
  getPartsOrderData,
  verifyPartsSignature,
} from "@/lib/monobank-parts";
import { partsFailureMessage, partsOutcome } from "@/lib/installments";
import {
  markKeyCrmOrderPaid,
  PARTS_PAYMENT_TAG,
  partsOrderIdOf,
} from "@/lib/orders";
import { notifyPartsRefused } from "@/lib/order-notifications";
import { reportFailure } from "@/lib/alerts";

interface CallbackPayload {
  order_id?: string;
  state?: string;
  order_sub_state?: string;
  message?: string;
}

/**
 * The KeyCRM order this callback is about, or null when it cannot be
 * established. Never throws — the caller turns null into an alert.
 */
async function resolveOrderId(
  hinted: string | null,
  partsOrderId: string
): Promise<number | null> {
  const hintedId = Number(hinted);
  if (Number.isInteger(hintedId) && hintedId > 0) {
    try {
      const recorded = await partsOrderIdOf(hintedId);
      if (recorded && recorded.toLowerCase() === partsOrderId.toLowerCase()) {
        return hintedId;
      }
      if (recorded) {
        console.warn(
          `[parts callback] order ${hintedId} is recorded against ${recorded}, not ${partsOrderId} — ignoring the hint`
        );
      }
    } catch (err) {
      console.error(
        `[parts callback] could not read order ${hintedId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  try {
    const data = await getPartsOrderData(partsOrderId);
    const fromBank = Number(data.store_order_id);
    if (Number.isInteger(fromBank) && fromBank > 0) return fromBank;
  } catch (err) {
    console.error(
      `[parts callback] /api/order/data failed for ${partsOrderId}:`,
      err instanceof Error ? err.message : err
    );
  }
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.MONOBANK_PARTS_STORE_SECRET;
  if (!secret) {
    console.error("[parts callback] MONOBANK_PARTS_STORE_SECRET is not set — refusing");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Raw text, not req.json(): the signature covers the exact bytes sent.
  const rawBody = await req.text();
  if (!verifyPartsSignature(rawBody, req.headers.get("signature"), secret)) {
    console.warn("[parts callback] signature rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: CallbackPayload;
  try {
    payload = JSON.parse(rawBody) as CallbackPayload;
  } catch {
    return NextResponse.json({ ok: true, ignored: "unparseable body" });
  }

  const partsOrderId = payload.order_id;
  if (!partsOrderId) {
    return NextResponse.json({ ok: true, ignored: "no order_id" });
  }

  const outcome = partsOutcome(payload.state, payload.order_sub_state);
  console.log(
    `[parts callback] ${partsOrderId} → ${payload.state}/${payload.order_sub_state} (${outcome})`
  );

  if (outcome === "pending") return NextResponse.json({ ok: true });

  const orderId = await resolveOrderId(
    new URL(req.url).searchParams.get("order"),
    partsOrderId
  );

  if (orderId === null) {
    await reportFailure({
      scope: "parts.reference",
      title:
        outcome === "approved"
          ? "Клієнт підтвердив покупку частинами, але замовлення не визначено"
          : "monobank відхилив покупку частинами для невідомого замовлення",
      context: {
        "Заявка mono": partsOrderId,
        Стан: `${payload.state}/${payload.order_sub_state}`,
      },
      action: "Знайди замовлення за id заявки в описі платежу в KeyCRM і познач вручну.",
      severity: outcome === "approved" ? "critical" : "error",
    });
    // 500 so Monobank redelivers: a KeyCRM read is the thing most likely to
    // have been a blip, and a retry that succeeds needs no human.
    return NextResponse.json({ error: "Order lookup failed" }, { status: 500 });
  }

  if (outcome === "failed") {
    const reason = partsFailureMessage(payload.order_sub_state);
    // The order stays in KeyCRM, unpaid — the same as an abandoned invoice.
    // The group is told why, so it is not chased as a lost sale.
    await notifyPartsRefused(orderId, reason, payload.order_sub_state ?? null);
    return NextResponse.json({ ok: true });
  }

  try {
    // Appended: the row already reads «Покупка частинами monobank · 6 платежів
    // · <uuid>» from creation. Only when the creation-time write failed and
    // the row carries nothing does the full tag go in.
    const recorded = await partsOrderIdOf(orderId).catch(() => null);
    await markKeyCrmOrderPaid(
      orderId,
      recorded
        ? "підтверджено в застосунку"
        : `${PARTS_PAYMENT_TAG} · ${partsOrderId} · підтверджено в застосунку`,
      { append: Boolean(recorded) }
    );
    console.log(`[parts callback] order ${orderId} marked paid`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[parts callback] order ${orderId} update failed:`, msg);
    await reportFailure({
      scope: "parts.markPaid",
      title: "Покупку частинами підтверджено, а KeyCRM не оновився",
      detail: msg,
      context: { Замовлення: orderId, "Заявка mono": partsOrderId },
      action:
        "Monobank повторить спробу. Якщо за 10 хв статус не зміниться — познач оплату вручну.",
      severity: "critical",
    });
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
