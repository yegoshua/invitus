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
} from "@/lib/telegram";
import { acceptsOrderActionsFrom, decodeCallback } from "@/lib/telegram-actions";
import { setKeyCrmOrderStatus } from "@/lib/orders";
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

  try {
    const { previousStatusId } = await setKeyCrmOrderStatus(orderId, action.statusId);

    const alreadyThere = previousStatusId === action.statusId;
    await answerCallbackQuery(
      query.id,
      alreadyThere ? "Статус уже такий" : `Готово: ${action.done}`
    );

    // Rewrite the original message: record who did what and drop the buttons,
    // so the same order cannot be marked twice and the group can see at a
    // glance which orders are still untouched.
    const original = query.message?.text ?? `Замовлення №${orderId}`;
    await editMessageText(
      chatId,
      query.message!.message_id,
      `${escapeHtml(original)}\n\n— <b>${escapeHtml(who)}</b> ${escapeHtml(
        action.done
      )}`
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
