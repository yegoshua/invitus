import test from "node:test";
import assert from "node:assert/strict";

import { summarizeOrders, formatDigest, type DigestOrder } from "./digest.ts";

const order = (o: Partial<DigestOrder>): DigestOrder => ({
  id: 1,
  grand_total: 1000,
  status_id: 1,
  payment_status: "not_paid",
  ...o,
});

test("an empty day summarizes to zeroes rather than NaN", () => {
  const s = summarizeOrders([]);
  assert.equal(s.total, 0);
  assert.equal(s.revenue, 0);
  // revenue / 0 is NaN, which renders as "NaN ₴" in the group.
  assert.equal(s.averageCheck, 0);
});

test("cancelled orders are counted but leave revenue alone", () => {
  const s = summarizeOrders([
    order({ id: 1, grand_total: 1000 }),
    order({ id: 2, grand_total: 5000, status_id: 19 }),
  ]);
  assert.equal(s.total, 2);
  assert.equal(s.cancelled, 1);
  assert.equal(s.revenue, 1000);
  assert.equal(s.averageCheck, 1000);
});

test("paid and unpaid are split by payment_status", () => {
  const s = summarizeOrders([
    order({ id: 1, grand_total: 1000, payment_status: "paid" }),
    order({ id: 2, grand_total: 500 }),
  ]);
  assert.equal(s.paid, 1);
  assert.equal(s.paidRevenue, 1000);
  assert.equal(s.unpaid, 1);
});

test("KeyCRM's string totals are added as numbers, not concatenated", () => {
  // grand_total comes back as "10600.00" on some endpoints and 10600 on others.
  const s = summarizeOrders([
    order({ id: 1, grand_total: "1000.00" }),
    order({ id: 2, grand_total: "500.50" }),
  ]);
  assert.equal(s.revenue, 1500.5);
});

test("top products are ranked by quantity across orders", () => {
  const s = summarizeOrders([
    order({ id: 1, products: [{ name: "Пояс", quantity: 1 }] }),
    order({
      id: 2,
      products: [
        { name: "Пояс", quantity: 2 },
        { name: "Футболка", quantity: 4 },
      ],
    }),
  ]);
  assert.deepEqual(s.topProducts, [
    { name: "Футболка", quantity: 4 },
    { name: "Пояс", quantity: 3 },
  ]);
});

test("products from cancelled orders do not reach the top list", () => {
  const s = summarizeOrders([
    order({ id: 1, status_id: 19, products: [{ name: "Пояс", quantity: 99 }] }),
    order({ id: 2, products: [{ name: "Футболка", quantity: 1 }] }),
  ]);
  assert.deepEqual(s.topProducts, [{ name: "Футболка", quantity: 1 }]);
});

test("a blank day still produces a message", () => {
  // Silence would be indistinguishable from a broken cron.
  const text = formatDigest(summarizeOrders([]), "7 вересня");
  assert.match(text, /Замовлень не було/);
});

test("the cancelled line is omitted when nothing was cancelled", () => {
  const text = formatDigest(summarizeOrders([order({})]), "7 вересня");
  assert.doesNotMatch(text, /Скасовано/);
});
