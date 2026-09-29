// Telegram Bot webhook — the buttons under an order notification.
//
// This is the one place the bot *listens*. Everything else in this feature is
// outbound, so the security story is new: the endpoint is public, and pressing
// a button changes an order in the CRM.
//
// Two independent checks stand between the internet and a status write:
//   1. Telegram's own `secret_token`, which it echoes in a header on every
//      delivery. Unlike the KeyCRM webhook — which cannot send headers, so its
//      secret rides in the query string — this one is done properly.
//   2. The chat the callback came from must be the orders group. A stranger
//      who somehow forged a delivery still cannot act from their own chat, and
//      neither can the Finance chat, which gets a button-less copy of every
//      order and must never be a second place to action one from.
//
// Register the webhook with scripts/set-telegram-webhook.mts.

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  answerCallbackQuery,
  editMessageText,
  escapeHtml,
  sendTelegramMessage,
} from "@/lib/telegram";
import {
  acceptsOrderActionsFrom,
  decodeCallback,
  type OrderAction,
} from "@/lib/telegram-actions";
import { partsOrderIdOf, setKeyCrmOrderStatus } from "@/lib/orders";
import { putKeyCrm } from "@/lib/keycrm";
import {
  fetchOrderForCard,
  paymentMethodIds,
  refreshOrderMessages,
} from "@/lib/order-messages";
import { notificationFromKeyCrmOrder } from "@/lib/order-card";
import type { OrderLogEntry } from "@/lib/order-notifications";
import { createWaybill, WaybillError } from "@/lib/nova-poshta-waybill";
import { confirmPartsOrder, rejectPartsOrder } from "@/lib/monobank-parts";
import { reportFailure } from "@/lib/alerts";

interface CallbackQuery {
  id: string;
  data?: string;
  from?: { first_name?: string; last_name?: string; username?: string };
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
  };
}

