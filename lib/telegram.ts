// Telegram transport for shop notifications. Server-only.
//
// Notifications are a convenience, never a dependency: nothing here is allowed
// to fail an order, a payment or a webhook. Every call resolves to a boolean or
// null and swallows its own errors, and an unconfigured bot is a no-op with one
// warning rather than a throw — a missing token must not be the reason a
// customer cannot pay.
//
// Env (server-only, set in .env.local and in Vercel):
//   TELEGRAM_BOT_TOKEN       from @BotFather
//   TELEGRAM_CHAT_ID         the orders group (negative, e.g. -1001234567890)
//   TELEGRAM_ALERT_CHAT_ID   optional; failures go here instead when set
//   TELEGRAM_WEBHOOK_SECRET  guards /api/keycrm/webhook (query string)
//   TELEGRAM_BOT_SECRET      guards /api/telegram/webhook (header)
//   KEYCRM_APP_URL           optional; when set, messages link to the order

const TELEGRAM_API = "https://api.telegram.org";

/** Telegram rejects anything over 4096 characters outright. */
const MAX_MESSAGE_LENGTH = 4096;

/**
 * Short on purpose. This runs inside a request the customer is waiting on (or
 * inside a webhook a payment provider will redeliver), so a slow Telegram must
 * cost a second or two and then be dropped, not hold the response open.
 */
const SEND_TIMEOUT_MS = 5000;

/** Which chat a message is for. Alerts are separable without touching callers. */
export type ChatTarget = "orders" | "alerts";

export interface InlineButton {
  text: string;
  callback_data: string;
}

export type InlineKeyboard = InlineButton[][];

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function chatIdFor(target: ChatTarget): string | undefined {
  // Alerts fall back to the orders group rather than going nowhere: a failure
  // in the wrong chat is recoverable, a failure in no chat is the situation
  // this whole feature exists to end.
  if (target === "alerts") {
    return process.env.TELEGRAM_ALERT_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  }
  return process.env.TELEGRAM_CHAT_ID;
}

/**
 * Escape for parse_mode "HTML".
 *
 * HTML rather than MarkdownV2 deliberately: MarkdownV2 requires escaping
 * eighteen characters, several of which (`-`, `.`, `!`) appear in every branch
 * name and price we print, and one missed escape is a 400 that loses the whole
 * notification. HTML needs exactly these three.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * One call to the Bot API. Returns the parsed `result` on success and null on
 * any failure, having logged it. Never throws.
 */
async function callTelegram<T>(
  method: string,
  payload: Record<string, unknown>
): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn(`[telegram] TELEGRAM_BOT_TOKEN not set — ${method} skipped`);
    return null;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!res.ok) {
      // Telegram puts the real reason in the body ("chat not found", "bot was
      // blocked"), not the status — log it or every failure looks identical.
      const detail = await res.text().catch(() => "");
      console.error(`[telegram] ${method} ${res.status}: ${detail.slice(0, 300)}`);
      return null;
    }

    const body = (await res.json()) as { ok: boolean; result: T };
    return body.ok ? body.result : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[telegram] ${method} failed:`, msg);
    return null;
  }
}

export interface SentMessage {
  message_id: number;
  chat: { id: number };
}

/**
 * Send one message. Resolves to the sent message on success and null in every
 * other case — including no configuration at all. Never throws.
 */
export async function sendTelegramMessage(
  text: string,
  options: { target?: ChatTarget; keyboard?: InlineKeyboard } = {}
): Promise<SentMessage | null> {
  const chatId = chatIdFor(options.target ?? "orders");
  if (!chatId) {
    console.warn("[telegram] TELEGRAM_CHAT_ID not set — notification skipped");
    return null;
  }

  return callTelegram<SentMessage>("sendMessage", {
    chat_id: chatId,
    text: text.slice(0, MAX_MESSAGE_LENGTH),
    parse_mode: "HTML",
    // The order link is the only link we send and it is not worth a preview
    // card pushing the next notification off the screen.
    link_preview_options: { is_disabled: true },
    ...(options.keyboard ? { reply_markup: { inline_keyboard: options.keyboard } } : {}),
  });
}

/**
 * Every callback query must be answered within ~15s or the user's client shows
 * a spinner until it times out — so this is called on every path, including the
 * ones that failed.
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text: string,
  isError = false
): Promise<void> {
  await callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text.slice(0, 200),
    // An alert blocks with a dialog; a toast is right for "done", wrong for
    // "that failed and you need to go do it by hand".
    show_alert: isError,
  });
}

/**
 * Rewrite a message in place — used to record who pressed what and to take the
 * buttons away so the same action cannot be applied twice.
 */
export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboard
): Promise<void> {
  await callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: text.slice(0, MAX_MESSAGE_LENGTH),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: keyboard ?? [] },
  });
}
