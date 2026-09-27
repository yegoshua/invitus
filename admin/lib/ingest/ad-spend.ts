// Ad spend, whichever platform it comes from (Meta #111, Google through GA4
// #112): the row an ingest writes, and the rules every ingest shares — how a
// decimal string becomes kopecks, how pages merge, how far one request
// reaches, and what a re-read makes stale. Pure; relative imports only.

import { addDays, inPeriod, type Day, type Period } from "../finance/period.ts";

export interface AdSpendRow {
  /** The day the money was spent, as the ad account's calendar has it. */
  day: Day;
  /** The platform's campaign id: with the day and the source, the row's identity. */
  campaign: string;
  title: string;
  amountKop: number;
}

/**
 * A platform's decimal string (Meta's "5339.5") in kopecks, by string arithmetic:
 * `0.285 * 100` is 28.499…, and a float is how a kopeck goes missing.
 * Half-up at the third decimal; null for anything that is not a plain
 * non-negative decimal.
 */
export function spendKopecks(spend: string): number | null {
  if (typeof spend !== "string") return null;
  const m = /^(\d+)(?:\.(\d+))?$/.exec(spend.trim());
  if (!m) return null;
  const frac = (m[2] ?? "").padEnd(3, "0").slice(0, 3);
  const kop = Number(m[1]) * 100 + Math.floor(Number(frac) / 10) + (Number(frac[2]) >= 5 ? 1 : 0);
  return Number.isSafeInteger(kop) ? kop : null;
}

const key = (r: { day: Day; campaign: string }) => `${r.day}|${r.campaign}`;

/**
 * Several pages as one batch, each campaign-day once — Postgres refuses an
 * upsert that touches the same row twice. The later copy wins.
 */
export function mergeAdSpend(pages: AdSpendRow[][]): AdSpendRow[] {
  const byKey = new Map<string, AdSpendRow>();
  for (const rows of pages) for (const row of rows) byKey.set(key(row), row);
  return [...byKey.values()];
}

/**
 * A synchronous insights request over a long range with daily rows is what
 * Meta answers with "Please reduce the amount of data you're asking for";
 * a month per request stays well clear of it. Only a backfill needs more
 * than one.
 */
const WINDOW_DAYS = 31;

export function adSpendWindows(from: Day, to: Day): Period[] {
  const windows: Period[] = [];
  for (let start = from; start <= to; start = addDays(start, WINDOW_DAYS)) {
    const end = addDays(start, WINDOW_DAYS - 1);
    windows.push({ from: start, to: end < to ? end : to });
  }
  return windows;
}

/**
 * Stored campaign-days inside the window just re-read that the platform no
 * longer reports. Meta omits a campaign-day with no delivery, so a day revised
 * down to nothing (a refunded invalid-click charge, a correction) simply stops
 * appearing — and a row left behind would be money Profit subtracts for spend
 * that did not happen. Outside the window nobody was asked, and nothing is
 * inferred.
 */
export function staleAdSpend<T extends { day: Day; campaign: string }>(
  stored: T[],
  fresh: Array<{ day: Day; campaign: string }>,
  window: Period
): T[] {
  const reported = new Set(fresh.map(key));
  return stored.filter((r) => inPeriod(r.day, window) && !reported.has(key(r)));
}
