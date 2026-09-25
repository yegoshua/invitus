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
//   TELEGRAM_FINANCE_CHAT_ID the Finance chat: a button-less copy of every new
//                            order, and alerts when no alert chat is set
//   TELEGRAM_ALERT_CHAT_ID   optional; failures go here instead when set —
//                            meant to be the Finance chat's id (PRD #103)
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

/**
 * Which chat a message is for. The orders group is where the team works the
 * buttons; the Finance chat is the owners' (CONTEXT.md) and gets copies and
 * alerts; alerts are separable without touching callers.
 */
export type ChatTarget = "orders" | "finance" | "alerts";

export interface InlineButton {
  text: string;
  callback_data: string;
}

export type InlineKeyboard = InlineButton[][];

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/** Exported for tests; `env` defaults to the process's. */
export function chatIdFor(
  target: ChatTarget,
  env: Record<string, string | undefined> = process.env
): string | undefined {
  // The Finance chat has no fallback. A copy that lands in the orders group
  // instead puts money in front of the people ADR 0002 keeps it from.
  if (target === "finance") return env.TELEGRAM_FINANCE_CHAT_ID || undefined;
  // Alerts fall back — to the Finance chat, then the orders group — rather
  // than going nowhere: a failure in the wrong chat is recoverable, a failure
  // in no chat is the situation this whole feature exists to end.
  if (target === "alerts") {
    return (
      env.TELEGRAM_ALERT_CHAT_ID ||
      env.TELEGRAM_FINANCE_CHAT_ID ||
      env.TELEGRAM_CHAT_ID ||
      undefined
    );
  }
  return env.TELEGRAM_CHAT_ID || undefined;
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
 * Files are not sent from inside a request anyone is waiting on — only from
 * `after()` — and a 25 MB Artwork does not reach Telegram in five seconds.
 */
const FILE_SEND_TIMEOUT_MS = 60_000;

/**
 * One call to the Bot API. Returns the parsed `result` on success and null on
 * any failure, having logged it. Never throws.
 *
 * A plain object goes as JSON; FormData goes as multipart, which is the only
 * way the Bot API accepts a file uploaded rather than fetched from a URL.
 */
async function callTelegram<T>(
  method: string,
  payload: Record<string, unknown> | FormData,
  timeoutMs = SEND_TIMEOUT_MS
): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn(`[telegram] TELEGRAM_BOT_TOKEN not set — ${method} skipped`);
    return null;
  }

  const multipart = payload instanceof FormData;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: "POST",
      // No Content-Type for FormData: fetch writes it, boundary included.
      headers: multipart ? undefined : { "Content-Type": "application/json" },
      body: multipart ? payload : JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
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
  const target = options.target ?? "orders";
  const chatId = chatIdFor(target);
  if (!chatId) {
    console.warn(`[telegram] no chat configured for "${target}" — notification skipped`);
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

/** Telegram caps a photo or document caption at 1024 characters. */
const MAX_CAPTION_LENGTH = 1024;

/**
 * Send a file — `photo` is shown inline and recompressed by Telegram, a
 * `document` arrives byte for byte. Same contract as sendTelegramMessage:
 * the sent message or null, never a throw.
 */
export async function sendTelegramFile(
  kind: "photo" | "document",
  file: Blob,
  fileName: string,
  options: { target?: ChatTarget; caption?: string; replyTo?: number } = {}
): Promise<SentMessage | null> {
  const target = options.target ?? "orders";
  const chatId = chatIdFor(target);
  if (!chatId) {
    console.warn(`[telegram] no chat configured for "${target}" — ${kind} skipped`);
    return null;
  }

  const form = new FormData();
  form.set("chat_id", chatId);
  form.set(kind, file, fileName);
  if (options.caption) {
    form.set("caption", options.caption.slice(0, MAX_CAPTION_LENGTH));
    form.set("parse_mode", "HTML");
  }
  if (options.replyTo) {
    form.set("reply_parameters", JSON.stringify({ message_id: options.replyTo }));
  }
  return callTelegram<SentMessage>(
    kind === "photo" ? "sendPhoto" : "sendDocument",
    form,
    FILE_SEND_TIMEOUT_MS
  );
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
