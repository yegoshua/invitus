import assert from "node:assert/strict";
import { test } from "node:test";
import { order, sale } from "./fixtures.ts";
import { delta, summarize } from "./summary.ts";

const NOW = new Date("2026-09-25T12:00:00Z");
const SEPT = { from: "2026-09-01", to: "2026-09-25" };

test("Revenue counts only Sales dated in the period", () => {
  const s = summarize(
    [
      sale("2026-09-10T10:00:00Z", "2026-09-10T10:00:00Z", { total: 4100 }),
      sale("2026-09-12T10:00:00Z", "2026-09-12T10:00:00Z", { total: 700, sourceId: 2 }),
      sale("2026-08-20T10:00:00Z", "2026-08-20T10:00:00Z", { total: 500 }), // previous period
      order({ total: 9999 }), // open
      order({ statusId: 19, statusGroupId: 6, total: 8888 }), // cancelled
    ],
    SEPT,
    NOW
  );
  assert.equal(s.revenue, 4800);
  assert.equal(s.sales, 2);
  assert.equal(s.averageCheck, 2400);
  assert.deepEqual(s.previous, { period: { from: "2026-08-07", to: "2026-08-31" }, revenue: 500, sales: 1 });
  assert.deepEqual(s.bySource.map((x) => [x.label, x.revenue]), [["Новий сайт", 4100], ["Instagram", 700]]);
  assert.deepEqual(s.revenueByDay, [{ day: "2026-09-10", revenue: 4100 }, { day: "2026-09-12", revenue: 700 }]);
});

test("an order placed in August but sold in September is September revenue", () => {
  const s = summarize(
    [sale("2026-09-02T10:00:00Z", "2026-09-02T10:00:00Z", { createdAt: new Date("2026-08-28T10:00:00Z") })],
    SEPT,
    NOW
  );
  assert.equal(s.revenue, 4100);
  assert.equal(s.placed.count, 0);
});

test("placed counts every order created in the period, cancelled ones included", () => {
  const s = summarize(
    [order({ total: 100 }), order({ total: 200, statusId: 19, statusGroupId: 6 })],
    SEPT,
    NOW
  );
  assert.deepEqual(s.placed, { count: 2, total: 300, cancelled: 1 });
});

test("open and stuck describe now, whatever the period", () => {
  const s = summarize(
    [
      order({ id: 1, createdAt: new Date("2026-02-01T10:00:00Z"), total: 4100, sourceId: 2 }),
      order({ id: 2, total: 500, createdAt: new Date("2026-09-24T10:00:00Z") }),
    ],
    { from: "2026-09-25", to: "2026-09-25" },
    NOW
  );
  assert.equal(s.open.count, 2);
  assert.equal(s.open.total, 4600);
  assert.deepEqual(s.stuck.map((x) => [x.id, x.reason, x.sourceLabel]), [[1, "new-too-long", "Instagram"]]);
});

test("legacy and pre-2026 orders are invisible", () => {
  const s = summarize(
    [
      sale("2026-09-10T10:00:00Z", "2026-09-10T10:00:00Z", { sourceId: 1 }),
      order({ createdAt: new Date("2025-11-01T10:00:00Z") }),
    ],
    SEPT,
    NOW
  );
  assert.equal(s.revenue, 0);
  assert.equal(s.open.count, 0);
  assert.equal(s.stuck.length, 0);
});

test("an empty period is zeros, not NaN", () => {
  const s = summarize([], SEPT, NOW);
  assert.equal(s.averageCheck, 0);
  assert.equal(delta(s.revenue, s.previous.revenue), null);
});

test("delta", () => {
  assert.equal(delta(150, 100), 0.5);
  assert.equal(delta(50, 100), -0.5);
  assert.equal(delta(10, 0), null);
});
