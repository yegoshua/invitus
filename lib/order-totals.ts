// What the customer is charged, and the only place the charged figure is
// decided. (The checkout summary renders the same number from the cart — it is
// what the customer reads, never what the card is debited.)
//
// The site does not charge for delivery at all: the customer pays Nova Poshta
// on collection, so the order total is the goods and nothing else. There was a
// flat 120 UAH fee here (lib/shipping.ts) added to the displayed total, to the
// KeyCRM order root and to the Monobank invoice; it is gone by decision, not
// zeroed out — see issue #31.
//
// A promo discount is therefore the only thing between the goods and the total,
// and it is passed in already decided: what a code is worth is lib/promo.ts's
// judgement, not this module's.

/** Just enough of a priced line to total it. */
interface Totalable {
  lineTotal: number;
}

export interface OrderTotals {
  subtotal: number;
  /** Promo discount in UAH, already clamped to the subtotal. Zero when none. */
  discount: number;
  /** Goods minus the discount — the figure the customer is charged. */
  total: number;
  /** Total in copecks, for Monobank. */
  totalCopecks: number;
  /** The discount in copecks, for the basket-level Monobank discount line. */
  discountCopecks: number;
}

/**
 * `discount` comes from lib/promo.ts, which has already rounded and clamped it.
 * It is clamped again here anyway: this is the function that decides what a
 * card is debited, and it should be impossible to charge a negative amount from
 * anywhere, not merely unlikely given the current callers.
 */
export function orderTotals(
  lines: readonly Totalable[],
  discount = 0
): OrderTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const applied = Math.min(Math.max(discount, 0), subtotal);

  // Per line, then summed — deliberately not Math.round(subtotal * 100).
  // Monobank rejects an invoice whose basket lines do not sum to the amount,
  // and the basket is built from the same per-line rounding (see
  // app/api/orders/route.ts). The two agree to the copeck on KeyCRM's
  // two-decimal prices; where they could not, the basket is what wins.
  const goodsCopecks = lines.reduce(
    (sum, l) => sum + Math.round(l.lineTotal * 100),
    0
  );
  const discountCopecks = Math.min(Math.round(applied * 100), goodsCopecks);

  return {
    subtotal,
    discount: applied,
    total: subtotal - applied,
    totalCopecks: goodsCopecks - discountCopecks,
    discountCopecks,
  };
}
