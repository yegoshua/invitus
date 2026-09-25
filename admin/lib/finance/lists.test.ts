import assert from "node:assert/strict";
import { test } from "node:test";
import { order, sale } from "./fixtures.ts";
import { orderRows, productRanking, type OrderStatusFilter } from "./lists.ts";

const NOW = new Date("2026-09-25T12:00:00Z");
const SEPT = { from: "2026-09-01", to: "2026-09-25" };
const none: { status: OrderStatusFilter[]; source: number[]; payment: number[] } = { status: [], source: [], payment: [] };
const line = (name: string, price: number, size: string | null = null, quantity = 1) =>
  ({ name, price, quantity, size, sku: null, picture: null });

test("rows are the period's placed orders, newest first, with an estimated fee", () => {
  const rows = orderRows(
    [
      order({ id: 1, total: 4100, paymentMethodId: 2 }),
      order({ id: 2, total: 500, paymentMethodId: 6 }),
      order({ id: 3, createdAt: new Date("2026-08-01T10:00:00Z") }),
      order({ id: 4, sourceId: 1 }),
    ],
    SEPT, NOW, none
  );
  assert.deepEqual(rows.map((r) => [r.order.id, r.fee]), [[2, 0], [1, 53]]);
});

test("filters combine; each group is an OR of its chips", () => {
  const orders = [
    order({ id: 1, sourceId: 2, createdAt: new Date("2026-09-24T10:00:00Z") }),
    order({ id: 2, sourceId: 3, createdAt: new Date("2026-09-24T10:00:00Z") }),
    order({ id: 3, sourceId: 3, statusId: 19, statusGroupId: 6 }),
    order({ id: 4, sourceId: 2, createdAt: new Date("2026-09-10T10:00:00Z") }), // stuck: new > 3 days
  ];
  const ids = (f: Partial<typeof none>) => orderRows(orders, SEPT, NOW, { ...none, ...f }).map((r) => r.order.id);
  assert.deepEqual(ids({ source: [2] }), [4, 1]);
  assert.deepEqual(ids({ status: ["stuck"] }), [4]);
  assert.deepEqual(ids({ status: ["open", "cancelled"], source: [3] }), [3, 2]);
});

test("a cancelled order carries no fee", () => {
  const [row] = orderRows([order({ statusId: 19, statusGroupId: 6, paymentMethodId: 2 })], SEPT, NOW, none);
  assert.equal(row.fee, 0);
});

test("products rank by revenue from the period's Sales, with sizes", () => {
  const s = (lines: ReturnType<typeof line>[]) => sale("2026-09-10T10:00:00Z", "2026-09-10T10:00:00Z", { lines });
  const ranking = productRanking(
    [
      s([line("Пояс Tiger", 4100, "L"), line("Лямки", 500)]),
      s([line("Пояс Tiger", 4100, "M")]),
      s([line("Лямки", 500, null, 3)]),
      order({ lines: [line("Не продано", 9999)] }),
    ],
    SEPT, NOW
  );
  assert.deepEqual(ranking.map((p) => [p.name, p.quantity, p.revenue]), [["Пояс Tiger", 2, 8200], ["Лямки", 4, 2000]]);
  assert.deepEqual(ranking[0].sizes, [{ size: "L", quantity: 1 }, { size: "M", quantity: 1 }]);
});
