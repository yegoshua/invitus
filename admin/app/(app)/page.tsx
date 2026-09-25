import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { formatPriceWithCurrency } from "@site/lib/format";
import { KpiCard } from "@/components/overview/kpi-card";
import { OpenOrders } from "@/components/overview/open-orders";
import { RevenueChart } from "@/components/overview/revenue-chart";
import { Sources } from "@/components/overview/sources";
import { StuckOrders } from "@/components/overview/stuck-orders";
import { PeriodPicker } from "@/components/period-picker";
import { requireAdmin } from "@/lib/auth/server";
import type { CrmOrder } from "@/lib/finance/orders";
import { kyivDay, periodFromSearch } from "@/lib/finance/period";
import { delta, summarize } from "@/lib/finance/summary";
import { fetchOrders } from "@/lib/keycrm-orders";

export const metadata: Metadata = { title: "Огляд" };

function plural(n: number, one: string, few: string, many: string) {
  const tens = n % 100, ones = n % 10;
  if (tens >= 11 && tens <= 14) return many;
  return ones === 1 ? one : ones >= 2 && ones <= 4 ? few : many;
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();
  const now = new Date();
  const { period, preset } = periodFromSearch(await searchParams, kyivDay(now));

  let orders: CrmOrder[] = [];
  let failed = false;
  try {
    orders = await fetchOrders();
  } catch (error) {
    // A KeyCRM outage shows as a banner over an empty page, not as a 500.
    console.error("[overview] KeyCRM orders failed:", error);
    failed = true;
  }
  const s = summarize(orders, period, now);

  return (
    <>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <h1 className="text-h3">Огляд</h1>
        <PeriodPicker active={preset} period={period} />
      </div>

      {failed && (
        <p role="alert" className="mt-6 flex items-center gap-2 rounded-[16px] border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-[var(--color-error)]" aria-hidden />
          Не вдалося завантажити замовлення з KeyCRM. Цифри нижче неповні — онови сторінку за хвилину.
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard label="Виручка" value={formatPriceWithCurrency(s.revenue)} delta={delta(s.revenue, s.previous.revenue)} />
        <KpiCard label="Продажі" value={String(s.sales)} delta={delta(s.sales, s.previous.sales)} />
        <KpiCard label="Середній чек" value={formatPriceWithCurrency(s.averageCheck)} />
        <KpiCard
          label="Оформлено"
          value={String(s.placed.count)}
          hint={s.placed.cancelled > 0 ? `${s.placed.cancelled} ${plural(s.placed.cancelled, "скасоване", "скасовані", "скасованих")}` : undefined}
        />
      </div>

      <div className="mt-3 grid gap-3 md:mt-4 md:gap-4 xl:grid-cols-[2fr_1fr]">
        <RevenueChart period={period} revenueByDay={s.revenueByDay} />
        <Sources sources={s.bySource} revenue={s.revenue} />
      </div>

      <div className="mt-3 grid gap-3 md:mt-4 md:gap-4 xl:grid-cols-[2fr_1fr]">
        <StuckOrders orders={s.stuck} />
        <OpenOrders open={s.open} />
      </div>
    </>
  );
}
