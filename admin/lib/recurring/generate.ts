// One template's generator run: which due days to write, at what amount, and
// where the next run starts. The database and the NBU are handed in, so the
// rules below are tested rather than buried in a transaction
// (lib/recurring/store.ts runs this inside one, per template, locked).
//
// - Each due day since the last run is written once — a day already written
//   is skipped, even when its Expense was since deleted.
// - A dollar payment is converted at the NBU rate for its day. With no rate,
//   nothing is guessed: the run stops at that day and the next run starts
//   there, so it stays pending rather than lost or wrong.
// - The template's current amount is used. Expenses written earlier are never
//   touched, so an edit changes only what is still to come.

import { addDays, type Day } from "../finance/period.ts";
import { fxNote, usdToKop, type Currency, type NbuRate } from "./currency.ts";
import { dueDays, generationWindow, type Schedule } from "./schedule.ts";

export interface Template extends Schedule {
  currency: Currency;
  /** Kopecks or cents, per `currency`. */
  amountMinor: number;
  comment: string | null;
}

export interface Occurrence {
  day: Day;
  amountKop: number;
  comment: string | null;
}

export interface GenerateDeps {
  /** Whether this day was ever written for the template. */
  written(day: Day): Promise<boolean>;
  /** Throws when the NBU has no rate to give. */
  usdRate(day: Day): Promise<NbuRate>;
  write(occurrence: Occurrence): Promise<void>;
}

export interface GenerateResult {
  written: number;
  /** Where the next run starts from (the day after). Unchanged when there was nothing to cover. */
  generatedThrough: Day | null;
  /** Set when a day had to be left pending. */
  error: string | null;
}

/** expenses.comment is capped at 1000 characters. */
const MAX_COMMENT = 1000;

function comment(note: string | null, own: string | null): string | null {
  const text = [note, own].filter(Boolean).join(" · ");
  return text ? text.slice(0, MAX_COMMENT) : null;
}

export async function generateOccurrences(
  t: Template,
  generatedThrough: Day | null,
  today: Day,
  deps: GenerateDeps
): Promise<GenerateResult> {
  const window = generationWindow(t, generatedThrough, today);
  if (!window) return { written: 0, generatedThrough, error: null };

  let written = 0;
  for (const day of dueDays(t, window)) {
    if (await deps.written(day)) continue;
    let occurrence: Occurrence;
    if (t.currency === "USD") {
      let rate: NbuRate;
      try {
        rate = await deps.usdRate(day);
      } catch (error) {
        const why = error instanceof Error ? error.message : String(error);
        return { written, generatedThrough: addDays(day, -1), error: `${day}: курс НБУ недоступний — ${why}` };
      }
      occurrence = { day, amountKop: usdToKop(t.amountMinor, rate.rate), comment: comment(fxNote(t.amountMinor, rate), t.comment) };
    } else {
      occurrence = { day, amountKop: t.amountMinor, comment: comment(null, t.comment) };
    }
    await deps.write(occurrence);
    written += 1;
  }
  return { written, generatedThrough: window.to, error: null };
}
