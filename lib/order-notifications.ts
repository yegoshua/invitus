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
import {
  WAYBILL_STATUS_ID,
  encodeCallback,
  remainingActions,
} from "./telegram-actions.ts";

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
  paymentMethod: "online" | "parts" | "cod";
  /** Instalment count, when the method is "parts". */
  parts?: number | null;
  lines: NotifiableLine[];
  subtotal: number;
  discount: number;
  total: number;
  promoCode?: string | null;
  /**
   * Set once the money is in (or, for instalments, once the customer has
   * confirmed in the app). The first message never has it; a refresh from the
   * CRM does. `card` is the masked card when Monobank reported one.
   */
  paid?: { card?: string | null } | null;
  /** The Nova Poshta waybill number, once there is one. */
  waybill?: string | null;
}

/** One line appended under an order after someone acted on it. */
export interface OrderLogEntry {
  who: string;
  did: string;
}

/**
 * A running joke in the orders group. Sent as its own message straight after
 * each order, so the order card itself — which is also copied to the Finance
 * chat and rewritten in place as the order moves — carries only the order.
 */
export const ORDER_FOLLOW_UP = "ЗлатОчка -  Ебать у нее Очко, Ебать у нее Очко👉👌";

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
  const method =
    order.paymentMethod === "online"
      ? "Онлайн-оплата (Monobank)"
      : order.paymentMethod === "parts"
        ? `Покупка частинами monobank${order.parts ? ` · ${order.parts} платежів` : ""}`
        : "Накладений платіж";
  // The first message is always unpaid: the order is recorded before Monobank
  // is even asked for an invoice. `paid` arrives with the refresh that follows
  // the payment — see lib/order-messages.ts. An instalment order is "paid" the
  // moment the customer confirms in the app, and the money itself follows the
  // waybill, which is what tells Monobank to activate the plan.
  const paymentStatus = order.paid
    ? order.paymentMethod === "parts"
      ? "✅ Підтверджено в застосунку mono — гроші надійдуть після ТТН"
      : `✅ <b>Оплачено</b>${order.paid.card ? ` · картка ${escapeHtml(order.paid.card)}` : ""}`
    : order.paymentMethod === "online"
      ? "⏳ Не оплачено — очікує оплати"
      : order.paymentMethod === "parts"
        ? "⏳ Не оплачено — очікує підтвердження в застосунку mono"
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

  if (order.waybill) parts.push(`📦 ТТН: <code>${escapeHtml(order.waybill)}</code>`);

  const link = orderLink(order.orderId);
  if (link) parts.push(`\n<a href="${link}">Відкрити в KeyCRM</a>`);
  return parts.join("\n");
}

/** The order card plus who did what to it, in the order it happened. */
export function renderOrderMessage(
  order: NewOrderNotification,
  log: readonly OrderLogEntry[] = []
): string {
  const card = formatNewOrder(order);
  if (log.length === 0) return card;
  const lines = log.map(
    (entry) => `— <b>${escapeHtml(entry.who)}</b> ${escapeHtml(entry.did)}`
  );
  return `${card}\n\n${lines.join("\n")}`;
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
 * The buttons under an order, for the state it is in now.
 *
 * Taking the order on its own row, the two waybill buttons together, and
 * cancel last and alone: it is the one press that cannot be undone from here.
 * An order with nothing left to do gets an empty keyboard, which is what takes
 * the buttons away when the message is rewritten.
 */
export function orderActionKeyboard(
  orderId: number,
  state: { statusId: number | null; hasWaybill: boolean } = {
    statusId: null,
    hasWaybill: false,
  }
): InlineKeyboard {
  const actions = remainingActions(state);
  const button = (a: (typeof actions)[number]) => ({
    text: a.label,
    callback_data: encodeCallback(orderId, a.key),
  });
  return [
    actions.filter((a) => !a.destructive && a.statusId !== WAYBILL_STATUS_ID).map(button),
    actions.filter((a) => !a.destructive && a.statusId === WAYBILL_STATUS_ID).map(button),
    actions.filter((a) => a.destructive).map(button),
  ].filter((row) => row.length > 0);
}

/** A message we sent about an order, so it can be rewritten later. */
export interface OrderMessageRef {
  chatId: number;
  messageId: number;
  /** Whether it carries the buttons — the orders group's does, the copy not. */
  buttons: boolean;
}

/**
 * The orders group gets the order with its buttons and then the follow-up; the
 * Finance chat gets the same order text as a copy with none (PRD #103, story
 * 41) — the owners watch sales there, they do not work orders there, and the
 * buttons webhook would refuse a press from it anyway.
 *
 * Sent side by side and settled independently: the copy failing, or the
 * Finance chat not being configured, never costs the orders group its message.
 * The follow-up waits for the order so the two land in that order.
 *
 * `delivered` is whether the orders group got the order; `messages` is every
 * order message that was sent, for rewriting in place later. Never rejects.
 */
export async function notifyNewOrder(
  order: NewOrderNotification
): Promise<{ delivered: boolean; messages: OrderMessageRef[] }> {
  const text = formatNewOrder(order);
  const [orders, finance] = await Promise.allSettled([
    sendTelegramMessage(text, { keyboard: orderActionKeyboard(order.orderId) }).then(
      async (sent) => {
        if (sent) await sendTelegramMessage(escapeHtml(ORDER_FOLLOW_UP));
        return sent;
      }
    ),
    sendTelegramMessage(text, { target: "finance" }),
  ]);

  const messages: OrderMessageRef[] = [];
  if (orders.status === "fulfilled" && orders.value) {
    messages.push({
      chatId: orders.value.chat.id,
      messageId: orders.value.message_id,
      buttons: true,
    });
  }
  if (finance.status === "fulfilled" && finance.value) {
    messages.push({
      chatId: finance.value.chat.id,
      messageId: finance.value.message_id,
      buttons: false,
    });
  }
  return { delivered: messages.some((m) => m.buttons), messages };
}

/**
 * The bank said no to an instalment order. The KeyCRM order stays, unpaid, and
 * the customer has been told on screen — this is so the group knows why an
 * order is sitting there and whether a call is worth making.
 */
export function formatPartsRefused(
  orderId: number,
  reason: string,
  subState: string | null
): string {
  const link = orderLink(orderId);
  return [
    `🚫 <b>monobank відхилив покупку частинами — замовлення №${orderId}</b>`,
    escapeHtml(reason),
    ...(subState ? [`<i>${escapeHtml(subState)}</i>`] : []),
    "Клієнт бачить причину на сайті й може обрати інший спосіб оплати.",
    ...(link ? ["", `<a href="${link}">Відкрити в KeyCRM</a>`] : []),
  ].join("\n");
}

export async function notifyPartsRefused(
  orderId: number,
  reason: string,
  subState: string | null
): Promise<boolean> {
  const sent = await sendTelegramMessage(
    formatPartsRefused(orderId, reason, subState)
  );
  return sent !== null;
}

export async function notifyOrderPaid(
  orderId: number,
  amount: number,
  detail: string
): Promise<boolean> {
  const sent = await sendTelegramMessage(formatOrderPaid(orderId, amount, detail));
  return sent !== null;
}
