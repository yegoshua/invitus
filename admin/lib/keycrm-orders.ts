// KeyCRM → CrmOrder. Reads only; the Admin never writes to KeyCRM (PRD #103).

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { fetchKeyCrmAll } from "@site/lib/keycrm";
import { ACCOUNTING_START, type CrmOrder } from "@/lib/finance/orders";

interface RawOrder {
  id: number;
  source_id: number;
  status_id: number;
  status_group_id: number;
  payment_status: string | null;
  grand_total: number | string;
  created_at: string;
  status_changed_at: string | null;
  closed_at: string | null;
  payments?: Array<{ status: string; payment_date: string | null; payment_method_id: number | null }>;
  products?: Array<{
    name: string;
    quantity: number;
    price_sold: number | string | null;
    sku?: string | null;
    picture?: { thumbnail?: string | null } | null;
    price: number | string;
    properties?: Array<{ name: string; value: string }> | null;
  }>;
}

// KeyCRM sends money as both 4100 and "4100.00".
function amount(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(n) ? n : 0;
}

function date(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// The variant axis is a free-text property name per offer (CLAUDE.md).
const SIZE_PROPERTIES = new Set(["Розмір", "Довжина"]);

export function toCrmOrder(raw: RawOrder): CrmOrder {
  const createdAt = date(raw.created_at) ?? new Date(0);
  const paidDates = (raw.payments ?? [])
    .filter((p) => p.status === "paid")
    .map((p) => date(p.payment_date))
    .filter((d): d is Date => d !== null);
  return {
    id: raw.id,
    sourceId: raw.source_id,
    statusId: raw.status_id,
    statusGroupId: raw.status_group_id,
    paid: raw.payment_status === "paid",
    total: amount(raw.grand_total),
    createdAt,
    statusChangedAt: date(raw.status_changed_at) ?? createdAt,
    closedAt: date(raw.closed_at),
    paidAt: paidDates.length ? new Date(Math.max(...paidDates.map((d) => d.getTime()))) : null,
    paymentMethodId: raw.payments?.[0]?.payment_method_id ?? null,
    lines: (raw.products ?? []).map((p) => ({
      name: p.name,
      quantity: p.quantity || 0,
      price: amount(p.price_sold ?? p.price),
      size: p.properties?.find((prop) => SIZE_PROPERTIES.has(prop.name))?.value ?? null,
      sku: p.sku ?? null,
      picture: p.picture?.thumbnail ?? null,
    })),
  };
}

// Cached as raw JSON together with the moment it was read, so the sidebar can
// say how fresh the numbers are. Five minutes: fresh enough to act on, and a
// page switch does not spend another round of KeyCRM's 60-a-minute budget.
const loadRaw = unstable_cache(
  async () => ({
    raw: await fetchKeyCrmAll<RawOrder>("/order", {
      params: {
        include: "products,payments",
        "filter[created_between]": `${ACCOUNTING_START} 00:00:00,2100-01-01 00:00:00`,
      },
      revalidate: 0,
    }),
    fetchedAt: Date.now(),
  }),
  ["admin-orders"],
  { revalidate: 300, tags: ["admin-orders"] }
);

export type OrdersResult =
  | { ok: true; orders: CrmOrder[]; fetchedAt: Date }
  | { ok: false; orders: CrmOrder[]; fetchedAt: null };

/**
 * Every order since the accounting start — a few dozen a year, one or two
 * pages. Deduplicated per request, so the layout's sync badge and the page
 * share one read. A KeyCRM failure is a value, not a throw: the page shows a
 * banner over what it has.
 */
export const loadOrders = cache(async (): Promise<OrdersResult> => {
  try {
    const { raw, fetchedAt } = await loadRaw();
    return { ok: true, orders: raw.map(toCrmOrder), fetchedAt: new Date(fetchedAt) };
  } catch (error) {
    console.error("[admin] KeyCRM orders failed:", error);
    return { ok: false, orders: [], fetchedAt: null };
  }
});
