// KeyCRM automation webhook → Telegram.
//
// KeyCRM's trigger automations can only *send* webhooks, and only for three
// events: order status change, payment status change, pipeline-card status
// change. There is deliberately no "order created" here — KeyCRM has no such
// trigger, and we do not need one: /api/orders creates the order itself and
// notifies from there, instantly and with the full basket.
//
// Configure in KeyCRM → Налаштування → Автоматизація → новий тригер:
//   Подія:  «Зміна статусу замовлення» / «Зміна статусу оплати»
//   Дія:    «Відправити Webhook»
//   URL:    https://invitus.com.ua/api/keycrm/webhook?token=<TELEGRAM_WEBHOOK_SECRET>
//   Метод:  POST
//
// The secret rides in the query string because KeyCRM sends no custom headers —
// it cannot do the Authorization bearer that /api/revalidate uses. That is
// weaker (URLs reach access logs), so the secret guards nothing but the sending
// of a chat message: this endpoint reads no data and writes nothing. Rotate it
// by changing the env var and the trigger URL together.

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatKeyCrmStatusChange } from "@/lib/order-notifications";

const HANDLED_EVENTS = new Set([
  "order.change_order_status",
  "order.change_payment_status",
]);

function matchesSecret(provided: string, expected: string): boolean {
  // Digests, not raw strings: timingSafeEqual throws on a length mismatch and
  // comparing lengths first would leak the secret's length.
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** KeyCRM sends { event, context } — context is the order, shape unpinned. */
interface KeyCrmWebhookPayload {
  event?: string;
  context?: Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

/**
 * Pull what we print out of the context, tolerating a shape we have not seen.
 *
 * KeyCRM's webhook payload is not versioned or documented field-by-field, so
 * every read here has an alternative and a null fallback: a renamed field must
 * cost a line of the message, never the whole notification.
 */
function readContext(context: Record<string, unknown> | undefined) {
  const ctx = context ?? {};
  const status = ctx.status as Record<string, unknown> | undefined;
  const buyer = ctx.buyer as Record<string, unknown> | undefined;

  return {
    orderId: asNumber(ctx.id),
    status:
      asString(status?.name) ??
      asString(ctx.status_name) ??
      asString(ctx.payment_status) ??
      asString(ctx.status),
    total: asNumber(ctx.grand_total) ?? asNumber(ctx.total_price),
    buyerName: asString(buyer?.full_name) ?? asString(ctx.buyer_full_name),
  };
}

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[keycrm webhook] TELEGRAM_WEBHOOK_SECRET is not set — refusing");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!matchesSecret(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req
    .json()
    .catch(() => null)) as KeyCrmWebhookPayload | null;

  if (!payload?.event) {
    return NextResponse.json({ ok: true, ignored: "no event" });
  }

  if (!HANDLED_EVENTS.has(payload.event)) {
    // lead.change_lead_status and anything KeyCRM adds later. 200 so the
    // trigger is not reported as failing in the CRM.
    console.log(`[keycrm webhook] ignoring event ${payload.event}`);
    return NextResponse.json({ ok: true, ignored: payload.event });
  }

  const sent = await sendTelegramMessage(
    formatKeyCrmStatusChange({ event: payload.event, ...readContext(payload.context) })
  );

  // 200 either way: a failed Telegram send is logged in sendTelegramMessage and
  // is not something a KeyCRM retry can fix — the status already changed.
  return NextResponse.json({ ok: true, sent });
}
