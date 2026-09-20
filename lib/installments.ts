// «Покупка частинами» monobank — the rules, and nothing that talks to a server.
//
// Everything a page, the cart drawer, the checkout and the order endpoint need
// to agree on lives here: which part counts are offered, the order total under
// which the option is not offered at all, how a monthly figure is derived from
// a total, and what Monobank's order states mean for the customer. It is pure
// on purpose — the product page shows «Від 513 ₴ / міс», the cart shows
// «5 × 684 ₴», the summary shows «6 × 684 ₴» and the order is created with
// `available_parts_count: [6]`; four places, one arithmetic.
//
// The transport (HMAC signature, the four endpoints) is lib/monobank-parts.ts.
//
// The `.ts` extension on the import is deliberate: node:test runs this file
// directly with type stripping, which resolves relative specifiers literally.

import { formatPrice } from "./format.ts";

/**
 * The part counts the shop offers. Monobank itself allows 3–25; these three
 * are the design's, and they are what `available_parts_count` sends so the
 * customer sees the same choice in the app that they made on the checkout.
 */
export const PARTS_OPTIONS = [4, 6, 8] as const;
export type PartsCount = (typeof PARTS_OPTIONS)[number];

/** Pre-selected on the checkout and used for the cart drawer's breakdown. */
export const DEFAULT_PARTS: PartsCount = 6;

/**
 * The order total (goods less promo) below which instalments are not offered.
 *
 * One number, read by the product button, the cart, the checkout radio and the
 * order endpoint, so lowering the floor is a one-line change and cannot leave
 * a button on a page that the checkout then refuses. The figure is the one the
 * FAQ copy states («доступна для замовлень від 4 100 ₴»); Monobank's own
 * technical minimum is 2 ₴, so this is a shop decision, not a bank one.
 */
export const PARTS_MIN_TOTAL = 4100;

export function isPartsCount(value: unknown): value is PartsCount {
  return (PARTS_OPTIONS as readonly number[]).includes(value as number);
}

/** Whether a total qualifies for instalments at all. */
export function partsAvailable(total: number): boolean {
  return Number.isFinite(total) && total >= PARTS_MIN_TOTAL;
}

/**
 * One payment, in whole hryvnia, rounded *up*.
 *
 * Up rather than to nearest so the sum of the parts is never less than the
 * total — «6 × 683 ₴» for 4 100 ₴ would promise 4 098. Monobank decides the
 * real schedule; this is what the page says it will roughly be.
 */
export function monthlyPayment(total: number, parts: number): number {
  return Math.ceil(total / parts);
}

export interface PartsSchedule {
  parts: PartsCount;
  /** Each payment, including the first. */
  monthly: number;
  /** Payments after the first. */
  remainingCount: number;
}

export function partsSchedule(total: number, parts: PartsCount): PartsSchedule {
  return {
    parts,
    monthly: monthlyPayment(total, parts),
    remainingCount: parts - 1,
  };
}

/**
 * The smallest monthly figure the product can be had for, or null when the
 * price does not qualify — the product button is drawn only for a number.
 */
export function lowestMonthly(price: number): number | null {
  if (!partsAvailable(price)) return null;
  const longest = Math.max(...PARTS_OPTIONS);
  return monthlyPayment(price, longest);
}

/** «6 × 684 ₴» — the chip on the checkout. */
export function partsOptionLabel(total: number, parts: PartsCount): string {
  return `${parts} × ${formatPrice(monthlyPayment(total, parts))} ₴`;
}

/** «Від 513 ₴ / міс» — the product page button. Null when not offered. */
export function fromMonthlyLabel(price: number): string | null {
  const monthly = lowestMonthly(price);
  return monthly === null ? null : `Від ${formatPrice(monthly)} ₴ / міс`;
}

/** «5 × 684 ₴» — what is left after today's payment. */
export function remainingLabel(schedule: PartsSchedule): string {
  return `${schedule.remainingCount} × ${formatPrice(schedule.monthly)} ₴`;
}

// ── Phone ───────────────────────────────────────────────────────────────────

/**
 * Monobank wants «+380XXXXXXXXX» and nothing else; the checkout field holds
 * «+380 (67) 123 45 67». Only Ukrainian numbers are accepted — a foreign
 * number cannot have a Monobank account behind it, and refusing it here is a
 * clearer answer than CLIENT_NOT_FOUND from the bank five seconds later.
 */
