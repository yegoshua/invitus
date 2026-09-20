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
//   2. The chat the callback came from must be a chat we notify. A stranger
//      who somehow forged a delivery still cannot act from their own chat.
//
// Register the webhook with scripts/set-telegram-webhook.mts.

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  answerCallbackQuery,
  editMessageText,
  escapeHtml,
} from "@/lib/telegram";
import { decodeCallback, type OrderAction } from "@/lib/telegram-actions";
import { partsOrderIdOf, setKeyCrmOrderStatus } from "@/lib/orders";
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
    return "⚠️ monobank: не вдалося перевірити, чи це покупка частинами";
  }
  if (!partsOrderId) return null;

  try {
    const result = confirm
      ? await confirmPartsOrder(partsOrderId)
      : await rejectPartsOrder(partsOrderId);
    const state = `${result.state}/${result.order_sub_state}`;
    return confirm
      ? `✅ monobank: покупку частинами активовано (${state})`
      : `↩️ monobank: заявку на покупку частинами скасовано (${state})`;
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
    return `⚠️ monobank: не вдалося (${msg.slice(0, 120)})`;
  }
}

function isKnownChat(chatId: number): boolean {
  const allowed = [
    process.env.TELEGRAM_CHAT_ID,
    process.env.TELEGRAM_ALERT_CHAT_ID,
  ].filter(Boolean);
  return allowed.includes(String(chatId));
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
  if (chatId === undefined || !isKnownChat(chatId)) {
    await answerCallbackQuery(query.id, "Дія недоступна в цьому чаті", true);
    return NextResponse.json({ ok: true, ignored: "foreign chat" }, { status: 200 });
  }

  const { orderId, action } = decoded;
  const who = pressedBy(query.from);

  try {
    const { previousStatusId } = await setKeyCrmOrderStatus(orderId, action.statusId);

    const alreadyThere = previousStatusId === action.statusId;
    await answerCallbackQuery(
      query.id,
      alreadyThere ? "Статус уже такий" : `Готово: ${action.done}`
    );

    // A second press on the same status must not confirm the plan twice or
    // reject one that was just confirmed; Monobank would refuse anyway, but an
    // alert for a no-op is noise.
    const partsLine = alreadyThere ? null : await applyPartsAction(orderId, action);

    // Rewrite the original message: record who did what and drop the buttons,
    // so the same order cannot be marked twice and the group can see at a
    // glance which orders are still untouched.
    const original = query.message?.text ?? `Замовлення №${orderId}`;
    await editMessageText(
      chatId,
      query.message!.message_id,
      `${escapeHtml(original)}\n\n— <b>${escapeHtml(who)}</b> ${escapeHtml(
        action.done
      )}${partsLine ? `\n${escapeHtml(partsLine)}` : ""}`
    );

    return NextResponse.json({ ok: true, orderId, statusId: action.statusId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[telegram webhook] order ${orderId} → ${action.key} failed:`, msg);

    // show_alert: the manager pressed a button believing it worked, and the
    // order is now in a different state in their head than in the CRM.
    await answerCallbackQuery(query.id, `Не вдалося: ${msg.slice(0, 150)}`, true);
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
