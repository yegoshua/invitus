import { test } from "node:test";
import assert from "node:assert/strict";

import { orderTotals } from "./order-totals.ts";

test("the total is the goods and nothing else — delivery is paid to the carrier", () => {
  const totals = orderTotals([{ lineTotal: 2400 }, { lineTotal: 1200 }]);

  assert.equal(totals.subtotal, 3600);
  assert.equal(totals.total, 3600);
});

test("the 0.50 UAH acquiring test order is charged 0.50 UAH", () => {
  const totals = orderTotals([{ lineTotal: 0.5 }]);

  assert.equal(totals.total, 0.5);
  assert.equal(totals.totalCopecks, 50);
});

test("the charged copecks are exactly what the invoice basket sums to", () => {
  // Monobank rejects an invoice whose basket lines do not add up to the amount,
  // and there is no shipping surcharge left to absorb a difference.
  const lines = [{ lineTotal: 0.333 }, { lineTotal: 0.333 }, { lineTotal: 0.334 }];
  const basket = lines.reduce((sum, l) => sum + Math.round(l.lineTotal * 100), 0);

  assert.equal(orderTotals(lines).totalCopecks, basket);
});

test("prices with two decimals total to the copeck", () => {
  assert.equal(orderTotals([{ lineTotal: 2400.5 }, { lineTotal: 99.99 }]).totalCopecks, 250049);
});
