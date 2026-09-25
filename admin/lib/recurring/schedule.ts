// When a Recurring payment is due. Pure: a template and a window of Kyiv days
// in, the due days out — the cron (lib/recurring/store.ts) decides what to do
// with them. Relative imports only: node:test runs this directly.
//
// Two rules live here and nowhere else. A day the month does not have is the
// month's last day (a subscription billed on the 31st is billed on 28 Feb, not
// skipped, not moved into March). And the generator never writes the future
// and never reaches back more than CATCH_UP_DAYS: a missed cron night is
// caught up, a template dated years back does not flood the journal.

import { ACCOUNTING_START } from "../finance/orders.ts";
import { addDays, type Day, type Period } from "../finance/period.ts";

export type Cadence = "monthly" | "yearly";

export interface Schedule {
  cadence: Cadence;
  /** 1–31; past the month's end means the month's last day. */
  dayOfMonth: number;
  /** 1–12 for a yearly payment, null for a monthly one. */
  month: number | null;
  startsOn: Day;
  endsOn: Day | null;
  paused: boolean;
}

/** How far back one run may reach: a missed fortnight, not a forgotten decade. */
export const CATCH_UP_DAYS = 400;

const MONTHS = ["січ", "лют", "бер", "квіт", "трав", "черв", "лип", "серп", "вер", "жовт", "лист", "груд"];

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function day(year: number, month: number, dayOfMonth: number): Day {
  const d = Math.min(dayOfMonth, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const max = (...days: Day[]) => days.reduce((a, b) => (a > b ? a : b));
const min = (...days: Day[]) => days.reduce((a, b) => (a < b ? a : b));

/** The days in the window (inclusive) on which the payment is due, oldest first. */
export function dueDays(s: Schedule, window: Period): Day[] {
  if (s.paused) return [];
  const from = max(window.from, s.startsOn);
  const to = s.endsOn ? min(window.to, s.endsOn) : window.to;
  if (from > to) return [];

  const due: Day[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    if (s.cadence === "monthly" || m === s.month) {
      const d = day(y, m, s.dayOfMonth);
      if (d >= from && d <= to) due.push(d);
    }
    m += 1;
    if (m > 12) [y, m] = [y + 1, 1];
  }
  return due;
}

/**
 * What one generator run covers: from the day after the last run (or the
 * start) up to today, capped at CATCH_UP_DAYS and at the accounting start.
 * Null when there is nothing to cover.
 */
export function generationWindow(s: Schedule, generatedThrough: Day | null, today: Day): Period | null {
  if (s.paused) return null;
  const from = max(s.startsOn, ACCOUNTING_START, addDays(today, -(CATCH_UP_DAYS - 1)), generatedThrough ? addDays(generatedThrough, 1) : s.startsOn);
  const to = s.endsOn ? min(today, s.endsOn) : today;
  return from <= to ? { from, to } : null;
}

/** The first due day not yet written, from today on. Null when paused or finished. */
export function nextDue(s: Schedule, generatedThrough: Day | null, today: Day): Day | null {
  const from = generatedThrough && generatedThrough >= today ? addDays(generatedThrough, 1) : today;
  // A yearly payment is due at most 366 days on; a start in the future moves that on too.
  const start = max(from, s.startsOn);
  return dueDays(s, { from: start, to: addDays(start, 366) })[0] ?? null;
}

/** «щомісяця, 5-го», «щороку, 12 бер». */
export function cadenceLabel(s: Pick<Schedule, "cadence" | "dayOfMonth" | "month">): string {
  if (s.cadence === "yearly" && s.month) return `щороку, ${s.dayOfMonth} ${MONTHS[s.month - 1]}`;
  return `щомісяця, ${s.dayOfMonth}-го`;
}
