// KeyCRM → CrmOrder. Reads only; the Admin never writes to KeyCRM (PRD #103).

import { cache } from "react";
import { fetchKeyCrm, KEYCRM_PAGE_LIMIT } from "@site/lib/keycrm";
import type { KeyCrmPaginated } from "@site/lib/keycrm-schema";
import { freshCache, type Snapshot } from "@/lib/live/fresh-cache";
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

// KeyCRM is read on every page open (#124), through a 20-second in-memory
// copy: long enough that moving between tabs does not spend another round of
// the 60-a-minute budget, short enough that a reload shows the order placed a
// minute ago. When KeyCRM fails the last good copy is served, dated — see
// lib/live/fresh-cache.ts for why this is not unstable_cache.
const ORDERS_TTL_MS = 20_000;
// KeyCRM is single-homed and fails as a connect timeout (root CLAUDE.md), and
// fetchKeyCrm retries that for up to ~25 s. With a last good copy in hand a
// page waits 5 s at most, and after a failure KeyCRM is left alone for a minute.
const ORDERS_WAIT_MS = 5_000;
const ORDERS_BACKOFF_MS = 60_000;

const ORDER_PARAMS = {
  include: "products,payments",
  "filter[created_between]": `${ACCOUNTING_START} 00:00:00,2100-01-01 00:00:00`,
};

/**
 * Every page of /order. The first page says how many there are; the rest are
 * read in parallel — three pages today, three requests either way, so the
 * rate limit sees the same count, only sooner.
 */
async function fetchAllOrders(): Promise<RawOrder[]> {
  const page = (n: number) =>
    fetchKeyCrm<KeyCrmPaginated<RawOrder>>("/order", {
      params: { ...ORDER_PARAMS, limit: String(KEYCRM_PAGE_LIMIT), page: String(n) },
      revalidate: 0,
    });
  const first = await page(1);
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.last_page - 1) }, (_, i) => page(i + 2)));
  return [first, ...rest].flatMap((p) => p.data);
}

const orders = freshCache({
  load: async () => (await fetchAllOrders()).map(toCrmOrder),
  ttlMs: ORDERS_TTL_MS,
  waitMs: ORDERS_WAIT_MS,
  backoffMs: ORDERS_BACKOFF_MS,
});

export type OrdersResult =
  /** `error` is set when KeyCRM failed and these are the orders as of `fetchedAt`. */
  | { ok: true; orders: CrmOrder[]; fetchedAt: Date; error: string | null }
  | { ok: false; orders: CrmOrder[]; fetchedAt: null; error: string };

function toResult(snapshot: Snapshot<CrmOrder[]>): OrdersResult {
  if (snapshot.error) console.error("[admin] KeyCRM orders failed:", snapshot.error);
  return snapshot.value === null
    ? { ok: false, orders: [], fetchedAt: null, error: snapshot.error }
    : { ok: true, orders: snapshot.value, fetchedAt: snapshot.at, error: snapshot.error };
}

/**
 * Every order since the accounting start — a few dozen a year, a few pages.
 * Deduplicated per request, so the layout's sync badge and the page share one
 * read. A KeyCRM failure is a value, not a throw: the page shows a banner over
 * the last good copy, or over nothing when there never was one.
 */
export const loadOrders = cache(async (): Promise<OrdersResult> => toResult(await orders.get()));

/** «Оновити зараз»: read KeyCRM now, whatever the copy's age. */
export async function reloadOrders(): Promise<OrdersResult> {
  return toResult(await orders.get({ force: true }));
}
