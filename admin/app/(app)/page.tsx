import type { Metadata } from "next";
import { DatabaseDownBanner, KeyCrmDownBanner } from "@/components/data-banner";
import { KpiCard, type Kpi } from "@/components/overview/kpi-card";
import { OpenOrders } from "@/components/overview/open-orders";
import { RevenueChart, type ChartDay } from "@/components/overview/revenue-chart";
import { Sources } from "@/components/overview/sources";
import { StuckOrders } from "@/components/overview/stuck-orders";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/server";
import { listExpenses } from "@/lib/expenses/store";
import { profitFigures, summarizeExpenses, type ProfitFigures } from "@/lib/finance/expenses";
import { dayLabel, deltaLabel, plural, profitDeltaLabel, rangeLabel, uah } from "@/lib/finance/format";
import { addDays, daysBetween, kyivDay, periodFromSearch, previousPeriod, type Day, type Period } from "@/lib/finance/period";
import { summarize, type PeriodSummary } from "@/lib/finance/summary";
import { loadOrders } from "@/lib/keycrm-orders";

export const metadata: Metadata = { title: "Огляд" };

const MONTHS = ["січ", "лют", "бер", "квіт", "трав", "черв", "лип", "серп", "вер", "жовт", "лист", "груд"];

/** One bar per day — per month once the period is longer than two. */
function chartDays(period: Period, s: PeriodSummary, profit: ProfitFigures | null): ChartDay[] {
  const byMonth = daysBetween(period.from, period.to) > 62;
  const key = (d: Day) => (byMonth ? d.slice(0, 7) : d);
  const buckets = new Map<string, { revenue: number; open: number; profit?: number }>();
  for (let d = period.from; d <= period.to; d = addDays(d, 1)) buckets.set(key(d), { revenue: 0, open: 0 });
  for (const { day, revenue } of s.revenueByDay) buckets.get(key(day))!.revenue += revenue;
  for (const { day, total } of s.openByDay) buckets.get(key(day))!.open += total;
  // Running Profit as of each bucket's last day, so a month bar shows the month's end.
  if (profit) for (const { day, cumulative } of profit.byDay) buckets.get(key(day))!.profit = cumulative;
  const entries = [...buckets.entries()];
  const every = entries.length <= 7 ? 1 : entries.length <= 16 ? 3 : 5;
  return entries.map(([k, v], i) => {
    const month = MONTHS[Number(k.slice(5, 7)) - 1];
    return {
      ...v,
      label: byMonth ? `${month} ${k.slice(0, 4)}` : dayLabel(k),
      tick: byMonth ? month : i % every === 0 ? String(Number(k.slice(8))) : "",
    };
  });
}

/** Running total, for the Revenue sparkline. */
function cumulative(days: ChartDay[]): number[] {
  let acc = 0;
  return days.map((d) => (acc += d.revenue));
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();
  const now = new Date();
  const { period, preset } = periodFromSearch(await searchParams, kyivDay(now));
  const [data, expenses] = await Promise.all([loadOrders(), listExpenses(previousPeriod(period).from, period.to)]);
  const s = summarize(data.orders, period, now);
  // Without the Expenses a Profit figure would be Revenue wearing Profit's name.
  const profit = expenses.ok
    ? profitFigures(
        { revenue: s.revenue, previousRevenue: s.previous.revenue, revenueByDay: s.revenueByDay },
        summarizeExpenses(expenses.value, period),
        period
      )
    : null;
  const days = chartDays(period, s, profit);
  const vs = `до ${rangeLabel(s.previous.period)}`;

  const kpis: Kpi[] = [
    {
      label: "Виручка",
      value: uah(s.revenue),
      accent: true,
      spark: cumulative(days),
      delta: deltaLabel(s.revenue, s.previous.revenue),
      vs,
      note: `${s.sales} ${plural(s.sales, "продаж", "продажі", "продажів")} · середній чек ${uah(s.averageCheck)}`,
    },
    profit
      ? {
          label: "Прибуток",
          // Negative is a normal month (a batch of stock), so it is shown plainly: white, a real minus.
          value: uah(profit.profit),
          spark: profit.byDay.map((d) => d.cumulative),
          sparkColor: profit.profit < 0 ? "#FF453A" : "#7EB693",
          delta: profitDeltaLabel(profit.profit, profit.previousProfit),
          vs,
          note:
            profit.profit < 0
              ? "Витрати перевищили виручку · без комісій"
              : `${s.revenue ? Math.round((profit.profit / s.revenue) * 100) : 0}% від виручки · без комісій`,
        }
      : {
          label: "Прибуток",
          value: "—",
          pending: true,
          note: !expenses.ok && expenses.reason === "unconfigured" ? "Підключи базу даних, щоб вносити витрати" : "Витрати не завантажились",
        },
    { label: "Витрати на рекламу", value: "—", pending: true, note: "Meta і Google підтягнуться автоматично" },
    { label: "ROAS", value: "—", pending: true, note: "Виручка ÷ реклама — після підключення реклами" },
  ];

  return (
    <>
      <PageHeader title="Огляд" period={period} preset={preset} />
      {!data.ok && <KeyCrmDownBanner />}
      {!expenses.ok && expenses.reason === "error" && <DatabaseDownBanner />}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 dt:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>
      <div className="ov-grid gap-3 sm:gap-4">
        <StuckOrders orders={s.stuck} />
        <OpenOrders open={s.open} />
        <Sources sources={s.bySource} revenue={s.revenue} />
        <RevenueChart days={days} subtitle="Стовпці — продажі за день, прозорі — замовлення цього дня, що ще в роботі" />
      </div>
    </>
  );
}
