// How much of a KeyCRM offer is actually sellable.
//
// Lives on its own for the same reason lib/variant-property.ts does: the size
// selector and the order pricer must not be able to disagree about what is in
// stock. A size the page shows as available and a size /order accepts are the
// same arithmetic, in one place.
//
// `quantity` is what sits on the shelf and `in_reserve` is what is already
// promised to an existing order, so the sellable figure is the difference.
// KeyCRM does not reserve on our orders today (they arrive with
// `stock_status: null`), which makes in_reserve normally 0 — subtracting it
// anyway costs nothing and stops the day reservation is switched on from
// silently overselling.
import type { KeyCrmOffer } from "./keycrm-schema";

export function availableStock(offer: KeyCrmOffer): number {
  return Math.max(0, offer.quantity - (offer.in_reserve ?? 0));
}
