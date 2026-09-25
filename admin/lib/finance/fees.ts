// Payment fees (CONTEXT: Payment fee). Pure: the bank statement and the
// rates are read elsewhere (lib/fees/store.ts) and handed in.
//
// A fee is **actual** when Monobank's statement reported it for the order's
// invoice, and **estimated** otherwise — the payment method's rate × the
// order total. The estimate is always shown as one ("≈").
//
// Kopecks throughout, like Expenses: a sum of integers does not drift.

import { classifyOrder, isCounted, type CrmOrder } from "./orders.ts";
import { inPeriod, previousPeriod, type Day, type Period } from "./period.ts";

/** Payment method id → percent of the order total the bank keeps. */
export type FeeRates = Readonly<Record<number, number>>;

/**
 * The rates the Admin starts with, and falls back to when there is no
 * database. db/migrations/0002 seeds `fee_rates` with the same numbers; after
 * that the owner edits them on the Expenses page. Card and Apple/Google Pay
 * are Monobank's published acquiring rate, «Оплата частинами» its published
 * rate for 3 parts; cash on delivery is 0 until who pays Nova Poshta's
 * transfer fee is settled.
 */
export const DEFAULT_FEE_PERCENT: FeeRates = { 1: 0, 2: 1.3, 3: 0, 6: 0, 7: 1.3, 9: 3.5 };

export type OrderFee = { kind: "actual"; kop: number } | { kind: "estimated"; kop: number; percent: number };

/**
 * `percent` of a hryvnia total, in whole kopecks: total × 100 kop × percent / 100.
 * Rounded at twelve significant digits first, so 57.4999999 — a float's
 * reading of 57.5 — rounds as the 57.5 it is.
 */
export function estimateFeeKop(totalUah: number, percent: number): number {
  return Math.round(Number((totalUah * percent).toPrecision(12)));
}

/** The fee for one order: the bank's figure if there is one, else the estimate. */
export function orderFee(
  order: { total: number; paymentMethodId: number | null },
  actualKop: number | undefined,
  rates: FeeRates
): OrderFee {
  if (actualKop !== undefined) return { kind: "actual", kop: actualKop };
  const percent = (order.paymentMethodId != null && rates[order.paymentMethodId]) || 0;
  return { kind: "estimated", kop: estimateFeeKop(order.total, percent), percent };
}

export interface ActualFee {
  kop: number;
  /** The Kyiv day of the latest payment. */
  paidOn: Day;
}

/**
 * Statement rows by KeyCRM order. An order the customer paid twice (a retry,
 * a second invoice) has both fees; a row that names no order of ours is left
 * out — there is no order for it to belong to.
 */
export function actualFeesByOrder(
  rows: ReadonlyArray<{ orderId: number | null; feeKop: number; paidOn: Day }>
): Map<number, ActualFee> {
  const byOrder = new Map<number, ActualFee>();
  for (const r of rows) {
    if (r.orderId === null) continue;
    const seen = byOrder.get(r.orderId);
    byOrder.set(r.orderId, {
      kop: (seen?.kop ?? 0) + r.feeKop,
      paidOn: seen && seen.paidOn > r.paidOn ? seen.paidOn : r.paidOn,
    });
  }
  return byOrder;
}

export interface FeeSummary {
  /** Hryvnias, like the rest of the page. */
  total: number;
  actual: number;
  estimated: number;
  previousTotal: number;
  byDay: Array<{ day: Day; total: number }>;
}

/**
 * A period's Payment fees, the figure Profit subtracts. A Sale's fee lands on
 * its sale day, next to the Revenue it was taken from. A Cancelled order has
 * no Revenue, but if the bank reported a fee for it the bank kept that money,
 * so it lands on the day it was paid. An Open order's fee waits for it to
 * become one or the other: counting it now would move it between periods later.
 */
export function periodFees(
  orders: CrmOrder[],
  actual: ReadonlyMap<number, ActualFee>,
  rates: FeeRates,
  period: Period,
  now: Date
): FeeSummary {
  const previous = previousPeriod(period);
  let actualKop = 0, estimatedKop = 0, previousKop = 0;
  const byDay = new Map<Day, number>();

  for (const order of orders) {
    if (!isCounted(order)) continue;
    const cls = classifyOrder(order, now);
    const known = actual.get(order.id);
    let day: Day, fee: OrderFee;
    if (cls.kind === "sale") {
      day = cls.saleDay;
      fee = orderFee(order, known?.kop, rates);
    } else if (cls.kind === "cancelled" && known) {
      day = known.paidOn;
      fee = { kind: "actual", kop: known.kop };
    } else continue;

    if (inPeriod(day, previous)) previousKop += fee.kop;
    if (!inPeriod(day, period)) continue;
    if (fee.kind === "actual") actualKop += fee.kop;
    else estimatedKop += fee.kop;
    byDay.set(day, (byDay.get(day) ?? 0) + fee.kop);
  }

  return {
    total: uah(actualKop + estimatedKop),
    actual: uah(actualKop),
    estimated: uah(estimatedKop),
    previousTotal: uah(previousKop),
    byDay: [...byDay.entries()]
      .filter(([, kop]) => kop !== 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, kop]) => ({ day, total: uah(kop) })),
  };
}

const uah = (kop: number) => kop / 100;
