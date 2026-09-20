// What the buttons under an order notification do.
//
// The status ids are this KeyCRM account's own (read from /order/status), not
// anything universal — id 8 is literally named "Был сделан ТТН" there. They are
// listed in one table so the buttons, the confirmation wording and the CRM
// write can never describe three different things.
//
// No imports on purpose: node:test runs the encode/decode tests directly.

export interface OrderAction {
  /** Short — callback_data is capped at 64 bytes by Telegram. */
  key: string;
  label: string;
  /** KeyCRM order status id to move to. */
  statusId: number;
  /** Past tense, for the line appended to the message once pressed. */
  done: string;
  /** Rendered on its own row and never mixed with the routine buttons. */
  destructive?: boolean;
  /**
   * What the press means to a Monobank instalment order, if anything. The
   * dispatch is the handover the bank wants before it activates the plan and
   * pays the shop; a cancellation frees the customer's limit. Kept in this
   * row so a button cannot say one thing to the CRM and another to the bank.
   */
  parts?: "confirm" | "reject";
}

export const ORDER_ACTIONS: readonly OrderAction[] = [
  { key: "wip", label: "✅ Взяв у роботу", statusId: 2, done: "взяв у роботу" },
  {
    key: "ttn",
    label: "📦 ТТН створено",
    statusId: 8,
    done: "створив ТТН",
    parts: "confirm",
  },
  {
    key: "cancel",
    label: "❌ Скасувати",
    statusId: 19,
    done: "скасував",
    destructive: true,
    parts: "reject",
  },
];

export function findOrderAction(key: string): OrderAction | undefined {
  return ORDER_ACTIONS.find((a) => a.key === key);
}

const PREFIX = "o";

export function encodeCallback(orderId: number, actionKey: string): string {
  return `${PREFIX}:${orderId}:${actionKey}`;
}

/**
 * Returns null for anything that is not one of our order buttons — including
 * callbacks left over from an older deploy with a different encoding, which
 * must be answered politely rather than crash the webhook.
 */
export function decodeCallback(
  data: string
): { orderId: number; action: OrderAction } | null {
  const parts = data.split(":");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;

  const orderId = Number(parts[1]);
  if (!Number.isInteger(orderId) || orderId <= 0) return null;

  const action = findOrderAction(parts[2]);
  return action ? { orderId, action } : null;
}
