// What a Telegram notification says. Pure formatting plus thin senders.
//
// Split from lib/telegram.ts so the wording is testable without a bot token:
// the format* functions take plain data and return a string, and node:test
// runs this file directly — hence relative imports and no `@/` alias, the same
// rule lib/checkout-schema.ts follows.

import { formatPriceWithCurrency } from "./format.ts";
import {
  escapeHtml,
  sendTelegramMessage,
  type InlineKeyboard,
} from "./telegram.ts";
import { ORDER_ACTIONS, encodeCallback } from "./telegram-actions.ts";

export interface NotifiableLine {
  name: string;
  size?: string | null;
  quantity: number;
  lineTotal: number;
}

export interface NewOrderNotification {
  orderId: number;
  customer: { fullName: string; phone: string; email: string };
  delivery: { cityName: string; branchName: string };
  paymentMethod: "online" | "cod";
  lines: NotifiableLine[];
  subtotal: number;
  discount: number;
  total: number;
  promoCode?: string | null;
}

/**
 * A link into KeyCRM when KEYCRM_APP_URL is set, and nothing at all when it is
 * not — a guessed admin origin would render a broken link on every order.
 */
export function orderLink(orderId: number): string | null {
  const base = process.env.KEYCRM_APP_URL?.replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/app/orders/${orderId}`;
}

export function formatNewOrder(order: NewOrderNotification): string {
  // Method and status are two different facts and were being printed as one
  // string. A manager scanning the group needs "is the money in?" answerable
  // without parsing the rest of the line.
  const isOnline = order.paymentMethod === "online";
  const method = isOnline ? "Онлайн-оплата (Monobank)" : "Накладений платіж";
  // Always unpaid at this point: the order is recorded before Monobank is even
  // asked for an invoice, so nothing here can be "paid" yet. The change to
  // paid arrives later, from KeyCRM's payment-status trigger.
  const paymentStatus = isOnline
    ? "⏳ Не оплачено — очікує оплати"
    : "⏳ Не оплачено — оплата при отриманні";

  const lines = order.lines.map((line) => {
    const size = line.size ? ` (${escapeHtml(line.size)})` : "";
    return `• ${escapeHtml(line.name)}${size} × ${line.quantity} — ${formatPriceWithCurrency(
      line.lineTotal
    )}`;
  });

  const parts = [
    `🛒 <b>Нове замовлення №${order.orderId}</b>`,
    "",
    // Labelled rather than bare: an unlabelled line of text under a heading
    // reads as a subtitle, which is how the payment method went unnoticed on
    // the first live message.
    `👤 <b>${escapeHtml(order.customer.fullName)}</b>`,
    `📞 ${escapeHtml(order.customer.phone)}`,
    `✉️ ${escapeHtml(order.customer.email)}`,
    "",
    `💳 <b>${method}</b>`,
    paymentStatus,
    "",
    ...lines,
    "",
  ];

  if (order.discount > 0) {
    parts.push(`Сума: ${formatPriceWithCurrency(order.subtotal)}`);
    parts.push(
      `Промокод ${escapeHtml(order.promoCode ?? "—")}: −${formatPriceWithCurrency(
        order.discount
      )}`
    );
  }
  parts.push(`<b>До сплати: ${formatPriceWithCurrency(order.total)}</b>`);

  parts.push("");
  parts.push(
    `🚚 Нова Пошта · ${escapeHtml(order.delivery.cityName)}\n${escapeHtml(
      order.delivery.branchName
    )}`
  );

  const link = orderLink(order.orderId);
  if (link) parts.push(`\n<a href="${link}">Відкрити в KeyCRM</a>`);
  parts.push("ЗлатОчка -  Ебать у нее Очко, Ебать у нее Очко👉👌");
  return parts.join("\n");
}

export function formatOrderPaid(
  orderId: number,
  amount: number,
  detail: string
): string {
  const link = orderLink(orderId);
  return [
    `✅ <b>Оплата пройшла — замовлення №${orderId}</b>`,
    `${formatPriceWithCurrency(amount)} · ${escapeHtml(detail)}`,
    ...(link ? ["", `<a href="${link}">Відкрити в KeyCRM</a>`] : []),
  ].join("\n");
}

export function formatKeyCrmStatusChange(params: {
  event: string;
  orderId: number | null;
  status: string | null;
  total: number | null;
  buyerName: string | null;
}): string {
  const isPayment = params.event === "order.change_payment_status";
  const icon = isPayment ? "💳" : "🔄";
  const what = isPayment ? "Статус оплати" : "Статус замовлення";
  const order = params.orderId ? `№${params.orderId}` : "(без номера)";

  const parts = [
    `${icon} <b>${what} · замовлення ${order}</b>`,
    params.status ? escapeHtml(params.status) : "статус не вказано",
  ];
  if (params.buyerName) parts.push(escapeHtml(params.buyerName));
  if (params.total !== null) parts.push(formatPriceWithCurrency(params.total));

  const link = params.orderId ? orderLink(params.orderId) : null;
  if (link) parts.push(`\n<a href="${link}">Відкрити в KeyCRM</a>`);

  return parts.join("\n");
}

/**
 * The buttons under a new order.
 *
 * One row so they stay readable on a phone. Cancel is deliberately last and on
 * its own row: it is the one press that cannot be undone from here.
 */
export function orderActionKeyboard(orderId: number): InlineKeyboard {
  return [
    ORDER_ACTIONS.filter((a) => !a.destructive).map((a) => ({
      text: a.label,
      callback_data: encodeCallback(orderId, a.key),
    })),
    ORDER_ACTIONS.filter((a) => a.destructive).map((a) => ({
      text: a.label,
      callback_data: encodeCallback(orderId, a.key),
    })),
  ];
}

/**
 * The orders group gets the order with its buttons; the Finance chat gets the
 * same text as a copy with none (PRD #103, story 41) — the owners watch sales
 * there, they do not work orders there, and the buttons webhook would refuse a
 * press from it anyway.
 *
 * Sent side by side and settled independently: the copy failing, or the
 * Finance chat not being configured, never costs the orders group its message.
 * Resolves to whether the orders group got it. Never rejects.
 */
export async function notifyNewOrder(
  order: NewOrderNotification
): Promise<boolean> {
  const text = formatNewOrder(order);
  const [orders] = await Promise.allSettled([
    sendTelegramMessage(text, { keyboard: orderActionKeyboard(order.orderId) }),
    sendTelegramMessage(text, { target: "finance" }),
  ]);
  return orders.status === "fulfilled" && orders.value !== null;
}

export async function notifyOrderPaid(
  orderId: number,
  amount: number,
  detail: string
): Promise<boolean> {
  const sent = await sendTelegramMessage(formatOrderPaid(orderId, amount, detail));
  return sent !== null;
}
