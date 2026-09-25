// How the Admin writes money, days and counts — the design's conventions.
// Relative imports only: node:test runs this directly.

import type { Day, Period } from "./period.ts";

const MONTHS = ["січ", "лют", "бер", "квіт", "трав", "черв", "лип", "серп", "вер", "жовт", "лист", "груд"];
const NBSP = " ";

function digits(n: number): string {
  return Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** "4 100 ₴", "−1 250 ₴" — a real minus sign, non-breaking spaces. */
export function uah(n: number): string {
  return `${n < 0 ? "−" : ""}${digits(n)}${NBSP}₴`;
}

/** "420,50 ₴" — kopecks shown when there are any. For a single Expense, not a total. */
export function uahExact(n: number): string {
  const kop = Math.round(Math.abs(n) * 100) % 100;
  if (kop === 0) return uah(n);
  return `${n < 0 ? "−" : ""}${digits(Math.trunc(Math.abs(n)))},${String(kop).padStart(2, "0")}${NBSP}₴`;
}

/** Axis labels: "12,5 тис", "800". */
export function shortAmount(n: number): string {
  const a = Math.abs(n), sign = n < 0 ? "−" : "";
  if (a >= 1000) return `${sign}${String(Math.round(a / 100) / 10).replace(".", ",")}${NBSP}тис`;
  return `${sign}${Math.round(a)}`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m = n % 10, h = n % 100;
  if (m === 1 && h !== 11) return one;
  if (m >= 2 && m <= 4 && (h < 10 || h >= 20)) return few;
  return many;
}

export function dayLabel(day: Day): string {
  const [, m, d] = day.split("-").map(Number);
  return `${d}${NBSP}${MONTHS[m - 1]}`;
}

/** "1–25 вер", "27 серп – 25 вер", "30 груд 2025 – 5 січ". */
export function rangeLabel({ from, to }: Period): string {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  if (from === to) return dayLabel(to);
  if (fy === ty && fm === tm) return `${fd}–${td}${NBSP}${MONTHS[tm - 1]}`;
  const year = fy !== ty ? ` ${fy}` : "";
  return `${dayLabel(from)}${year} – ${dayLabel(to)}`;
}

/** "↑ 12%" / "↓ 8%" / "→ 0%", or null with nothing to compare against. */
export function deltaLabel(current: number, previous: number): { text: string; direction: -1 | 0 | 1 } | null {
  if (previous === 0) return null;
  const v = Math.round(((current - previous) / Math.abs(previous)) * 100);
  const direction = v > 0 ? 1 : v < 0 ? -1 : 0;
  return { text: `${direction > 0 ? "↑" : direction < 0 ? "↓" : "→"}${NBSP}${Math.abs(v)}%`, direction };
}

/**
 * Profit's delta. Across zero a percentage is nonsense ("↑ 350%" from a loss
 * to a gain), so it says what it was instead — calmly, in no colour.
 */
export function profitDeltaLabel(current: number, previous: number): { text: string; direction: -1 | 0 | 1 } | null {
  if (previous === 0 || current < 0 !== previous < 0) return { text: `було ${uah(previous)}`, direction: 0 };
  return deltaLabel(current, previous);
}
