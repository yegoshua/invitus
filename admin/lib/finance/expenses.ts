// Expenses and Profit for one period. Pure: rows in, figures out — the
// database is read elsewhere (lib/expenses/store.ts), as KeyCRM is.
//
// Money is stored in kopecks and summed in kopecks; it becomes hryvnias only
// on the way out, to sit next to Revenue, which KeyCRM gives in hryvnias.

import type { ExpenseCategory, ExpenseSource } from "../expenses/categories.ts";
import type { FeeSummary } from "./fees.ts";
import { addDays, inPeriod, previousPeriod, type Day, type Period } from "./period.ts";

export interface ExpenseEntry {
  date: Day;
  amountKop: number;
  category: ExpenseCategory;
  source: ExpenseSource;
}

export interface ExpenseSummary {
  period: Period;
  /** Hryvnias, as everything else on the page. */
  total: number;
  manual: number;
  ads: number;
  count: number;
  previousTotal: number;
  byCategory: Array<{ category: ExpenseCategory; total: number; count: number }>;
  byDay: Array<{ day: Day; total: number }>;
}

const uah = (kop: number) => kop / 100;

export function summarizeExpenses(entries: ExpenseEntry[], period: Period): ExpenseSummary {
  const previous = previousPeriod(period);
  let total = 0, manual = 0, count = 0, previousTotal = 0;
  const byCategory = new Map<ExpenseCategory, { total: number; count: number }>();
  const byDay = new Map<Day, number>();

  for (const e of entries) {
    if (inPeriod(e.date, previous)) previousTotal += e.amountKop;
    if (!inPeriod(e.date, period)) continue;
    total += e.amountKop;
    count += 1;
    if (e.source === "manual") manual += e.amountKop;
    const c = byCategory.get(e.category) ?? { total: 0, count: 0 };
    c.total += e.amountKop;
    c.count += 1;
    byCategory.set(e.category, c);
    byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.amountKop);
  }

  return {
    period,
    total: uah(total),
    manual: uah(manual),
    ads: uah(total - manual),
    count,
    previousTotal: uah(previousTotal),
    byCategory: [...byCategory.entries()]
      .map(([category, c]) => ({ category, total: uah(c.total), count: c.count }))
      .sort((a, b) => b.total - a.total),
    byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, kop]) => ({ day, total: uah(kop) })),
  };
}

export interface ProfitFigures {
  profit: number;
  previousProfit: number;
  /** Every day of the period: that day's Profit, and the running total to it. */
  byDay: Array<{ day: Day; profit: number; cumulative: number }>;
}

/**
 * Profit = Revenue − Payment fees − Expenses (CONTEXT.md). Cash basis: a
 * month that buys a batch of stock is negative, and that is a correct answer,
 * not an error to hide. The fees are whatever lib/finance/fees.ts made of them
 * — actual where the bank reported them, estimated elsewhere.
 */
export function profitFigures(
  revenue: { revenue: number; previousRevenue: number; revenueByDay: Array<{ day: Day; revenue: number }> },
  expenses: ExpenseSummary,
  fees: FeeSummary,
  period: Period
): ProfitFigures {
  const rev = new Map(revenue.revenueByDay.map((d) => [d.day, d.revenue]));
  const exp = new Map(expenses.byDay.map((d) => [d.day, d.total]));
  const fee = new Map(fees.byDay.map((d) => [d.day, d.total]));
  const byDay: ProfitFigures["byDay"] = [];
  let cumulative = 0;
  for (let day = period.from; day <= period.to; day = addDays(day, 1)) {
    const profit = round((rev.get(day) ?? 0) - (fee.get(day) ?? 0) - (exp.get(day) ?? 0));
    cumulative = round(cumulative + profit);
    byDay.push({ day, profit, cumulative });
  }
  return {
    profit: round(revenue.revenue - fees.total - expenses.total),
    previousProfit: round(revenue.previousRevenue - fees.previousTotal - expenses.previousTotal),
    byDay,
  };
}

// To the kopeck: hryvnia floats minus hryvnia floats leave a tail.
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
