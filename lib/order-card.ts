// An order notification rebuilt from the order as KeyCRM holds it now.
//
// The first message about an order is rendered from what the checkout priced.
// Every rewrite after it — the payment landing, a button pressed, a waybill
// made — is rendered from KeyCRM instead, so the message says what the CRM
// says rather than what we remember having said. Both go through the one
// formatter, formatNewOrder, so they cannot drift into two layouts.
//
// Also here: the small state we keep *on* the order (which Telegram messages
// describe it, and who did what), stored in a KeyCRM custom field because the
// site has no database of its own and the order is where it belongs anyway.
//
// Pure, with relative imports and no `@/` alias, so node:test runs it directly.

import type { NewOrderNotification, OrderLogEntry, OrderMessageRef } from "./order-notifications.ts";

/** The subset of GET /order/:id?include=buyer,products,shipping,payments,custom_fields we read. */
export interface KeyCrmOrderForCard {
  id: number;
  status_id?: number | null;
  grand_total?: number | string | null;
  products_total?: number | string | null;
  discount_amount?: number | string | null;
  promocode?: string | null;
  buyer?: { full_name?: string | null; phone?: string | null; email?: string | null } | null;
  shipping?: {
    tracking_code?: string | null;
    recipient_full_name?: string | null;
    recipient_phone?: string | null;
    shipping_address_city?: string | null;
    shipping_receive_point?: string | null;
    address_payload?: {
      city_ref?: string | null;
      city_desc?: string | null;
      warehouse_ref?: string | null;
      warehouse_desc?: string | null;
    } | null;
  } | null;
  products?: Array<{
    name?: string | null;
    price?: number | string | null;
    quantity?: number | string | null;
    properties?: Array<{ name?: string | null; value?: string | null }> | null;
  }> | null;
  payments?: Array<{
    status?: string | null;
    payment_method_id?: number | null;
    description?: string | null;
  }> | null;
  custom_fields?: Array<{ uuid?: string | null; value?: unknown }> | null;
}

export interface PaymentMethodIds {
  online?: number | null;
  parts?: number | null;
  cod?: number | null;
}

const num = (value: unknown): number => {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
};

/** The start of PARTS_PAYMENT_TAG in lib/orders.ts, which this module cannot import. */
const PARTS_TAG = "Покупка частинами";

function paymentMethodOf(
  payment: NonNullable<KeyCrmOrderForCard["payments"]>[number] | undefined,
  ids: PaymentMethodIds
): NewOrderNotification["paymentMethod"] {
  const id = payment?.payment_method_id ?? null;
  if (id !== null && id === ids.parts) return "parts";
  if (id !== null && id === ids.online) return "online";
  if (id !== null && id === ids.cod) return "cod";
  // An id we were not told about: the description the checkout wrote is the
  // next best witness, and cash on delivery is the safe reading of silence —
  // it is the one that never claims money is on its way.
  const description = payment?.description ?? "";
  if (description.includes(PARTS_TAG)) return "parts";
  if (/monobank/i.test(description)) return "online";
  return "cod";
}

/** "430860******46" out of «Monobank 430860******46 · invoice …», shortened to "*46". */
export function maskedCardOf(description: string | null | undefined): string | null {
  const match = description?.match(/\d{4,6}\*+(\d{2,4})/);
  return match ? `*${match[1]}` : null;
}

export function notificationFromKeyCrmOrder(
  order: KeyCrmOrderForCard,
  ids: PaymentMethodIds
): NewOrderNotification {
  const payment = order.payments?.[0];
  const paymentMethod = paymentMethodOf(payment, ids);
  const subtotal = num(order.products_total);
  const discount = num(order.discount_amount);
  const shipping = order.shipping ?? {};

  return {
    orderId: order.id,
    customer: {
      fullName: order.buyer?.full_name ?? shipping.recipient_full_name ?? "",
      phone: order.buyer?.phone ?? shipping.recipient_phone ?? "",
      email: order.buyer?.email ?? "",
    },
    delivery: {
      cityName: shipping.shipping_address_city ?? shipping.address_payload?.city_desc ?? "",
      branchName:
        shipping.shipping_receive_point ?? shipping.address_payload?.warehouse_desc ?? "",
    },
    paymentMethod,
    parts:
      paymentMethod === "parts"
        ? Number(payment?.description?.match(/(\d+)\s*платеж/)?.[1]) || null
        : null,
    lines: (order.products ?? []).map((p) => {
      const quantity = num(p.quantity);
      return {
        name: p.name ?? "",
        size: p.properties?.[0]?.value ?? null,
        quantity,
        lineTotal: num(p.price) * quantity,
      };
    }),
    subtotal,
    discount,
    total: num(order.grand_total),
    promoCode: order.promocode ?? null,
    paid:
      payment?.status === "paid" ? { card: maskedCardOf(payment.description) } : null,
    waybill: shipping.tracking_code?.trim() || null,
  };
}

// --- The state kept on the order --------------------------------------------

export interface OrderMessageState {
  messages: OrderMessageRef[];
  log: OrderLogEntry[];
}

/** A custom field is a text box; a long history is not what it is for. */
const MAX_LOG = 12;

export function emptyState(): OrderMessageState {
  return { messages: [], log: [] };
}

/**
 * Compact on purpose — it sits in a text field a manager can see. Numbers for
 * the chat and message, 1/0 for the buttons, and [who, did] pairs.
 */
export function encodeState(state: OrderMessageState): string {
  return JSON.stringify({
    m: state.messages.map((m) => [m.chatId, m.messageId, m.buttons ? 1 : 0]),
    l: state.log.slice(-MAX_LOG).map((e) => [e.who, e.did]),
  });
}

/**
 * Anything unreadable is an empty state, never an error: someone typing into
 * the field in the CRM must cost the rewrite its history, not the order its
 * notification.
 */
export function decodeState(value: unknown): OrderMessageState {
  if (typeof value !== "string" || !value.trim()) return emptyState();
  try {
    const raw = JSON.parse(value) as { m?: unknown; l?: unknown };
    const messages = Array.isArray(raw.m)
      ? raw.m.flatMap((m) =>
          Array.isArray(m) && Number.isInteger(m[0]) && Number.isInteger(m[1])
            ? [{ chatId: m[0] as number, messageId: m[1] as number, buttons: m[2] === 1 }]
            : []
        )
      : [];
    const log = Array.isArray(raw.l)
      ? raw.l.flatMap((e) =>
          Array.isArray(e) && typeof e[0] === "string" && typeof e[1] === "string"
            ? [{ who: e[0], did: e[1] }]
            : []
        )
      : [];
    return { messages, log };
  } catch {
    return emptyState();
  }
}

export function stateOf(order: KeyCrmOrderForCard, fieldUuid: string): OrderMessageState {
  const field = order.custom_fields?.find((f) => f.uuid === fieldUuid);
  return decodeState(field?.value);
}
