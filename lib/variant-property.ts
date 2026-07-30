// Which KeyCRM offer property holds the thing a customer picks.
//
// KeyCRM has no concept of "the size axis". Every offer just carries free-text
// properties, and this catalogue uses two of them: belts, knee sleeves and
// straps are sold by "Розмір", wrist wraps by "Довжина" (they differ in length,
// not size, and KeyCRM is right to say so).
//
// Both readers live here because they must never disagree: lib/api.ts builds
// the size selector from this, and lib/orders.ts matches the ordered size back
// to an offer with it. If one learned about a property the other didn't, the
// page would offer a size the checkout then rejected.
//
// A property outside this list is a data error, not a third axis — Guts Lifting
// Belt currently files S/M/L under "Колір", which is why it shows no sizes at
// all. Accepting any property whatsoever would paper over that, at the cost of
// reading a genuine colour variant as a size somewhere else later.
//
// Deliberately free of Strapi and of lib/api.ts: lib/orders.ts imports it, and
// the payment path must not gain a dependency on the CMS.

import type { KeyCrmOffer } from "./keycrm-schema";

export const VARIANT_PROPERTY_NAMES = ["Розмір", "Довжина"] as const;

export interface OfferVariant {
  /** The KeyCRM property name, echoed back when the order is created. */
  property: string;
  /** What the customer picks, e.g. "S" or "55см". */
  value: string;
}

/** First recognised variant property on the offer, or undefined if none is. */
export function readOfferVariant(offer: KeyCrmOffer): OfferVariant | undefined {
  for (const property of VARIANT_PROPERTY_NAMES) {
    const match = offer.properties.find((p) => p.name === property);
    if (match?.value) return { property, value: match.value };
  }
  return undefined;
}
