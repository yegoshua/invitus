// Meta Pixel — rides on the GA4 funnel instead of being wired separately.
//
// `trackEvent` in lib/gtag.ts is the only analytics sender, and it forwards
// here. Mapping GA4 names → Meta standard events in one table is what keeps
// the two tools from counting different funnels: a call site cannot fire one
// without the other.
//
// window.fbq exists only on the canonical production host (the stub in
// components/analytics/meta-pixel.tsx decides). Everywhere else this no-ops.

import type { GAEventMap, GAEventName, GAItem } from "./gtag.ts";

export const META_PIXEL_ID = "1078690034571892";

type FbqFn = (
  command: "track",
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
) => void;

/** GA4 events Meta has a standard counterpart for; the rest are GA-only. */
const META_EVENT_BY_GA: Partial<Record<GAEventName, string>> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

function contents(items: GAItem[]) {
  return items.map((i) => ({
    id: i.item_id,
    quantity: i.quantity,
    item_price: i.price,
  }));
}

export function trackMetaEvent<E extends GAEventName>(
  name: E,
  params: GAEventMap[E] & { currency: string }
): void {
  const metaName = META_EVENT_BY_GA[name];
  if (!metaName || typeof window === "undefined") return;

  const fbq = (window as unknown as { fbq?: FbqFn }).fbq;
  if (!fbq) return;

  const items = "items" in params ? params.items : [];
  const payload: Record<string, unknown> = {
    currency: params.currency,
    content_type: "product",
    content_ids: items.map((i) => i.item_id),
    contents: contents(items),
  };
  if ("value" in params) payload.value = params.value;
  if (items.length > 0) payload.num_items = items.reduce((n, i) => n + i.quantity, 0);

  // A Purchase carries the order id as its eventID so that a later
  // server-side Conversions API event for the same order is deduplicated
  // by Meta instead of counted twice.
  if ("transaction_id" in params) {
    fbq("track", metaName, payload, { eventID: `purchase_${params.transaction_id}` });
    return;
  }
  fbq("track", metaName, payload);
}
