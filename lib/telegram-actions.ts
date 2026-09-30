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
  /**
   * The press creates the Nova Poshta waybill itself, rather than recording
   * that someone made one by hand. The status write and the Monobank handover
   * happen only once the waybill exists.
   */
  createsWaybill?: boolean;
}

/** «Був зроблений ТТН» in this account — the status both waybill buttons set. */
export const WAYBILL_STATUS_ID = 8;
export const CANCELLED_STATUS_ID = 19;
const IN_WORK_STATUS_ID = 2;

export const ORDER_ACTIONS: readonly OrderAction[] = [
  { key: "wip", label: "✅ Взяв у роботу", statusId: IN_WORK_STATUS_ID, done: "взяв у роботу" },
  {
    key: "mkttn",
    label: "🚚 Створити ТТН",
    statusId: WAYBILL_STATUS_ID,
    done: "створив ТТН",
    parts: "confirm",
    createsWaybill: true,
  },
  {
    // Key unchanged so buttons already sitting in the chat keep working.
    key: "ttn",
    label: "📦 ТТН вже є",
    statusId: WAYBILL_STATUS_ID,
    done: "позначив, що ТТН створено вручну",
    parts: "confirm",
  },
  {
    key: "cancel",
    label: "❌ Скасувати",
    statusId: CANCELLED_STATUS_ID,
    done: "скасував",
    destructive: true,
    parts: "reject",
  },
];

/**
 * Which buttons an order still has, read from the CRM rather than from what was
 * pressed in the chat — a status changed by hand in KeyCRM takes its buttons
 * away just the same.
 *
 * Once there is a waybill, or the order is cancelled, there is nothing left to
 * do from the chat. Before that, «в роботі» hides only its own button: taking
 * an order is the first step, not the last.
 */
export function remainingActions(order: {
  statusId: number | null;
  hasWaybill: boolean;
}): OrderAction[] {
  if (order.hasWaybill) return [];
  if (order.statusId === WAYBILL_STATUS_ID || order.statusId === CANCELLED_STATUS_ID) {
    return [];
  }
  return ORDER_ACTIONS.filter(
    (a) => !(a.key === "wip" && order.statusId === IN_WORK_STATUS_ID)
  );
}

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

/**
 * May a button pressed in this chat act on an order? Only in the orders group.
 *
 * The Finance chat receives a copy of every new order *without* buttons, and
 * alerts may land there too; neither is a place to work orders from. Accepting
 * presses anywhere else would let the same order be actioned from two chats
 * (PRD #103, story 42). No orders group configured means no chat qualifies.
 */
export function acceptsOrderActionsFrom(
  chatId: number,
  env: Record<string, string | undefined> = process.env
): boolean {
  const orders = env.TELEGRAM_CHAT_ID;
  return Boolean(orders) && String(chatId) === orders;
}