function matchesSecret(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Who pressed it, as a human name rather than a numeric id. */
function pressedBy(from: CallbackQuery["from"]): string {
  const name = [from?.first_name, from?.last_name].filter(Boolean).join(" ");
  if (name) return name;
  return from?.username ? `@${from.username}` : "хтось";
}

/**
 * The Monobank side of two buttons, for an instalment order only.
 *
 * «ТТН створено» is the handover Monobank wants before /api/order/confirm —
 * the parcel is on its way, so the plan is activated and the shop gets paid.
 * «Скасувати» annuls the plan (/api/order/reject) so the customer's limit is
 * freed. Both are best effort *after* the CRM status has changed: the manager
 * pressed a CRM button, and Monobank refusing (a plan already confirmed, a
 * customer who never approved) is reported in the message, not used to undo
 * the status. Returns the line to append, or null for a non-instalment order.
 */
async function applyPartsAction(
  orderId: number,
  action: OrderAction
): Promise<string | null> {
  if (!action.parts) return null;
  const confirm = action.parts === "confirm";

  // Everything below the CRM write is best effort, the lookup included: a
  // KeyCRM read that fails here must not escape to the outer handler, which
  // would skip the message rewrite and leave the buttons up on an order whose
  // status already changed.
  let partsOrderId: string | null = null;
  try {
    partsOrderId = await partsOrderIdOf(orderId);
  } catch (err) {
    console.error(
      `[telegram webhook] could not read order ${orderId} for a parts action:`,
      err instanceof Error ? err.message : err
    );
    return "⚠️ не вдалося перевірити, чи це покупка частинами";
  }
  if (!partsOrderId) return null;

  try {
    const result = confirm
      ? await confirmPartsOrder(partsOrderId)
      : await rejectPartsOrder(partsOrderId);
    const state = `${result.state}/${result.order_sub_state}`;
    return confirm
      ? `✅ покупку частинами активовано (${state})`
      : `↩️ заявку на покупку частинами скасовано (${state})`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[telegram webhook] parts ${action.parts} for order ${orderId} failed:`, msg);
    await reportFailure({
      scope: `parts.${action.parts}`,
      title: confirm
        ? "ТТН створено, але monobank не активував покупку частинами"
        : "Замовлення скасовано, але monobank не скасував покупку частинами",
      detail: msg,
      context: { Замовлення: orderId, "Заявка mono": partsOrderId },
      action: confirm
        ? "Без підтвердження гроші не надійдуть. Підтверди видачу в кабінеті monobank вручну."
        : "Скасуй заявку в кабінеті monobank вручну, інакше ліміт клієнта лишиться зайнятим.",
      severity: "critical",
    });
    return `⚠️ не вдалося (${msg.slice(0, 120)})`;
  }
}

/**
 * Orders whose waybill is being made on this instance right now. Two presses
 * a second apart would otherwise both find no tracking code and both create a
 * waybill — two parcels' worth of paperwork for one belt. Per instance only,
 * which covers the realistic case (one impatient double tap lands on the same
 * warm instance) without putting shared state in front of the button.
 */
const waybillsInFlight = new Set<number>();

type WaybillOutcome =
  | { ok: true; number: string; savedToCrm: boolean }
  | { ok: false; reason: string; existing?: string };

/**
 * Make the Nova Poshta waybill for an order and write its number to KeyCRM.
 *
 * Refuses an online or instalment order that is not paid yet: a waybill is a
 * promise to hand over goods, and an abandoned invoice would otherwise leave a
 * parcel booked for nobody. Cash on delivery is paid at the branch, so it goes.
 */
async function makeWaybill(orderId: number): Promise<WaybillOutcome> {
  const order = await fetchOrderForCard(orderId);
  const card = notificationFromKeyCrmOrder(order, paymentMethodIds());
  if (card.waybill) {
    return { ok: false, reason: `ТТН уже є: ${card.waybill}`, existing: card.waybill };
  }
  if (card.paymentMethod !== "cod" && !card.paid) {
    return {
      ok: false,
      reason: "Замовлення ще не оплачене — ТТН не створюю. Дочекайся оплати або створи вручну.",
    };
  }

  const address = order.shipping?.address_payload;
  const number = await createWaybill({
    orderId,
    fullName: order.shipping?.recipient_full_name || card.customer.fullName,
    phone: order.shipping?.recipient_phone || card.customer.phone,
    cityRef: address?.city_ref ?? "",
    warehouseRef: address?.warehouse_ref ?? "",
    total: card.total,
    cashOnDelivery: card.paymentMethod === "cod",
  });

  // The waybill exists now whatever happens next, so a failed CRM write must
  // not lose its number: it is in the message either way, and in an alert.
  let savedToCrm = true;
  try {
    await putKeyCrm(`/order/${orderId}`, { shipping: { tracking_code: number } });
  } catch (err) {
    savedToCrm = false;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[telegram webhook] waybill ${number} not saved to order ${orderId}:`, msg);
    await reportFailure({
      scope: "waybill.save",
      title: "ТТН створено, але в KeyCRM не записано",
      detail: msg,
      context: { Замовлення: orderId, ТТН: number },
      action: "Впиши номер ТТН у замовлення вручну.",
    });
  }
  return { ok: true, number, savedToCrm };
}

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_BOT_SECRET;
  if (!secret) {
    console.error("[telegram webhook] TELEGRAM_BOT_SECRET is not set — refusing");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const provided = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!matchesSecret(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await req.json().catch(() => null)) as {
    callback_query?: CallbackQuery;
  } | null;

  const query = update?.callback_query;
  // Plain messages, joins, everything else: 200 and ignore. Telegram retries a
  // non-2xx, and there is nothing to retry.
  if (!query?.data) return NextResponse.json({ ok: true });

  const decoded = decodeCallback(query.data);
  if (!decoded) {
    // A button from an older deploy. Answer it so the client stops spinning.
    await answerCallbackQuery(query.id, "Ця кнопка застаріла", true);
    return NextResponse.json({ ok: true, ignored: "unknown callback" });
  }

  const chatId = query.message?.chat.id;
  if (chatId === undefined || !acceptsOrderActionsFrom(chatId)) {
    await answerCallbackQuery(query.id, "Дія недоступна в цьому чаті", true);
    return NextResponse.json({ ok: true, ignored: "foreign chat" }, { status: 200 });
  }

  const { orderId, action } = decoded;
  const who = pressedBy(query.from);
  const pressed = { chatId, messageId: query.message!.message_id };

  // Making a waybill talks to Nova Poshta and KeyCRM in turn and can outlast
  // the ~15s Telegram gives a callback, so it is answered up front; anything
  // that goes wrong after this is said in the chat instead of in a popup.
  let waybill: string | null = null;
  if (action.createsWaybill) {
    if (waybillsInFlight.has(orderId)) {
      await answerCallbackQuery(query.id, "ТТН уже створюється");
      return NextResponse.json({ ok: true, ignored: "waybill in flight" });
    }
    waybillsInFlight.add(orderId);
    await answerCallbackQuery(query.id, "Створюю ТТН…");
    try {
      const outcome = await makeWaybill(orderId);
      if (!outcome.ok) {
        await sendTelegramMessage(
          `⚠️ <b>ТТН для №${orderId} не створено</b>\n${escapeHtml(outcome.reason)}`
        );
        // A waybill that already exists still deserves an up-to-date card.
        if (outcome.existing) await refreshOrderMessages(orderId, { pressed });
        return NextResponse.json({ ok: false, handled: true });
      }
      waybill = outcome.number;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[telegram webhook] waybill for order ${orderId} failed:`, msg);
      await sendTelegramMessage(
        `⚠️ <b>ТТН для №${orderId} не створено</b>\n${escapeHtml(
          err instanceof WaybillError ? msg : `Помилка: ${msg.slice(0, 200)}`
        )}\nСтвори вручну в кабінеті Нової Пошти й натисни «📦 ТТН вже є».`
      );
      return NextResponse.json({ ok: false, handled: true });
    } finally {
      waybillsInFlight.delete(orderId);
    }
  }

  try {
    const { previousStatusId } = await setKeyCrmOrderStatus(orderId, action.statusId);

    const alreadyThere = previousStatusId === action.statusId;
    if (!action.createsWaybill) {
      await answerCallbackQuery(
        query.id,
        alreadyThere ? "Статус уже такий" : `Готово: ${action.done}`
      );
    }

    // A second press on the same status must not confirm the plan twice or
    // reject one that was just confirmed; Monobank would refuse anyway, but an
    // alert for a no-op is noise. A new waybill always hands over, though: it
    // is the parcel the bank is waiting for.
    const partsLine =
      alreadyThere && !waybill ? null : await applyPartsAction(orderId, action);

    // Record who did what and rewrite every message about the order from the
    // CRM — the buttons shrink to what is left to do, and vanish once the
    // order has its waybill or is cancelled.
    const log: OrderLogEntry[] = [
      { who, did: waybill ? `${action.done} ${waybill}` : action.done },
      ...(partsLine ? [{ who: "monobank", did: partsLine }] : []),
    ];
    const refreshed = await refreshOrderMessages(orderId, { log, pressed });
    if (!refreshed) {
      // KeyCRM could not be read back. Fall back to the old rewrite of the
      // pressed message alone, so the press is at least recorded.
      const original = query.message?.text ?? `Замовлення №${orderId}`;
      await editMessageText(
        chatId,
        pressed.messageId,
        `${escapeHtml(original)}\n\n${log
          .map((e) => `— <b>${escapeHtml(e.who)}</b> ${escapeHtml(e.did)}`)
          .join("\n")}`
      );
    }

    return NextResponse.json({ ok: true, orderId, statusId: action.statusId, waybill });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[telegram webhook] order ${orderId} → ${action.key} failed:`, msg);

    // show_alert: the manager pressed a button believing it worked, and the
    // order is now in a different state in their head than in the CRM. A
    // waybill press was already answered, so it is said in the chat.
    if (action.createsWaybill) {
      await sendTelegramMessage(
        `⚠️ <b>ТТН ${escapeHtml(waybill ?? "")} створено, але статус №${orderId} у KeyCRM не змінився</b>\n${escapeHtml(msg.slice(0, 200))}`
      );
    } else {
      await answerCallbackQuery(query.id, `Не вдалося: ${msg.slice(0, 150)}`, true);
    }
    await reportFailure({
      scope: "telegram.action",
      title: "Кнопка не спрацювала — статус у KeyCRM не змінився",
      detail: msg,
      context: { Замовлення: orderId, Дія: action.label, Хто: who },
      action: "Зміни статус у CRM вручну.",
    });

    // 200: Telegram would redeliver the same press, and a retry that also
    // fails just multiplies the alert.
    return NextResponse.json({ ok: false, handled: true });
  }
}