export function partsPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^380\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+38${digits}`;
  return null;
}

// ── Monobank order states ───────────────────────────────────────────────────

export type PartsState = "IN_PROCESS" | "SUCCESS" | "FAIL";

/** What the state means to us. `approved` is the moment the order is financed. */
export type PartsOutcome = "pending" | "approved" | "failed";

export function partsOutcome(
  state: string | null | undefined,
  subState: string | null | undefined
): PartsOutcome {
  if (state === "SUCCESS") return "approved";
  if (state === "FAIL") return "failed";
  if (state === "IN_PROCESS" && subState === "WAITING_FOR_STORE_CONFIRM") {
    return "approved";
  }
  // IN_PROCESS/WAITING_FOR_CLIENT — and anything the bank adds later. A state
  // we do not know is not a refusal: telling the group «відхилив» on a schema
  // wobble is worse than a customer waiting out the result page's timeout.
  return "pending";
}

/**
 * The goods as Monobank's `products` want them: one line per unit price, and
 * summing exactly to `total`.
 *
 * Without a promo that is the catalogue lines as they are. With one, the
 * catalogue prices no longer add up to the figure being financed, so each
 * line is scaled by the discount and the rounding remainder lands on the last
 * one — sent with `count: 1` and its whole line total as `sum`, because a
 * per-unit price times a count cannot be made to hit an arbitrary total to
 * the copeck. Pure, so the arithmetic is tested rather than trusted.
 */
export function partsProducts(
  lines: ReadonlyArray<{
    name: string;
    size?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>,
  total: number
): Array<{ name: string; count: number; sum: number }> {
  const named = (line: { name: string; size?: string | null }) =>
    line.size ? `${line.name} (${line.size})` : line.name;
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  if (subtotal === total || subtotal === 0) {
    return lines.map((l) => ({ name: named(l), count: l.quantity, sum: l.unitPrice }));
  }

  const ratio = total / subtotal;
  let remaining = Math.round(total * 100);
  return lines.map((l, i) => {
    const last = i === lines.length - 1;
    const copecks = last
      ? remaining
      : Math.min(remaining, Math.round(l.lineTotal * ratio * 100));
    remaining -= copecks;
    return {
      name: l.quantity > 1 ? `${named(l)} × ${l.quantity}` : named(l),
      count: 1,
      sum: copecks / 100,
    };
  });
}

/**
 * Why the bank said no, in the customer's language. Every sub-state Monobank
 * documents has a line; anything new falls through to a generic one rather
 * than to an English constant on a payment screen.
 */
export function partsFailureMessage(subState: string | null | undefined): string {
  switch (subState) {
    case "CLIENT_NOT_FOUND":
      return "За цим номером немає клієнта monobank. Перевір номер або обери інший спосіб оплати.";
    case "EXCEEDED_SUM_LIMIT":
      return "Сума перевищує твій ліміт на покупку частинами в monobank. Спробуй меншу кількість платежів або інший спосіб оплати.";
    case "EXISTS_OTHER_OPEN_ORDER":
      return "У тебе вже є незавершена заявка на покупку частинами. Заверши або скасуй її в застосунку mono й спробуй знову за 15 хвилин.";
    case "NOT_ENOUGH_MONEY_FOR_INIT_DEBIT":
      return "На картці не вистачає коштів для першого платежу. Поповни картку й спробуй ще раз.";
    case "REJECTED_BY_CLIENT":
      return "Ти відхилив покупку частинами в застосунку. Можна спробувати ще раз або обрати інший спосіб оплати.";
    case "CLIENT_PUSH_TIMEOUT":
      return "Ми не дочекалися підтвердження в застосунку mono. Спробуй ще раз — цього разу зайди в застосунок одразу.";
    case "REJECTED_BY_STORE":
      return "Заявку скасовано магазином.";
    case "PAY_PARTS_ARE_NOT_ACCEPTABLE":
    case "FRAUD_REJECTED":
    case "RESTRICTED_BY_RISKS":
      return "monobank не погодив покупку частинами для цього замовлення. Обери інший спосіб оплати.";
    default:
      return "monobank не зміг оформити покупку частинами. Спробуй ще раз або обери інший спосіб оплати.";
  }
}
