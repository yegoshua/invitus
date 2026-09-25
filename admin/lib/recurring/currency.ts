// A Recurring payment billed in dollars (Strapi Cloud, KeyCRM) becomes an
// Expense in hryvnias at the NBU's official rate for the day it is due. Pure:
// the rate is fetched by lib/recurring/nbu.ts. Relative imports only.
//
// The rate is the NBU's and not a guess: the card's actual charge differs by
// the bank's own rate and fees, and the owner corrects the Expense to that —
// the note on it says what the starting figure was made of.

import { uah, uahExact } from "../finance/format.ts";
import type { Day } from "../finance/period.ts";

export type Currency = "UAH" | "USD";
export const CURRENCIES: Currency[] = ["UAH", "USD"];

export interface NbuRate {
  /** Hryvnias per dollar, as the NBU publishes it (four decimals). */
  rate: number;
  /** The day the rate is set for. */
  day: Day;
}

/**
 * Kopecks for an amount in cents. Rounded at twelve significant digits first,
 * like lib/finance/fees.ts, so 123703.4999999 — a float's reading of an exact
 * 123703.5 — rounds as the half it is.
 */
export function usdToKop(cents: number, rate: number): number {
  return Math.round(Number((cents * rate).toPrecision(12)));
}

/** The NBU's `[{ rate, exchangedate: "DD.MM.YYYY", … }]`; null for anything else, an empty list included. */
export function parseNbuRate(json: unknown): NbuRate | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const { rate, exchangedate } = (json[0] ?? {}) as { rate?: unknown; exchangedate?: unknown };
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return null;
  const m = typeof exchangedate === "string" ? /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(exchangedate) : null;
  if (!m) return null;
  return { rate, day: `${m[3]}-${m[2]}-${m[1]}` };
}

const comma = (n: number) => String(n).replace(".", ",");

/** «30,84 USD × 44,7273 (НБУ 05.09.2026)» — what the generated Expense's comment starts with. */
export function fxNote(cents: number, { rate, day }: NbuRate): string {
  const [y, m, d] = day.split("-");
  return `${(cents / 100).toFixed(2).replace(".", ",")} USD × ${comma(rate)} (НБУ ${d}.${m}.${y})`;
}

/** «30,84 $», «1 250 ₴» — a template's amount in the currency it is billed in. */
export function templateAmount(minor: number, currency: Currency): string {
  const text = minor % 100 === 0 ? uah(minor / 100) : uahExact(minor / 100);
  return currency === "USD" ? text.replace("₴", "$") : text;
}
