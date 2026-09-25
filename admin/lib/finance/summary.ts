// The numbers on the Overview for one period. Pure: orders in, figures out.

import {
  classifyOrder,
  isCounted,
  SOURCE_LABELS,
  type CrmOrder,
  type OpenStage,
  type StuckReason,
} from "./orders.ts";
import { inPeriod, kyivDay, previousPeriod, type Day, type Period } from "./period.ts";

export interface SourceFigures {
  sourceId: number;
  label: string;
  sales: number;
  revenue: number;
}

export interface StuckOrder {
  id: number;
  reason: StuckReason;
  days: number;
  total: number;
  sourceLabel: string;
}

export interface PeriodSummary {
  period: Period;
  revenue: number;
  sales: number;
  averageCheck: number;
  previous: { period: Period; revenue: number; sales: number };
  /** Orders placed in the period, whatever became of them. */
  placed: { count: number; total: number; cancelled: number };
  bySource: SourceFigures[];
  revenueByDay: Array<{ day: Day; revenue: number }>;
  /** Orders placed that day that are still open (stuck included) — "in progress". */
  openByDay: Array<{ day: Day; total: number }>;
  /** Open orders right now — not bound to the period. */
  open: { count: number; total: number; byStage: Array<{ stage: OpenStage; count: number; total: number }> };
  /** Stuck orders right now, longest-waiting first. */
  stuck: StuckOrder[];
}

function sourceLabel(sourceId: number): string {
  return SOURCE_LABELS[sourceId] ?? `Джерело ${sourceId}`;
}

export function summarize(orders: CrmOrder[], period: Period, now: Date): PeriodSummary {
  const previous = previousPeriod(period);
  const counted = orders.filter(isCounted).map((order) => ({ order, cls: classifyOrder(order, now) }));

  let revenue = 0, sales = 0, prevRevenue = 0, prevSales = 0;
  const bySource = new Map<number, SourceFigures>();
  const byDay = new Map<Day, number>();
  const openByDay = new Map<Day, number>();
  const placed = { count: 0, total: 0, cancelled: 0 };
  const stages = new Map<OpenStage, { count: number; total: number }>();
  const stuck: StuckOrder[] = [];

  for (const { order, cls } of counted) {
    if (inPeriod(kyivDay(order.createdAt), period)) {
      placed.count += 1;
      placed.total += order.total;
      if (cls.kind === "cancelled") placed.cancelled += 1;
    }

    if (cls.kind === "sale") {
      if (inPeriod(cls.saleDay, period)) {
        revenue += order.total;
        sales += 1;
        byDay.set(cls.saleDay, (byDay.get(cls.saleDay) ?? 0) + order.total);
        const source = bySource.get(order.sourceId) ??
          { sourceId: order.sourceId, label: sourceLabel(order.sourceId), sales: 0, revenue: 0 };
        source.sales += 1;
        source.revenue += order.total;
        bySource.set(order.sourceId, source);
      } else if (inPeriod(cls.saleDay, previous)) {
        prevRevenue += order.total;
        prevSales += 1;
      }
    }

    if (cls.kind === "open") {
      const placedDay = kyivDay(order.createdAt);
      if (inPeriod(placedDay, period)) openByDay.set(placedDay, (openByDay.get(placedDay) ?? 0) + order.total);
      const stage = stages.get(cls.stage) ?? { count: 0, total: 0 };
      stage.count += 1;
      stage.total += order.total;
      stages.set(cls.stage, stage);
      if (cls.stuck) {
        stuck.push({ id: order.id, ...cls.stuck, total: order.total, sourceLabel: sourceLabel(order.sourceId) });
      }
    }
  }

  const openList = [...stages.entries()].map(([stage, v]) => ({ stage, ...v }));
  return {
    period,
    revenue,
    sales,
    averageCheck: sales > 0 ? Math.round(revenue / sales) : 0,
    previous: { period: previous, revenue: prevRevenue, sales: prevSales },
    placed,
    bySource: [...bySource.values()].sort((a, b) => b.revenue - a.revenue),
    revenueByDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, revenue]) => ({ day, revenue })),
    openByDay: [...openByDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, total]) => ({ day, total })),
    open: {
      count: openList.reduce((n, s) => n + s.count, 0),
      total: openList.reduce((n, s) => n + s.total, 0),
      byStage: openList,
    },
    stuck: stuck.sort((a, b) => b.days - a.days || a.id - b.id),
  };
}

/** Relative change, or null when there is nothing to compare against. */
export function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}
