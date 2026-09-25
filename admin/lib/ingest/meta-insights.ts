// Meta Marketing API Insights (GET /{act_id}/insights, level=campaign,
// time_increment=1) → Ad spend rows (./ad-spend.ts). Pure: the fetch is in
// meta-client.ts, this only reads the JSON.
//
// One row per campaign per day, keyed by the campaign *id* — a campaign can be
// renamed in Ads Manager, and the title follows it on the next upsert, but the
// id never changes, so a rename is an update and not a second row.
//
// The amounts are in the ad account's currency. The account is expected in
// hryvnias; converting is out of scope (PRD #103), so an account in anything
// else fails the stage loudly rather than storing dollars as hryvnias.

import { spendKopecks, type AdSpendRow } from "./ad-spend.ts";

export interface InsightsResult {
  rows: AdSpendRow[];
  skipped: Array<{ campaign: string | null; day: string | null; reason: string }>;
}

const CURRENCY = "UAH";
/** expenses.title is CHECK (char_length(title) BETWEEN 1 AND 200). */
const MAX_TITLE = 200;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function title(name: unknown, campaign: string): string {
  const label = typeof name === "string" && name.trim() ? name.trim() : `кампанія ${campaign}`;
  return `Meta · ${label}`.slice(0, MAX_TITLE);
}

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/**
 * One page of the response. Throws when the body is not an insights page at
 * all, or when the account is not in hryvnias — those are a failed run, not
 * an empty day. A single unreadable row is skipped and named.
 */
export function mapInsights(json: unknown): InsightsResult {
  const data = json && typeof json === "object" ? (json as { data?: unknown }).data : undefined;
  if (!Array.isArray(data)) throw new Error("Meta insights response has no data");

  const rows: AdSpendRow[] = [];
  const skipped: InsightsResult["skipped"] = [];

  for (const raw of data) {
    if (!raw || typeof raw !== "object") {
      skipped.push({ campaign: null, day: null, reason: "not an object" });
      continue;
    }
    const item = raw as Record<string, unknown>;
    // Before anything else: a wrong currency is wrong for every row, so it
    // fails the run even on a row that would have been dropped.
    const currency = str(item.account_currency);
    if (currency !== CURRENCY) {
      throw new Error(
        currency
          ? `Meta ad account is in ${currency}, not ${CURRENCY} — Admin does not convert currencies`
          : "Meta did not report the account currency (account_currency) — refusing amounts of unknown currency"
      );
    }
    const campaign = str(item.campaign_id);
    const start = str(item.date_start);
    const day = start && DAY.test(start) ? start : null;
    if (!campaign) {
      skipped.push({ campaign: null, day, reason: "no campaign_id" });
      continue;
    }
    if (!day) {
      skipped.push({ campaign, day: null, reason: "no date_start" });
      continue;
    }
    const stop = str(item.date_stop) ?? day;
    if (stop !== day) {
      skipped.push({ campaign, day, reason: `not one day (${day}..${stop})` });
      continue;
    }
    const amountKop = spendKopecks(item.spend as string);
    if (amountKop === null) {
      skipped.push({ campaign, day, reason: `unreadable spend ${String(item.spend)}` });
      continue;
    }
    // A campaign that ran and spent nothing: no Expense, and nothing wrong.
    if (amountKop === 0) continue;
    rows.push({ day, campaign, title: title(item.campaign_name, campaign), amountKop });
  }
  return { rows, skipped };
}

