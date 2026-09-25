// What an order is, for the money: a Sale, an Open order, a Stuck order or a
// Cancelled order (see CONTEXT.md). Every rule about that lives here, pure,
// so it can be tested without KeyCRM.

import { kyivDay, type Day } from "./period.ts";

/** Orders before this day are not in the Admin at all (CONTEXT: Accounting start). */
export const ACCOUNTING_START: Day = "2026-01-01";

/** KeyCRM source "Сайт" — the previous shop. Never counted (CONTEXT: Legacy source). */
export const LEGACY_SOURCE_ID = 1;

export const SOURCE_LABELS: Record<number, string> = {
  2: "Instagram",
  3: "Новий сайт",
};

// Read from this account's /order/status.
const STATUS_COMPLETED = 12;
const STATUS_DELIVERED = 9;
const STATUS_AWAITING_REVIEW = 22; // «Отримати відгук»: the goods are with the customer
const GROUP_NEW = 1;
const GROUP_DELIVERY = 4;
const GROUP_CANCELLED = 6; // "closed, no sale"

/** How long an order may sit before it counts as Stuck. */
export const STUCK_AFTER_DAYS = { new: 3, delivered: 7, unpaid: 3, inTransit: 14 } as const;

export type OpenStage = "new" | "confirming" | "production" | "delivery" | "awaiting-payment";

export const STAGE_BY_GROUP: Record<number, OpenStage> = {
  1: "new",
  2: "confirming",
  3: "production",
  4: "delivery",
  5: "awaiting-payment", // completed, payment not marked
};

export const STAGE_LABELS: Record<OpenStage, string> = {
  new: "Нові",
  confirming: "Підтвердження",
  production: "Виробництво",
  delivery: "Доставка",
  "awaiting-payment": "Чекають оплати",
};

export interface OrderLine {
  name: string;
  quantity: number;
  /** Price per unit as sold, after line discounts. */
  price: number;
  size: string | null;
}

/** Just enough of a KeyCRM order to classify it. Dates are instants. */
export interface CrmOrder {
  id: number;
  sourceId: number;
  statusId: number;
  statusGroupId: number;
  paid: boolean;
  total: number;
  createdAt: Date;
  /** When the status last changed. */
  statusChangedAt: Date;
  /** When KeyCRM closed the order (completed or cancelled). */
  closedAt: Date | null;
  /** When the latest payment marked paid was recorded. */
  paidAt: Date | null;
  paymentMethod: string | null;
  lines: OrderLine[];
}

export type StuckReason = "new-too-long" | "in-transit-too-long" | "delivered-not-closed" | "completed-unpaid";

export const STUCK_REASON_LABELS: Record<StuckReason, string> = {
  "new-too-long": "Новий понад 3 дні",
  // Nova Poshta delivers in days; a waybill two weeks old was collected or
  // came back, and either way the CRM has not been told.
  "in-transit-too-long": "У дорозі понад 2 тижні",
  "delivered-not-closed": "Товар у покупця, не закрите",
  "completed-unpaid": "Виконане, оплату не відмічено",
};

export type OrderClass =
  | { kind: "sale"; saleDay: Day }
  | { kind: "cancelled" }
  | { kind: "open"; stage: OpenStage; stuck: { reason: StuckReason; days: number } | null };

/** Should this order be in the Admin at all? */
export function isCounted(order: CrmOrder): boolean {
  return order.sourceId !== LEGACY_SOURCE_ID && kyivDay(order.createdAt) >= ACCOUNTING_START;
}

function daysSince(then: Date, now: Date): number {
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

export function classifyOrder(order: CrmOrder, now: Date): OrderClass {
  if (order.statusGroupId === GROUP_CANCELLED) return { kind: "cancelled" };

  const completed = order.statusId === STATUS_COMPLETED;
  const completedAt = order.closedAt ?? order.statusChangedAt;

  if (completed && order.paid) {
    // A Sale happens when the second of "completed" and "paid" comes true.
    const paidAt = order.paidAt ?? completedAt;
    const saleAt = paidAt > completedAt ? paidAt : completedAt;
    return { kind: "sale", saleDay: kyivDay(saleAt) };
  }

  const stage = STAGE_BY_GROUP[order.statusGroupId] ?? "new";
  let stuck: { reason: StuckReason; days: number } | null = null;

  if (completed) {
    const days = daysSince(completedAt, now);
    if (days > STUCK_AFTER_DAYS.unpaid) stuck = { reason: "completed-unpaid", days };
  } else if (order.statusId === STATUS_DELIVERED || order.statusId === STATUS_AWAITING_REVIEW) {
    const days = daysSince(order.statusChangedAt, now);
    if (days > STUCK_AFTER_DAYS.delivered) stuck = { reason: "delivered-not-closed", days };
  } else if (order.statusGroupId === GROUP_DELIVERY) {
    const days = daysSince(order.statusChangedAt, now);
    if (days > STUCK_AFTER_DAYS.inTransit) stuck = { reason: "in-transit-too-long", days };
  } else if (order.statusGroupId === GROUP_NEW) {
    const days = daysSince(order.createdAt, now);
    if (days > STUCK_AFTER_DAYS.new) stuck = { reason: "new-too-long", days };
  }

  return { kind: "open", stage, stuck };
}
