// Calendar days in Kyiv. The server runs in UTC, and an order placed at
// 01:30 Kyiv time is on the previous UTC day — counting by UTC would move it
// into yesterday, and near a month boundary into last month.

const KYIV_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Kyiv",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" — sorts and compares as a string. */
export type Day = string;

export function kyivDay(instant: Date): Day {
  return KYIV_DAY.format(instant);
}

/** An inclusive range of Kyiv days. */
export interface Period {
  from: Day;
  to: Day;
}

export type PeriodPreset = "month" | "last-month" | "7d" | "30d";

export const PERIOD_PRESETS: Array<{ id: PeriodPreset; label: string }> = [
  { id: "month", label: "Цей місяць" },
  { id: "last-month", label: "Минулий місяць" },
  { id: "7d", label: "7 днів" },
  { id: "30d", label: "30 днів" },
];

// Day arithmetic at UTC noon, so no DST shift can land it on another date.
function toDate(day: Day): Date {
  return new Date(`${day}T12:00:00Z`);
}
function fromDate(date: Date): Day {
  return date.toISOString().slice(0, 10);
}
export function addDays(day: Day, days: number): Day {
  const d = toDate(day);
  d.setUTCDate(d.getUTCDate() + days);
  return fromDate(d);
}
export function daysBetween(from: Day, to: Day): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

export function presetPeriod(preset: PeriodPreset, today: Day): Period {
  const [y, m] = today.split("-").map(Number);
  const firstOfMonth = `${y}-${String(m).padStart(2, "0")}-01`;
  switch (preset) {
    case "month":
      return { from: firstOfMonth, to: today };
    case "last-month": {
      const to = addDays(firstOfMonth, -1);
      return { from: `${to.slice(0, 7)}-01`, to };
    }
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
  }
}

/** The same number of days, immediately before. What a delta compares to. */
export function previousPeriod(period: Period): Period {
  const length = daysBetween(period.from, period.to) + 1;
  return { from: addDays(period.from, -length), to: addDays(period.from, -1) };
}

export function inPeriod(day: Day, period: Period): boolean {
  return day >= period.from && day <= period.to;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The period a URL asks for: a preset, or a custom `from`/`to`. Anything
 * malformed falls back to this month rather than to an error page.
 */
export function periodFromSearch(
  search: { period?: string; from?: string; to?: string },
  today: Day
): { period: Period; preset: PeriodPreset | "custom" } {
  const { from, to } = search;
  if (from && to && DAY_PATTERN.test(from) && DAY_PATTERN.test(to) && from <= to) {
    return { period: { from, to: to > today ? today : to }, preset: "custom" };
  }
  const preset = PERIOD_PRESETS.some((p) => p.id === search.period)
    ? (search.period as PeriodPreset)
    : "month";
  return { period: presetPeriod(preset, today), preset };
}
