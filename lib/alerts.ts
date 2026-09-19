// Operational alerts — the failures that used to go only to console.error.
//
// Every one of these already had a log line and a comment explaining why it
// mattered; the problem was that the audience for a Vercel log is nobody. What
// is reported here is specifically the class of failure where *money is at
// stake and a human must act*: a customer who could not check out, an order
// that cannot be paid, a payment that arrived without the CRM noticing.
//
// Not reported: anything the code recovers from on its own. Nova Poshta search
// failing has a retry and an empty dropdown, Strapi being down degrades to
// fallbacks by design — paging someone for those trains them to ignore the
// channel, which costs more than the alerts are worth.

import { escapeHtml, sendTelegramMessage } from "./telegram.ts";

export type AlertSeverity = "error" | "critical";

/**
 * How long the same alert stays silenced after being sent.
 *
 * A failing KeyCRM does not fail once — it fails for every checkout until it
 * comes back, and a hundred identical messages is how a group gets muted on
 * the evening it mattered. Keyed per-instance only: several serverless
 * instances can each send one, which is an acceptable price for not holding
 * shared state in the payment path.
 */
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

const lastSentAt = new Map<string, number>();

/** Exported for tests — module state would otherwise leak between them. */
export function resetAlertThrottle(): void {
  lastSentAt.clear();
}

function shouldSend(key: string, now: number): boolean {
  const previous = lastSentAt.get(key);
  if (previous !== undefined && now - previous < DEDUPE_WINDOW_MS) return false;
  lastSentAt.set(key, now);

  // The map is keyed by scope, so it is bounded by the number of call sites —
  // but a context-derived key would not be, so expire old entries anyway.
  for (const [k, t] of lastSentAt) {
    if (now - t > DEDUPE_WINDOW_MS) lastSentAt.delete(k);
  }
  return true;
}

export interface AlertInput {
  /** Stable identifier for the failing operation, e.g. "orders.create". */
  scope: string;
  /** What went wrong, in Ukrainian — a manager reads this, not an engineer. */
  title: string;
  /** The underlying error message. */
  detail?: string;
  /** Extra facts worth having on a phone: order id, phone, amount. */
  context?: Record<string, string | number | null | undefined>;
  severity?: AlertSeverity;
  /** What the person reading it should do now. Omit when there is nothing. */
  action?: string;
}

export function formatAlert(alert: AlertInput): string {
  const icon = alert.severity === "critical" ? "🚨" : "⚠️";
  const parts = [`${icon} <b>${escapeHtml(alert.title)}</b>`];

  const context = Object.entries(alert.context ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );
  if (context.length > 0) {
    parts.push("");
    for (const [k, v] of context) {
      parts.push(`${escapeHtml(k)}: <code>${escapeHtml(String(v))}</code>`);
    }
  }

  if (alert.detail) {
    parts.push("");
    // <code> so a stack-ish message wraps as one block instead of reflowing
    // into the prose above it.
    parts.push(`<code>${escapeHtml(alert.detail.slice(0, 500))}</code>`);
  }

  if (alert.action) {
    parts.push("");
    parts.push(`👉 ${escapeHtml(alert.action)}`);
  }

  parts.push("");
  parts.push(`<i>${escapeHtml(alert.scope)}</i>`);

  return parts.join("\n");
}

/**
 * Report a failure. Never throws and never blocks on anything meaningful —
 * safe to call from inside a catch block on the payment path.
 */
export async function reportFailure(alert: AlertInput): Promise<void> {
  if (!shouldSend(alert.scope, Date.now())) return;
  await sendTelegramMessage(formatAlert(alert), { target: "alerts" });
}
