// Monobank acquiring webhook.
//
// This — not the customer coming back to /payment-result — is what makes a
// payment count. Someone who pays and immediately closes the tab, loses signal
// or gets stuck in their banking app still ends up with a paid order in KeyCRM.
//
// Monobank retries until it gets a 2xx, so anything we cannot act on must still
// answer 200; only a failed signature check or a genuine server-side failure
// gets a non-2xx.

import { NextResponse } from "next/server";
import { verifyWebhookSignature, type InvoiceStatusValue } from "@/lib/monobank";
import { markKeyCrmOrderPaid } from "@/lib/orders";

interface WebhookPayload {
  invoiceId: string;
  status: InvoiceStatusValue;
  amount?: number;
  reference?: string;
  failureReason?: string;
  paymentInfo?: { maskedPan?: string; paymentSystem?: string };
}

export async function POST(req: Request) {
  // Raw text, not req.json(): the signature covers the exact bytes sent.
  const rawBody = await req.text();
  const signature = req.headers.get("x-sign");

  if (!signature) {
    console.warn("[Monobank webhook] missing X-Sign header");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  if (!(await verifyWebhookSignature(rawBody, signature))) {
    console.warn("[Monobank webhook] signature rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    // Signed by Monobank but unparseable — retrying will not help.
    return NextResponse.json({ ok: true, ignored: "unparseable body" });
  }

  // Intermediate states are normal and carry no work.
  if (payload.status !== "success") {
    console.log(
      `[Monobank webhook] invoice ${payload.invoiceId} → ${payload.status}` +
        (payload.failureReason ? ` (${payload.failureReason})` : "")
    );
    return NextResponse.json({ ok: true });
  }

  // /api/orders sets reference to the KeyCRM order id.
  const orderId = Number(payload.reference);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    console.error(
      `[Monobank webhook] paid invoice ${payload.invoiceId} has no usable reference (${payload.reference}) — mark it by hand`
    );
    // 200 on purpose: retries cannot fix a missing reference, and this needs a
    // human, not a redelivery loop.
    return NextResponse.json({ ok: true, ignored: "no order reference" });
  }

  try {
    const card = payload.paymentInfo?.maskedPan
      ? ` ${payload.paymentInfo.maskedPan}`
      : "";
    await markKeyCrmOrderPaid(
      orderId,
      `Monobank${card} · invoice ${payload.invoiceId}`
    );
    console.log(`[Monobank webhook] order ${orderId} marked paid`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Monobank webhook] order ${orderId} update failed:`, msg);
    // 500 so Monobank redelivers — the money arrived, the CRM just missed it.
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
