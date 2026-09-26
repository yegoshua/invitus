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
  command: "track" | "trackCustom",
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
) => void;

/**
 * GA4 events Meta hears about, as a standard event where Meta has one (those
 * are what ads optimise for) and a custom one otherwise. The rest are GA-only.
 */
const META_EVENT_BY_GA: Partial<
  Record<GAEventName, { command: "track" | "trackCustom"; name: string }>
> = {
  view_item: { command: "track", name: "ViewContent" },
  add_to_cart: { command: "track", name: "AddToCart" },
  begin_checkout: { command: "track", name: "InitiateCheckout" },
  purchase: { command: "track", name: "Purchase" },
  generate_lead: { command: "track", name: "Lead" },
  custom_belt_card_click: { command: "trackCustom", name: "CustomBeltCardClick" },
  custom_belt_artwork_upload: { command: "trackCustom", name: "CustomBeltArtworkUpload" },
  custom_belt_prompt_copy: { command: "trackCustom", name: "CustomBeltPromptCopy" },
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
  const meta = META_EVENT_BY_GA[name];
  if (!meta || typeof window === "undefined") return;

  const fbq = (window as unknown as { fbq?: FbqFn }).fbq;
  if (!fbq) return;

  if (meta.command === "trackCustom") {
    fbq("trackCustom", meta.name, {});
    return;
  }

  // A lead is not a product: no content_ids, or Meta reads it as a catalogue
  // event for a product that does not exist. No currency either — it carries
  // no value for one to qualify.
  if ("lead_source" in params) {
    fbq("track", meta.name, { content_name: params.lead_source });
    return;
  }

  const metaName = meta.name;
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
