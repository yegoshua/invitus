import assert from "node:assert/strict";
import { test } from "node:test";
import { order, sale } from "./fixtures.ts";
import { classifyOrder, isCounted, STUCK_AFTER_DAYS } from "./orders.ts";

const NOW = new Date("2026-09-25T12:00:00Z");
const daysAgo = (n: number, extraHours = 0) => new Date(NOW.getTime() - (n * 24 + extraHours) * 3_600_000);

test("completed and paid is a Sale, dated by whichever came second", () => {
  // Paid online on the 5th, delivered and completed on the 12th.
  assert.deepEqual(
    classifyOrder(sale("2026-09-12T09:00:00Z", "2026-09-05T09:00:00Z"), NOW),
    { kind: "sale", saleDay: "2026-09-12" }
  );
  // Completed on the 1st, cash on delivery marked paid on the 5th.
  assert.deepEqual(
    classifyOrder(sale("2026-09-01T09:00:00Z", "2026-09-05T09:00:00Z"), NOW),
    { kind: "sale", saleDay: "2026-09-05" }
  );
});

test("the sale day is the Kyiv day, not the UTC one", () => {
  // 22:30 UTC on the 30th is 01:30 on the 1st in Kyiv — next month.
  assert.deepEqual(
    classifyOrder(sale("2026-08-31T22:30:00Z", "2026-08-31T22:30:00Z"), NOW),
    { kind: "sale", saleDay: "2026-09-01" }
  );
});

test("paid but not completed is open, however long ago it was paid", () => {
  const cls = classifyOrder(order({ statusId: 8, statusGroupId: 4, paid: true, paidAt: daysAgo(30) }), NOW);
  assert.equal(cls.kind, "open");
});

test("any status in the no-sale group is Cancelled, paid or not", () => {
  for (const statusId of [13, 16, 19]) {
    assert.deepEqual(classifyOrder(order({ statusId, statusGroupId: 6, paid: true }), NOW), { kind: "cancelled" });
  }
});

test("completed without a payment is stuck only after the grace period", () => {
  const at = (days: number) =>
    classifyOrder(order({ statusId: 12, statusGroupId: 5, closedAt: daysAgo(days, 1) }), NOW);
  assert.deepEqual(at(STUCK_AFTER_DAYS.unpaid - 1), { kind: "open", stage: "awaiting-payment", stuck: null });
  assert.deepEqual(at(STUCK_AFTER_DAYS.unpaid + 1), {
    kind: "open",
    stage: "awaiting-payment",
    stuck: { reason: "completed-unpaid", days: STUCK_AFTER_DAYS.unpaid + 1 },
  });
});

test("delivered or awaiting a review for over a week is stuck", () => {
  for (const statusId of [9, 22]) {
    const cls = classifyOrder(order({ statusId, statusGroupId: 4, statusChangedAt: daysAgo(8, 1) }), NOW);
    assert.deepEqual(cls, { kind: "open", stage: "delivery", stuck: { reason: "delivered-not-closed", days: 8 } });
  }
  const fresh = classifyOrder(order({ statusId: 22, statusGroupId: 4, statusChangedAt: daysAgo(6) }), NOW);
  assert.equal(fresh.kind === "open" && fresh.stuck, null);
});

test("a waybill is stuck only once it is two weeks old", () => {
  // «Был сделан ТТН» and «Очікує на пошті».
  for (const statusId of [8, 20]) {
    const at = (days: number) =>
      classifyOrder(order({ statusId, statusGroupId: 4, statusChangedAt: daysAgo(days, 1) }), NOW);
    assert.deepEqual(at(STUCK_AFTER_DAYS.inTransit - 1), { kind: "open", stage: "delivery", stuck: null });
    assert.deepEqual(at(STUCK_AFTER_DAYS.inTransit + 1), {
      kind: "open",
      stage: "delivery",
      stuck: { reason: "in-transit-too-long", days: STUCK_AFTER_DAYS.inTransit + 1 },
    });
  }
});

test("a new order untouched for over three days is stuck", () => {
  const cls = classifyOrder(order({ createdAt: daysAgo(4, 1) }), NOW);
  assert.deepEqual(cls, { kind: "open", stage: "new", stuck: { reason: "new-too-long", days: 4 } });
});

test("the previous shop and anything before the accounting start are not counted", () => {
  assert.equal(isCounted(order({ sourceId: 1 })), false);
  assert.equal(isCounted(order({ createdAt: new Date("2025-12-31T12:00:00Z") })), false);
  // 23:30 UTC on 31 Dec is already 1 January in Kyiv.
  assert.equal(isCounted(order({ createdAt: new Date("2025-12-31T23:30:00Z") })), true);
  assert.equal(isCounted(order({ sourceId: 2 })), true);
});
