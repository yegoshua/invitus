// The Orders and Products screens: which orders, which products, in what
// order. Pure, like the summary.

import { classifyOrder, isCounted, type CrmOrder, type OrderClass } from "./orders.ts";
import { orderFee, type ActualFee, type FeeRates, type OrderFee } from "./fees.ts";
import { inPeriod, kyivDay, type Day, type Period } from "./period.ts";

export type OrderStatusFilter = "sale" | "open" | "stuck" | "cancelled";

export interface OrderRow {
  order: CrmOrder;
  cls: OrderClass;
  status: OrderStatusFilter;
  placedDay: Day;
  /** Actual when the bank statement has it, else estimated; null for a cancelled order the bank took nothing for. */
  fee: OrderFee | null;
}

export function statusOf(cls: OrderClass): OrderStatusFilter {
  if (cls.kind === "open") return cls.stuck ? "stuck" : "open";
  return cls.kind;
}

/** Orders placed in the period, newest first, narrowed by the filters (empty = all). */
export function orderRows(
  orders: CrmOrder[],
  period: Period,
  now: Date,
  filters: { status: OrderStatusFilter[]; source: number[]; payment: number[] },
  fees: { rates: FeeRates; actual: ReadonlyMap<number, ActualFee> }
): OrderRow[] {
  return orders
    .filter(isCounted)
    .map((order) => {
      const cls = classifyOrder(order, now);
      const actual = fees.actual.get(order.id)?.kop;
      return {
        order,
        cls,
        status: statusOf(cls),
        placedDay: kyivDay(order.createdAt),
        fee: cls.kind === "cancelled" && actual === undefined ? null : orderFee(order, actual, fees.rates),
      };
    })
    .filter(
      (row) =>
        inPeriod(row.placedDay, period) &&
        (filters.status.length === 0 || filters.status.includes(row.status)) &&
        (filters.source.length === 0 || filters.source.includes(row.order.sourceId)) &&
        (filters.payment.length === 0 ||
          (row.order.paymentMethodId != null && filters.payment.includes(row.order.paymentMethodId)))
    )
    .sort((a, b) => b.order.id - a.order.id);
}

export interface ProductRank {
  name: string;
  quantity: number;
  revenue: number;
  picture: string | null;
  sizes: Array<{ size: string; quantity: number }>;
}

/** Products in the period's Sales, by revenue. Lines are priced as sold. */
export function productRanking(orders: CrmOrder[], period: Period, now: Date): ProductRank[] {
  const byName = new Map<string, ProductRank & { bySize: Map<string, number> }>();
  for (const order of orders) {
    if (!isCounted(order)) continue;
    const cls = classifyOrder(order, now);
    if (cls.kind !== "sale" || !inPeriod(cls.saleDay, period)) continue;
    for (const line of order.lines) {
      const p = byName.get(line.name) ??
        { name: line.name, quantity: 0, revenue: 0, picture: null, sizes: [], bySize: new Map() };
      p.quantity += line.quantity;
      p.revenue += line.price * line.quantity;
      p.picture ??= line.picture;
      if (line.size) p.bySize.set(line.size, (p.bySize.get(line.size) ?? 0) + line.quantity);
      byName.set(line.name, p);
    }
  }
  return [...byName.values()]
    .map(({ bySize, ...p }) => ({
      ...p,
      sizes: [...bySize.entries()].map(([size, quantity]) => ({ size, quantity })).sort((a, b) => b.quantity - a.quantity),
    }))
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);
}
