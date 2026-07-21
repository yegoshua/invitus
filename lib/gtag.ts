// GA4 e-commerce analytics — single typed entry point.
//
// `GAEventMap` is the source of truth for every event this app sends and its
// exact payload; `trackEvent` is the only sender. Adding a new event = adding
// a map entry — the compiler then enforces the payload shape at call sites.
//
// window.gtag exists only in production (see
// components/analytics/google-analytics.tsx). Elsewhere trackEvent no-ops,
// and in development it console.debugs so wiring is verifiable locally.
//
// `value` is always in UAH (Monobank copeck amounts are converted before
// being passed in); `currency` is injected here so call sites never repeat it.

import type { CartItem, Product } from "@/types";

const CURRENCY = "UAH";

export interface GAItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  index?: number;
  price: number;
  quantity: number;
}

/** Monetary events: cart/checkout funnel. */
type ValuePayload = {
  value: number;
  items: GAItem[];
};

/** List events: catalog impressions & clicks. */
type ListPayload = {
  item_list_name?: string;
  items: GAItem[];
};

// Note: payloads are `type` aliases (not interfaces) so they satisfy
// gtag's Record<string, unknown> parameter via implicit index signatures.
export type GAEventMap = {
  view_item_list: ListPayload;
  select_item: ListPayload;
  view_item: ValuePayload;
  add_to_cart: ValuePayload;
  remove_from_cart: ValuePayload;
  view_cart: ValuePayload;
  begin_checkout: ValuePayload;
  purchase: ValuePayload & { transaction_id: string; shipping?: number };
};

export type GAEventName = keyof GAEventMap;

type GtagFn = (
  command: "event",
  eventName: string,
  params?: Record<string, unknown>
) => void;

export function trackEvent<E extends GAEventName>(
  name: E,
  params: GAEventMap[E]
): void {
  const payload = { currency: CURRENCY, ...params };
  const gtag =
    typeof window === "undefined"
      ? undefined
      : (window as unknown as { gtag?: GtagFn }).gtag;

  if (gtag) {
    gtag("event", name, payload);
  } else if (process.env.NODE_ENV !== "production") {
    console.debug("[ga4]", name, payload);
  }
}

// ── Domain → GA4 payload builders ──────────────────────────────────────────

export function gaItem(
  product: Product,
  opts?: { size?: string; quantity?: number; index?: number }
): GAItem {
  return {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    item_variant: opts?.size,
    index: opts?.index,
    price: product.price,
    quantity: opts?.quantity ?? 1,
  };
}

export function gaItems(items: CartItem[]): GAItem[] {
  return items.map((i) =>
    gaItem(i.product, { size: i.size, quantity: i.quantity })
  );
}

export function cartValue(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
}
