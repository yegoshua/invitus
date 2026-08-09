// What the customer is charged, and the only place the charged figure is
// decided. (The checkout summary renders the same number from the cart — it is
// what the customer reads, never what the card is debited.)
//
// The site does not charge for delivery at all: the customer pays Nova Poshta
// on collection, so the order total is the goods and nothing else. There was a
// flat 120 UAH fee here (lib/shipping.ts) added to the displayed total, to the
// KeyCRM order root and to the Monobank invoice; it is gone by decision, not
// zeroed out — see issue #31.

/** Just enough of a priced line to total it. */
interface Totalable {
  lineTotal: number;
}

export interface OrderTotals {
  subtotal: number;
  /** Equal to the subtotal — kept separate so callers read intent, not luck. */
  total: number;
  /** Total in copecks, for Monobank. */
  totalCopecks: number;
}

export function orderTotals(lines: readonly Totalable[]): OrderTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  return {
    subtotal,
    total: subtotal,
    // Per line, then summed — deliberately not Math.round(subtotal * 100).
    // Monobank rejects an invoice whose basket lines do not sum to the amount,
    // and the basket is built from the same per-line rounding (see
    // app/api/orders/route.ts). The two agree to the copeck on KeyCRM's
    // two-decimal prices; where they could not, the basket is what wins.
    totalCopecks: lines.reduce((sum, l) => sum + Math.round(l.lineTotal * 100), 0),
  };
}
