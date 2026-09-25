import assert from "node:assert/strict";
import { test } from "node:test";
import { mapStatement, statementWindows, mergeWindows } from "./monobank-statement.ts";

// The shape of GET /api/merchant/statement, per Monobank's OpenAPI
// (MerchantStatementItem), with this shop's reference = KeyCRM order id.
function item(over: Record<string, unknown> = {}) {
  return {
    invoiceId: "260918X2CpVGtxFP3yV",
    status: "success",
    maskedPan: "44411111******29",
    date: "2026-09-18T13:07:40Z",
    paymentScheme: "full",
    amount: 70_000,
    profitAmount: 69_090,
    ccy: 980,
    approvalCode: "662476",
    rrn: "060189181768",
    reference: "1051",
    destination: "Замовлення №1051 — INVITUS",
    ...over,
  };
}

test("an empty statement is no rows, not an error", () => {
  assert.deepEqual(mapStatement({ list: [] }), { rows: [], skipped: [] });
});

test("a paid invoice becomes a fee row: amount − profitAmount, in kopecks, tied to the order", () => {
  const { rows, skipped } = mapStatement({ list: [item()] });
  assert.deepEqual(skipped, []);
  assert.deepEqual(rows, [
    {
      invoiceId: "260918X2CpVGtxFP3yV",
      orderId: 1051,
      amountKop: 70_000,
      feeKop: 910,
      paidAt: new Date("2026-09-18T13:07:40Z"),
      paidOn: "2026-09-18",
      paymentScheme: "full",
    },
  ]);
});

test("the day is Kyiv's: a payment at 00:30 Kyiv belongs to that day, not UTC's yesterday", () => {
  const { rows } = mapStatement({ list: [item({ date: "2026-09-30T21:30:00Z" })] });
  assert.equal(rows[0].paidOn, "2026-10-01");
});

test("a fee of 0 is a fact, and kept", () => {
  const { rows } = mapStatement({ list: [item({ profitAmount: 70_000 })] });
  assert.equal(rows[0].feeKop, 0);
});

test("a reference that is not an order number is kept with no order", () => {
  const { rows } = mapStatement({ list: [item({ reference: "84d0070ee4e44667b31371d8f8813947" }), item({ invoiceId: "b", reference: undefined })] });
  assert.deepEqual(rows.map((r) => r.orderId), [null, null]);
});

test("a partial statement keeps the good rows and says which it skipped, and why", () => {
  const { rows, skipped } = mapStatement({
    list: [
      item({ invoiceId: "ok" }),
      item({ invoiceId: "held", status: "hold" }),
      item({ invoiceId: "no-profit", profitAmount: undefined }),
      item({ invoiceId: "usd", ccy: 840 }),
      item({ invoiceId: "negative", profitAmount: 80_000 }),
      item({ invoiceId: "bad-date", date: "yesterday" }),
      item({ invoiceId: "fraction", amount: 700.5 }),
      item({ invoiceId: undefined }),
      "not an object",
      null,
    ],
  });
  assert.deepEqual(rows.map((r) => r.invoiceId), ["ok"]);
  assert.deepEqual(skipped, [
    { invoiceId: "held", reason: "status hold" },
    { invoiceId: "no-profit", reason: "no profitAmount" },
    { invoiceId: "usd", reason: "currency 840" },
    { invoiceId: "negative", reason: "profitAmount above amount" },
    { invoiceId: "bad-date", reason: "no date" },
    { invoiceId: "fraction", reason: "no amount" },
    { invoiceId: null, reason: "no invoiceId" },
    { invoiceId: null, reason: "not an object" },
    { invoiceId: null, reason: "not an object" },
  ]);
});

test("a missing currency is hryvnias — the field is optional in practice", () => {
  const { rows } = mapStatement({ list: [item({ ccy: undefined })] });
  assert.equal(rows.length, 1);
});

test("the same invoice twice in one answer is one row", () => {
  const { rows } = mapStatement({ list: [item(), item()] });
  assert.equal(rows.length, 1);
});

test("a body that is not a statement at all is an error, not an empty day", () => {
  assert.throws(() => mapStatement({ errCode: "1001", errText: "'to'-'from' cannot be more than 31 days" }), /no list/);
  assert.throws(() => mapStatement(null), /no list/);
  assert.throws(() => mapStatement("<html>"), /no list/);
});

test("a long range is cut into windows Monobank accepts (31 days at most), oldest first", () => {
  const from = new Date("2026-07-01T00:00:00Z");
  const to = new Date("2026-09-25T00:00:00Z");
  const windows = statementWindows(from, to);
  assert.equal(windows[0].from, from.getTime() / 1000);
  assert.equal(windows.at(-1)!.to, to.getTime() / 1000);
  for (const w of windows) assert.ok(w.to - w.from <= 31 * 86_400 && w.to > w.from);
  for (let i = 1; i < windows.length; i++) assert.equal(windows[i].from, windows[i - 1].to);
  assert.equal(windows.length, 3);
});

test("an empty or inverted range is no windows", () => {
  const d = new Date("2026-09-25T00:00:00Z");
  assert.deepEqual(statementWindows(d, d), []);
  assert.deepEqual(statementWindows(d, new Date("2026-09-01T00:00:00Z")), []);
});

test("windows that share a boundary second yield each invoice once, so one upsert can take them", () => {
  const row = (invoiceId: string, feeKop: number) => ({
    invoiceId, orderId: 1, amountKop: 410_000, feeKop, paidAt: new Date("2026-08-01T00:00:00Z"), paidOn: "2026-08-01", paymentScheme: "full",
  });
  const merged = mergeWindows([[row("a", 5330), row("b", 100)], [row("b", 100), row("c", 200)]]);
  assert.deepEqual(merged.map((r) => r.invoiceId), ["a", "b", "c"]);
});
