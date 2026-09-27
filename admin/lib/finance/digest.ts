// The Finance chat's daily digest (PRD #103, story 44): the day's Profit and
// how many orders are Stuck. Pure — the cron route reads KeyCRM and the
// database and sends; every rule is here, where node:test runs it.
//
// No figure is computed here. Revenue and Stuck come from `summarize` and
// `classifyOrder`, Profit from `profitFigures` — the same functions the
// Overview renders, so the chat and the Admin cannot disagree — Payment fees
// included, through `periodFees`.

import type { ExpenseEntry } from "./expenses.ts";
import { profitFigures, summarizeExpenses } from "./expenses.ts";
import { periodFees, type ActualFee, type FeeRates } from "./fees.ts";
import { dayLabel, plural, uah } from "./format.ts";
import type { CrmOrder } from "./orders.ts";
import { kyivDay, type Day, type Period } from "./period.ts";
import { summarize, type PeriodSummary } from "./summary.ts";

export interface FinanceDigestInput {
  now: Date;
  /** Every counted order, as the Admin loads them — Stuck is not bound to the day. */
  orders: { ok: true; value: CrmOrder[] } | { ok: false };
  /** Expenses from the first of the month to today, at least. */
  expenses: { ok: true; value: ExpenseEntry[] } | { ok: false; reason: "unconfigured" | "error" };
  /** Actual fees and the rates for the estimate, as lib/fees/store.ts loads them. */
  fees: { ok: true; actual: ReadonlyMap<number, ActualFee>; rates: FeeRates } | { ok: false };
}

export interface FinanceDigest {
  day: Day;
  /** Null when KeyCRM could not be read. */
  revenue: { amount: number; sales: number } | null;
  placed: PeriodSummary["placed"] | null;
  /** Today's Expenses, when they could be read. */
  expenses: number | null;
  profit:
    | { ok: true; day: number; month: number; expenses: number; fees: number; feesEstimated: boolean }
    | { ok: false; missing: "orders" | "expenses" | "fees"; expensesReason?: "unconfigured" | "error" };
  stuck: { count: number; total: number } | null;
}

function profitFor(
  orders: CrmOrder[],
  expenses: ExpenseEntry[],
  fees: { actual: ReadonlyMap<number, ActualFee>; rates: FeeRates },
  period: Period,
  now: Date
) {
  const s = summarize(orders, period, now);
  const e = summarizeExpenses(expenses, period);
  const f = periodFees(orders, fees.actual, fees.rates, period, now);
  const p = profitFigures(
    { revenue: s.revenue, previousRevenue: s.previous.revenue, revenueByDay: s.revenueByDay },
    e,
    f,
    period
  );
  return { profit: p.profit, expenses: e.total, fees: f.total, feesEstimated: f.estimated > 0 };
}

export function financeDigest({ now, orders, expenses, fees }: FinanceDigestInput): FinanceDigest {
  const day = kyivDay(now);
  const today: Period = { from: day, to: day };
  const month: Period = { from: `${day.slice(0, 7)}-01`, to: day };

  const s = orders.ok ? summarize(orders.value, today, now) : null;
  const expensesToday = expenses.ok ? summarizeExpenses(expenses.value, today).total : null;

  // All of it or nothing, as on the Overview: without the Expenses or the
  // fees a Profit figure is Revenue wearing Profit's name, and without KeyCRM
  // it is a loss nobody made.
  let profit: FinanceDigest["profit"];
  if (!orders.ok) {
    profit = { ok: false, missing: "orders" };
  } else if (!expenses.ok) {
    profit = { ok: false, missing: "expenses", expensesReason: expenses.reason };
  } else if (!fees.ok) {
    profit = { ok: false, missing: "fees" };
  } else {
    const d = profitFor(orders.value, expenses.value, fees, today, now);
    const m = profitFor(orders.value, expenses.value, fees, month, now);
    profit = { ok: true, day: d.profit, month: m.profit, expenses: d.expenses, fees: d.fees, feesEstimated: d.feesEstimated };
  }

  return {
    day,
    revenue: s ? { amount: s.revenue, sales: s.sales } : null,
    placed: s ? s.placed : null,
    expenses: expensesToday,
    profit,
    stuck: s
      ? { count: s.stuck.length, total: s.stuck.reduce((sum, o) => sum + o.total, 0) }
      : null,
  };
}

/**
 * parse_mode "HTML", like every other message the bot sends. Everything
 * printed here is a number or our own wording — no customer text — so there
 * is nothing to escape; keep it that way or route new text through
 * `escapeHtml` from the site's lib/telegram.ts.
 */
export function formatFinanceDigest(d: FinanceDigest): string {
  const parts = [`💼 <b>Фінанси за ${dayLabel(d.day)}</b>`, ""];

  if (d.revenue) {
    const sales = `${d.revenue.sales} ${plural(d.revenue.sales, "продаж", "продажі", "продажів")}`;
    parts.push(`Виручка: <b>${uah(d.revenue.amount)}</b> · ${sales}`);
  } else {
    parts.push("⚠️ KeyCRM не відповів — виручки й застряглих замовлень за сьогодні немає.");
  }

  if (d.expenses !== null) parts.push(`Витрати: ${uah(d.expenses)}`);

  if (d.profit.ok) {
    if (d.profit.fees > 0) parts.push(`Комісії: ${d.profit.feesEstimated ? "≈ " : ""}${uah(d.profit.fees)}`);
    parts.push(`Прибуток: <b>${uah(d.profit.day)}</b>`);
    parts.push(`З початку місяця: ${uah(d.profit.month)}`);
  } else if (d.profit.missing === "expenses") {
    const why =
      d.profit.expensesReason === "unconfigured"
        ? "база витрат не підключена"
        : "витрати не прочитались";
    parts.push(`Прибуток: невідомо — ${why}`);
  } else if (d.profit.missing === "fees") {
    parts.push("Прибуток: невідомо — комісії не прочитались");
  } else {
    parts.push("Прибуток: невідомо");
  }

  if (d.placed && d.placed.count > 0) {
    const cancelled = d.placed.cancelled > 0 ? ` (скасовано ${d.placed.cancelled})` : "";
    parts.push("");
    parts.push(`Оформлено: ${d.placed.count} на ${uah(d.placed.total)}${cancelled}`);
  }

  if (d.stuck) {
    parts.push("");
    parts.push(
      d.stuck.count > 0
        ? `⏳ Потребують закриття: <b>${d.stuck.count}</b> на ${uah(d.stuck.total)} — закрий у KeyCRM, щоб цифри були правдиві`
        : "✅ Застряглих замовлень немає"
    );
  }

  return parts.join("\n");
}
