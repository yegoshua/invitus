import assert from "node:assert/strict";
import { test } from "node:test";
import { financeDigest, formatFinanceDigest } from "./digest.ts";
import type { ExpenseEntry } from "./expenses.ts";
import { order, sale } from "./fixtures.ts";

// No fee on anything unless a test says so: the figures below are about Expenses.
const NO_FEES = { ok: true as const, actual: new Map(), rates: {} };

// 21:00 Kyiv on 25 September — when the cron runs.
const NOW = new Date("2026-09-25T18:00:00Z");

function expense(date: string, amountKop: number): ExpenseEntry {
  return { date, amountKop, category: "packaging", source: "manual" };
}

const today = (hour: number) => `2026-09-25T${String(hour).padStart(2, "0")}:00:00Z`;

test("Profit for the day is today's Revenue less today's Expenses", () => {
  const d = financeDigest({
    now: NOW,
    orders: {
      ok: true,
      value: [
        sale(today(9), today(9), { total: 4100 }),
        sale(today(10), today(10), { total: 700 }),
        sale("2026-09-24T10:00:00Z", "2026-09-24T10:00:00Z", { total: 5000 }), // yesterday
      ],
    },
    expenses: { ok: true, value: [expense("2026-09-25", 120_000), expense("2026-09-03", 300_000)] },
    fees: NO_FEES,
  });
  assert.equal(d.day, "2026-09-25");
  assert.equal(d.revenue?.amount, 4800);
  assert.equal(d.revenue?.sales, 2);
  assert.equal(d.profit.ok && d.profit.expenses, 1200);
  assert.equal(d.profit.ok && d.profit.day, 3600);
  // Month to date: 4800 + 5000 − 1200 − 3000.
  assert.equal(d.profit.ok && d.profit.month, 5600);
});

test("a day that bought stock is a negative Profit, printed as one", () => {
  const d = financeDigest({
    now: NOW,
    orders: { ok: true, value: [] },
    expenses: { ok: true, value: [expense("2026-09-25", 2_000_000)] },
    fees: NO_FEES,
  });
  assert.equal(d.profit.ok && d.profit.day, -20000);
  assert.match(formatFinanceDigest(d), /Прибуток: <b>−20\s000\s₴<\/b>/);
});

test("Stuck orders are counted by the Admin's classifier, not by the day", () => {
  const d = financeDigest({
    now: NOW,
    orders: {
      ok: true,
      value: [
        // New for ten days: stuck.
        order({ createdAt: new Date("2026-09-15T10:00:00Z"), total: 3000 }),
        // Completed, payment never marked, a week ago: stuck.
        order({
          statusId: 12,
          statusGroupId: 5,
          closedAt: new Date("2026-09-18T10:00:00Z"),
          statusChangedAt: new Date("2026-09-18T10:00:00Z"),
          total: 2000,
        }),
        // New since this morning: open, not stuck.
        order({ createdAt: new Date(today(8)) }),
        // Legacy source: not in the Admin at all.
        order({ sourceId: 1, createdAt: new Date("2026-09-01T10:00:00Z") }),
      ],
    },
    expenses: { ok: true, value: [] },
    fees: NO_FEES,
  });
  assert.deepEqual(d.stuck, { count: 2, total: 5000 });
  assert.match(formatFinanceDigest(d), /Потребують закриття: <b>2<\/b> на 5\s000\s₴/);
});

test("no stuck orders says so rather than leaving the line out", () => {
  const d = financeDigest({ now: NOW, orders: { ok: true, value: [] }, expenses: { ok: true, value: [] }, fees: NO_FEES });
  assert.match(formatFinanceDigest(d), /Застряглих замовлень немає/);
});

test("unreadable Expenses never pass Revenue off as Profit", () => {
  const d = financeDigest({
    now: NOW,
    orders: { ok: true, value: [sale(today(9), today(9), { total: 4100 })] },
    expenses: { ok: false, reason: "error" },
    fees: NO_FEES,
  });
  assert.equal(d.profit.ok, false);
  const text = formatFinanceDigest(d);
  assert.match(text, /Виручка: <b>4\s100\s₴<\/b>/);
  assert.match(text, /Прибуток: невідомо/);
  assert.doesNotMatch(text, /Прибуток: <b>/);
  assert.match(text, /витрати не прочитались/);
});

test("an unconfigured database is named as such", () => {
  const d = financeDigest({
    now: NOW,
    orders: { ok: true, value: [] },
    expenses: { ok: false, reason: "unconfigured" },
    fees: NO_FEES,
  });
  assert.match(formatFinanceDigest(d), /база витрат не підключена/);
});

test("KeyCRM down: no Revenue, no Profit, no Stuck count — and still a message", () => {
  const d = financeDigest({
    now: NOW,
    orders: { ok: false },
    expenses: { ok: true, value: [expense("2026-09-25", 50_000)] },
    fees: NO_FEES,
  });
  assert.equal(d.revenue, null);
  assert.equal(d.stuck, null);
  assert.equal(d.profit.ok, false);
  const text = formatFinanceDigest(d);
  assert.match(text, /Фінанси за 25/);
  assert.match(text, /KeyCRM не відповів/);
  assert.doesNotMatch(text, /Прибуток: <b>/);
  // What is known is still said.
  assert.match(text, /Витрати: 500\s₴/);
});

test("the first of the month has a month-to-date equal to the day", () => {
  const d = financeDigest({
    now: new Date("2026-10-01T18:00:00Z"),
    orders: { ok: true, value: [sale("2026-10-01T09:00:00Z", "2026-10-01T09:00:00Z", { total: 1000 })] },
    expenses: { ok: true, value: [] },
    fees: NO_FEES,
  });
  assert.equal(d.profit.ok && d.profit.day, 1000);
  assert.equal(d.profit.ok && d.profit.month, 1000);
});

test("Profit is net of Payment fees: the bank's figure where there is one, the rate's otherwise", () => {
  const d = financeDigest({
    now: NOW,
    orders: {
      ok: true,
      value: [
        sale(today(9), today(9), { id: 1, total: 4100, paymentMethodId: 2 }),
        sale(today(10), today(10), { id: 2, total: 1000, paymentMethodId: 2 }),
      ],
    },
    expenses: { ok: true, value: [] },
    // Order 1: Monobank kept 53,30 ₴. Order 2: 1,3% of 1000 ₴ = 13 ₴, an estimate.
    fees: { ok: true, actual: new Map([[1, { kop: 5330, paidOn: "2026-09-25" }]]), rates: { 2: 1.3 } },
  });
  assert.ok(d.profit.ok);
  assert.equal(d.profit.fees, 66.3);
  assert.equal(d.profit.day, 5100 - 66.3);
  assert.match(formatFinanceDigest(d), /Комісії: ≈ 66\s₴/);
});

test("without the fees there is no Profit, as on the Overview", () => {
  const d = financeDigest({
    now: NOW,
    orders: { ok: true, value: [sale(today(9), today(9), { total: 4100 })] },
    expenses: { ok: true, value: [] },
    fees: { ok: false },
  });
  assert.deepEqual(d.profit, { ok: false, missing: "fees" });
  assert.match(formatFinanceDigest(d), /Прибуток: невідомо — комісії не прочитались/);
});
