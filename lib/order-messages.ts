// Keeping an order's Telegram messages true to the CRM. Server-only.
//
// The first message about an order is a snapshot taken a minute before the
// customer pays, and for a long time it stayed that snapshot: a paid order sat
// in the group reading «⏳ Не оплачено» (order #1063). Now every message sent
// about an order is remembered on the order itself, and whenever something
// changes — the payment lands, a button is pressed, a waybill is made — all of
// them are rewritten from what KeyCRM holds at that moment.
//
// Where they are remembered: a KeyCRM custom field on orders named «Telegram»
// (text). It has to be created by hand once, in KeyCRM → Налаштування →
// Додаткові поля; the API cannot create one. Without it everything still
// works as before, except that only the message a button was pressed on gets
// rewritten — a payment has no message to point at.
//
// Nothing here may fail an order, a payment or a button: every export resolves
// and swallows its own errors.

import { fetchKeyCrm, putKeyCrm } from "./keycrm";
import { editMessageText } from "./telegram";
import {
  notifyNewOrder,
  orderActionKeyboard,
  renderOrderMessage,
  type NewOrderNotification,
  type OrderLogEntry,
} from "./order-notifications";
import {
  emptyState,
  encodeState,
  notificationFromKeyCrmOrder,
  stateOf,
  type KeyCrmOrderForCard,
  type OrderMessageState,
  type PaymentMethodIds,
} from "./order-card";

const FIELD_NAME = "telegram";

/**
 * The field's uuid (OR_10xx), found by name so there is nothing to configure
 * beyond creating it. KEYCRM_TELEGRAM_FIELD_UUID overrides the lookup.
 */
async function telegramFieldUuid(): Promise<string | null> {
  const configured = process.env.KEYCRM_TELEGRAM_FIELD_UUID;
  if (configured) return configured;
  try {
    const fields = await fetchKeyCrm<
      Array<{ uuid: string; name: string; model: string }>
    >("/custom-fields", { revalidate: 3600 });
    const field = fields.find(
      (f) => f.model === "order" && f.name.trim().toLowerCase() === FIELD_NAME
    );
    if (!field) {
      console.warn(
        "[order-messages] no «Telegram» custom field on orders — messages will not be updated after a payment"
      );
    }
    return field?.uuid ?? null;
  } catch (err) {
    console.error(
      "[order-messages] custom field lookup failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

function envId(name: string): number | null {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function paymentMethodIds(): PaymentMethodIds {
  return {
    online: envId("KEYCRM_PAYMENT_METHOD_ID_ONLINE"),
    parts: envId("KEYCRM_PAYMENT_METHOD_ID_PARTS"),
    cod: envId("KEYCRM_PAYMENT_METHOD_ID_COD"),
  };
}

/** The order as a message needs it — fresh, never cached. */
export async function fetchOrderForCard(orderId: number): Promise<KeyCrmOrderForCard> {
  return fetchKeyCrm<KeyCrmOrderForCard>(`/order/${orderId}`, {
    params: { include: "buyer,products,shipping,payments,custom_fields" },
    revalidate: 0,
  });
}

async function saveState(
  orderId: number,
  uuid: string,
  state: OrderMessageState
): Promise<void> {
  await putKeyCrm(`/order/${orderId}`, {
    custom_fields: [{ uuid, value: encodeState(state) }],
  });
}

/**
 * Send the new-order messages and remember them on the order. Replaces a bare
 * notifyNewOrder in /api/orders; runs inside after(), so the customer never
 * waits on it.
 */
export async function announceNewOrder(order: NewOrderNotification): Promise<void> {
  const { messages } = await notifyNewOrder(order);
  if (messages.length === 0) return;
  try {
    const uuid = await telegramFieldUuid();
    if (uuid) await saveState(order.orderId, uuid, { ...emptyState(), messages });
  } catch (err) {
    console.error(
      `[order-messages] could not remember messages for order ${order.orderId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Rewrite every message about an order from KeyCRM's current state.
 *
 * `log` records who just did what, before rendering, so it survives the next
 * rewrite. `pressed` is the message a button was pressed on: always rewritten,
 * even when nothing was remembered — a message sent before this existed, or
 * with no custom field — so a press never leaves stale buttons behind.
 *
 * Returns whether any message was rewritten. Never throws.
 */
export async function refreshOrderMessages(
  orderId: number,
  opts: {
    log?: readonly OrderLogEntry[];
    pressed?: { chatId: number; messageId: number };
  } = {}
): Promise<boolean> {
  try {
    const [order, uuid] = await Promise.all([
      fetchOrderForCard(orderId),
      telegramFieldUuid(),
    ]);
    const state = uuid ? stateOf(order, uuid) : emptyState();

    if (opts.log?.length) {
      state.log.push(...opts.log);
      if (uuid) {
        await saveState(orderId, uuid, state).catch((err) =>
          console.error(
            `[order-messages] could not save the log for order ${orderId}:`,
            err instanceof Error ? err.message : err
          )
        );
      }
    }

    const targets = [...state.messages];
    const pressed = opts.pressed;
    if (
      pressed &&
      !targets.some((m) => m.chatId === pressed.chatId && m.messageId === pressed.messageId)
    ) {
      targets.push({ ...pressed, buttons: true });
    }
    if (targets.length === 0) return false;

    const card = notificationFromKeyCrmOrder(order, paymentMethodIds());
    const text = renderOrderMessage(card, state.log);
    const keyboard = orderActionKeyboard(orderId, {
      statusId: order.status_id ?? null,
      hasWaybill: Boolean(card.waybill),
    });

    await Promise.all(
      targets.map((m) =>
        editMessageText(m.chatId, m.messageId, text, m.buttons ? keyboard : [])
      )
    );
    return true;
  } catch (err) {
    console.error(
      `[order-messages] refresh of order ${orderId} failed:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}
