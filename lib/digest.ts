// The daily digest: what happened in the shop today.
//
// Split in two on purpose. `summarizeOrders` is pure — it takes the orders and
// returns the numbers, and every rule about what counts (a cancelled order is
// not a sale; an unpaid COD order is not a debt) lives there where it can be
// tested. Fetching and sending live in the route.
//
// No imports beyond formatting: node:test runs this file directly.

import { formatPriceWithCurrency } from "./format.ts";
import { escapeHtml } from "./telegram.ts";

/** Just enough of a KeyCRM order to summarize it. */
export interface DigestOrder {
  id: number;
  grand_total: number | string;
  status_id: number | null;
  payment_status?: string | null;
  products?: Array<{ name: string; quantity: number }>;
}

/**
 * KeyCRM status ids that mean the order is dead. Read from this account's
 * /order/status: group 6 is the "closed, no sale" group.
 */
export const CANCELLED_STATUS_IDS = new Set([13, 14, 15, 16, 17, 18, 19]);

export interface DigestSummary {
  total: number;
  revenue: number;
  paid: number;
  paidRevenue: number;
  unpaid: number;
  cancelled: number;
  averageCheck: number;
  topProducts: Array<{ name: string; quantity: number }>;
}

function amount(value: number | string): number {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function summarizeOrders(orders: DigestOrder[]): DigestSummary {
  // Cancelled orders are excluded from revenue but still counted and shown:
  // "12 замовлень, 3 скасовано" is a different day from "9 замовлень", and
  // hiding the difference hides a problem worth seeing.
  const live = orders.filter(
    (o) => o.status_id === null || !CANCELLED_STATUS_IDS.has(o.status_id)
  );
  const cancelled = orders.length - live.length;

  const revenue = live.reduce((sum, o) => sum + amount(o.grand_total), 0);
  const paidOrders = live.filter((o) => o.payment_status === "paid");
  const paidRevenue = paidOrders.reduce((sum, o) => sum + amount(o.grand_total), 0);

  const byProduct = new Map<string, number>();
  for (const order of live) {
    for (const p of order.products ?? []) {
      byProduct.set(p.name, (byProduct.get(p.name) ?? 0) + (p.quantity || 0));
    }
  }
  const topProducts = [...byProduct.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
    .slice(0, 3);

  return {
    total: orders.length,
    revenue,
    paid: paidOrders.length,
    paidRevenue,
    unpaid: live.length - paidOrders.length,
    cancelled,
    averageCheck: live.length > 0 ? Math.round(revenue / live.length) : 0,
    topProducts,
  };
}

export function formatDigest(summary: DigestSummary, dateLabel: string): string {
  if (summary.total === 0) {
    // A blank day still gets a message. Silence is ambiguous — it reads the
    // same as a broken cron, which is the thing this would be used to notice.
    return `📊 <b>Підсумок за ${escapeHtml(dateLabel)}</b>\n\nЗамовлень не було.`;
  }

  const parts = [
    `📊 <b>Підсумок за ${escapeHtml(dateLabel)}</b>`,
    "",
    `Замовлень: <b>${summary.total}</b>`,
    `Сума: <b>${formatPriceWithCurrency(summary.revenue)}</b>`,
    `Середній чек: ${formatPriceWithCurrency(summary.averageCheck)}`,
    "",
    `✅ Оплачено: ${summary.paid} — ${formatPriceWithCurrency(summary.paidRevenue)}`,
    `⏳ Не оплачено: ${summary.unpaid}`,
  ];

  if (summary.cancelled > 0) {
    parts.push(`❌ Скасовано: ${summary.cancelled}`);
  }

  if (summary.topProducts.length > 0) {
    parts.push("");
    parts.push("<b>Топ товарів</b>");
    for (const p of summary.topProducts) {
      parts.push(`• ${escapeHtml(p.name)} — ${p.quantity} шт`);
    }
  }

  return parts.join("\n");
}
