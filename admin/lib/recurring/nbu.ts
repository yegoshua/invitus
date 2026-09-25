// The NBU's official dollar rate for a day. Public, no key. The NBU sets a
// rate for every calendar day, weekends included, a day ahead; an empty answer
// (a day it has not published yet) falls back to the latest earlier day, but
// no further than a week. A request that fails is an error, not a reason to
// reach for an older rate — the generator leaves the day pending instead.
// Relative imports only: node:test runs this directly.

import { addDays, type Day } from "../finance/period.ts";
import { parseNbuRate, type NbuRate } from "./currency.ts";

const FALLBACK_DAYS = 7;
const TIMEOUT_MS = 8_000;

export function nbuUrl(day: Day): string {
  return `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date=${day.replaceAll("-", "")}&json`;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`NBU answered ${res.status}`);
  return res.json();
}

export async function nbuUsdRate(day: Day, get: (url: string) => Promise<unknown> = fetchJson): Promise<NbuRate> {
  for (let back = 0; back <= FALLBACK_DAYS; back++) {
    const rate = parseNbuRate(await get(nbuUrl(addDays(day, -back))));
    if (rate) return rate;
  }
  throw new Error(`NBU has no USD rate for ${day} or the ${FALLBACK_DAYS} days before`);
}
