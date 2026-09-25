import assert from "node:assert/strict";
import { test } from "node:test";
import { profitFigures, summarizeExpenses, type ExpenseEntry } from "./expenses.ts";

const SEPT = { from: "2026-09-01", to: "2026-09-25" };

function entry(date: string, amountKop: number, over: Partial<ExpenseEntry> = {}): ExpenseEntry {
  return { date, amountKop, category: "services", source: "manual", ...over };
}

test("totals the period in hryvnias, by category, largest first", () => {
  const s = summarizeExpenses(
    [
      entry("2026-09-02", 240_000, { category: "packaging" }),
      entry("2026-09-04", 115_000),
      entry("2026-09-08", 42_050),
      entry("2026-08-30", 99_900), // previous period
      entry("2026-09-26", 1_000), // after the period
    ],
    SEPT
  );
  assert.equal(s.total, 3970.5);
  assert.equal(s.count, 3);
  assert.equal(s.previousTotal, 999);
  assert.deepEqual(s.byCategory, [
    { category: "packaging", total: 2400, count: 1 },
    { category: "services", total: 1570.5, count: 2 },
  ]);
  assert.deepEqual(s.byDay, [
    { day: "2026-09-02", total: 2400 },
    { day: "2026-09-04", total: 1150 },
    { day: "2026-09-08", total: 420.5 },
  ]);
});

test("the manual/automatic split is kept apart", () => {
  const s = summarizeExpenses(
    [entry("2026-09-02", 100_000), entry("2026-09-03", 50_000, { source: "meta", category: "ads" })],
    SEPT
  );
  assert.equal(s.total, 1500);
  assert.equal(s.manual, 1000);
  assert.equal(s.ads, 500);
});

test("an empty period is zeros, not NaN", () => {
  const s = summarizeExpenses([], SEPT);
  assert.deepEqual(
    { total: s.total, count: s.count, previousTotal: s.previousTotal, byCategory: s.byCategory, byDay: s.byDay },
    { total: 0, count: 0, previousTotal: 0, byCategory: [], byDay: [] }
  );
});

test("Profit is Revenue minus Expenses, and a month of buying stock is simply negative", () => {
  const p = profitFigures(
    { revenue: 12_300, previousRevenue: 8_200, revenueByDay: [{ day: "2026-09-10", revenue: 12_300 }] },
    summarizeExpenses([entry("2026-09-05", 7_800_000, { category: "stock" }), entry("2026-08-20", 100_000)], SEPT),
    SEPT
  );
  assert.equal(p.profit, 12_300 - 78_000);
  assert.equal(p.previousProfit, 8_200 - 1_000);
  assert.ok(p.profit < 0);
});

test("the daily series covers every day of the period, running total and per day", () => {
  const p = profitFigures(
    { revenue: 4100, previousRevenue: 0, revenueByDay: [{ day: "2026-09-02", revenue: 4100 }] },
    summarizeExpenses([entry("2026-09-01", 50_000), entry("2026-09-03", 100_000)], { from: "2026-09-01", to: "2026-09-03" }),
    { from: "2026-09-01", to: "2026-09-03" }
  );
  assert.deepEqual(p.byDay, [
    { day: "2026-09-01", profit: -500, cumulative: -500 },
    { day: "2026-09-02", profit: 4100, cumulative: 3600 },
    { day: "2026-09-03", profit: -1000, cumulative: 2600 },
  ]);
  assert.equal(p.byDay.at(-1)!.cumulative, p.profit);
});

test("kopecks do not drift: 0,10 + 0,20 is 0,30", () => {
  const s = summarizeExpenses([entry("2026-09-01", 10), entry("2026-09-01", 20)], SEPT);
  assert.equal(s.total, 0.3);
});
