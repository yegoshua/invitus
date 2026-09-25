import { formatPriceWithCurrency } from "@site/lib/format";
import { addDays, daysBetween, type Day, type Period } from "@/lib/finance/period";

const MONTHS = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];

function label(day: Day, byMonth: boolean): string {
  const [, m, d] = day.split("-").map(Number);
  return byMonth ? MONTHS[m - 1] : `${d} ${MONTHS[m - 1]}`;
}

/**
 * Revenue per day (per month past two months). Plain bars: one series, and
 * a chart library would outweigh the rest of the page.
 */
export function RevenueChart({ period, revenueByDay }: { period: Period; revenueByDay: Array<{ day: Day; revenue: number }> }) {
  const byMonth = daysBetween(period.from, period.to) > 62;
  const buckets = new Map<string, number>();
  if (byMonth) {
    for (let d = period.from; d <= period.to; d = addDays(d, 1)) buckets.set(`${d.slice(0, 7)}-01`, 0);
  } else {
    for (let d = period.from; d <= period.to; d = addDays(d, 1)) buckets.set(d, 0);
  }
  for (const { day, revenue } of revenueByDay) {
    const key = byMonth ? `${day.slice(0, 7)}-01` : day;
    buckets.set(key, (buckets.get(key) ?? 0) + revenue);
  }
  const bars = [...buckets.entries()];
  const max = Math.max(1, ...bars.map(([, v]) => v));

  return (
    <div className="rounded-[26px] bg-card p-5 md:p-6">
      <p className="text-sm text-muted-foreground">Виручка по {byMonth ? "місяцях" : "днях"}</p>
      <div className="mt-6 flex h-40 items-end gap-[3px]">
        {bars.map(([key, value]) => (
          <div key={key} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
              style={{ height: value > 0 ? `${Math.max(3, (value / max) * 100)}%` : "2px", opacity: value > 0 ? 1 : 0.15 }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-secondary px-2 py-1 text-xs group-hover:block">
              {label(key, byMonth)}: {formatPriceWithCurrency(value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{label(bars[0][0], byMonth)}</span>
        <span>{label(bars[bars.length - 1][0], byMonth)}</span>
      </div>
    </div>
  );
}
