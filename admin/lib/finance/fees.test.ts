import assert from "node:assert/strict";
import { test } from "node:test";
import { actualFeesByOrder, estimateFeeKop, orderFee, periodFees } from "./fees.ts";
import { order, sale } from "./fixtures.ts";

const RATES = { 2: 1.3, 6: 0, 9: 3.5 };
const SEPT = { from: "2026-09-01", to: "2026-09-25" };
const NOW = new Date("2026-09-25T12:00:00Z");

test("the estimate is rate × amount, to the kopeck", () => {
  assert.equal(estimateFeeKop(4100, 1.3), 5330); // 53,30 ₴
  assert.equal(estimateFeeKop(700, 1.3), 910); // 700 × 1.3 is 909.999… in floats
  assert.equal(estimateFeeKop(1234.56, 1.3), 1605); // 16,04928 ₴ → 16,05 ₴
});

test("half a kopeck rounds up, and a float's tail does not decide it", () => {
  assert.equal(estimateFeeKop(50, 1.25), 63); // 62.5 exactly
  assert.equal(estimateFeeKop(50, 1.15), 58); // 57.49999… in floats, 57.5 in fact
});

test("a rate of 0 costs nothing — cash on delivery by default", () => {
  assert.deepEqual(orderFee({ total: 4100, paymentMethodId: 6 }, undefined, RATES), { kind: "estimated", kop: 0, percent: 0 });
});

test("the estimate uses the payment method's rate", () => {
  assert.deepEqual(orderFee({ total: 4100, paymentMethodId: 9 }, undefined, RATES), { kind: "estimated", kop: 14_350, percent: 3.5 });
});

test("a method with no rate, or no method at all, is estimated at 0", () => {
  assert.equal(orderFee({ total: 4100, paymentMethodId: 42 }, undefined, RATES).kop, 0);
  assert.equal(orderFee({ total: 4100, paymentMethodId: null }, undefined, RATES).kop, 0);
});

test("the actual fee wins over the estimate, even when it is 0", () => {
  assert.deepEqual(orderFee({ total: 4100, paymentMethodId: 2 }, 5_125, RATES), { kind: "actual", kop: 5_125 });
  assert.deepEqual(orderFee({ total: 4100, paymentMethodId: 2 }, 0, RATES), { kind: "actual", kop: 0 });
});

test("an order paid by two invoices has the fees of both, dated by the later payment", () => {
  const byOrder = actualFeesByOrder([
    { orderId: 1051, feeKop: 910, paidOn: "2026-09-18" },
    { orderId: 1051, feeKop: 100, paidOn: "2026-09-20" },
    { orderId: 1046, feeKop: 650, paidOn: "2026-09-08" },
    { orderId: null, feeKop: 999, paidOn: "2026-09-08" }, // not one of our orders
  ]);
  assert.deepEqual(byOrder.get(1051), { kop: 1010, paidOn: "2026-09-20" });
  assert.deepEqual(byOrder.get(1046), { kop: 650, paidOn: "2026-09-08" });
  assert.equal(byOrder.size, 2);
});

test("the period's fees are its Sales' fees, on the sale day, actual where the bank said so", () => {
  const paidOnline = sale("2026-09-10T10:00:00Z", "2026-09-05T10:00:00Z", { id: 1, total: 4100, paymentMethodId: 2 });
  const paidOnlineToo = sale("2026-09-12T10:00:00Z", "2026-09-12T10:00:00Z", { id: 2, total: 700, paymentMethodId: 2 });
  const cod = sale("2026-09-14T10:00:00Z", "2026-09-14T10:00:00Z", { id: 3, total: 3500, paymentMethodId: 6 });
  const august = sale("2026-08-20T10:00:00Z", "2026-08-20T10:00:00Z", { id: 4, total: 1000, paymentMethodId: 2 });
  const open = order({ id: 5, total: 9999, paymentMethodId: 2 });

  const f = periodFees(
    [paidOnline, paidOnlineToo, cod, august, open],
    actualFeesByOrder([{ orderId: 1, feeKop: 5_000, paidOn: "2026-09-05" }]),
    RATES,
    SEPT,
    NOW
  );
  assert.equal(f.total, 50 + 9.1);
  assert.equal(f.actual, 50);
  assert.equal(f.estimated, 9.1);
  assert.equal(f.previousTotal, 13);
  assert.deepEqual(f.byDay, [
    { day: "2026-09-10", total: 50 },
    { day: "2026-09-12", total: 9.1 },
  ]);
});

test("a cancelled order's actual fee is still money the bank kept, on the day it was paid", () => {
  const cancelled = order({ id: 7, statusId: 19, statusGroupId: 6, paymentMethodId: 2, total: 4100 });
  const cancelledNeverPaid = order({ id: 8, statusId: 19, statusGroupId: 6, paymentMethodId: 2, total: 4100 });
  const f = periodFees(
    [cancelled, cancelledNeverPaid],
    actualFeesByOrder([{ orderId: 7, feeKop: 5_330, paidOn: "2026-09-03" }]),
    RATES,
    SEPT,
    NOW
  );
  assert.equal(f.total, 53.3);
  assert.equal(f.actual, 53.3);
  assert.deepEqual(f.byDay, [{ day: "2026-09-03", total: 53.3 }]);
});

test("an empty period is zeros", () => {
  const f = periodFees([], new Map(), RATES, SEPT, NOW);
  assert.deepEqual(f, { total: 0, actual: 0, estimated: 0, previousTotal: 0, byDay: [] });
});
