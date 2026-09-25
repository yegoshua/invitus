// The Meta Marketing API, read-only: one Insights query per window, pages
// followed through `paging.next`. What the JSON means is meta-insights.ts.
//
// The token rides in the query string, as Meta documents it and as every
// `paging.next` link it returns carries it anyway — so no URL from here is
// ever logged or put in an error, and every message is scrubbed of the token
// before it leaves. A `next` link is followed only to graph.facebook.com.
//
// Relative imports only: node:test runs this directly.

import type { Period } from "../finance/period.ts";

/** Current as of 2026-07 (v26.0); Meta keeps a version for about two years. */
export const GRAPH_VERSION = "v26.0";
const GRAPH = "https://graph.facebook.com";
const FIELDS = ["campaign_id", "campaign_name", "spend", "account_currency"];
const TIMEOUT_MS = 15_000;
/** A month of campaign-days is a page or two; this only stops a link loop. */
const MAX_PAGES = 50;

/** "act_<digits>", from the id with or without its prefix, as Ads Manager shows either. */
export function adAccountId(raw: string): string {
  const m = /^(?:act_)?(\d{1,20})$/.exec(raw.trim());
  if (!m) throw new Error("META_AD_ACCOUNT_ID must be the ad account's number (act_123… or 123…)");
  return `act_${m[1]}`;
}

export function insightsUrl(account: string, window: Period, token: string): string {
  const url = new URL(`${GRAPH}/${GRAPH_VERSION}/${account}/insights`);
  url.searchParams.set("level", "campaign");
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("time_range", JSON.stringify({ since: window.from, until: window.to }));
  url.searchParams.set("fields", FIELDS.join(","));
  url.searchParams.set("limit", "500");
  url.searchParams.set("access_token", token);
  return url.toString();
}

function scrub(text: string, token: string): string {
  return token ? text.split(token).join("[token]") : text;
}

async function getJson(url: string, token: string, fetchImpl: typeof fetch): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (error) {
    // Deliberately not the error itself: undici's cause can quote the URL.
    const name = error instanceof Error ? error.name : "Error";
    throw new Error(name === "TimeoutError" ? `Meta did not answer in ${TIMEOUT_MS / 1000}s` : `Meta request failed (${name})`);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as { error?: { message?: unknown; code?: unknown } } | null)?.error;
    const text = typeof err?.message === "string" ? err.message : res.statusText || "no message";
    const code = err?.code !== undefined ? ` (code ${String(err.code)})` : "";
    throw new Error(scrub(`Meta ${res.status}: ${text}${code}`, token));
  }
  return body;
}

export interface InsightsQuery {
  token: string;
  /** "act_…", from adAccountId. */
  account: string;
  window: Period;
  fetch?: typeof fetch;
}

/** Each page's raw JSON, in order. Throws on the first failure: a window read in part is not read. */
export async function* insightsPages({ token, account, window, fetch: fetchImpl = fetch }: InsightsQuery): AsyncGenerator<unknown> {
  let url: string | null = insightsUrl(account, window, token);
  for (let page = 0; url; page++) {
    if (page === MAX_PAGES) throw new Error(`Meta insights ran past ${MAX_PAGES} pages`);
    const body = await getJson(url, token, fetchImpl);
    yield body;
    const next = (body as { paging?: { next?: unknown } } | null)?.paging?.next;
    if (typeof next !== "string" || !next) url = null;
    else if (new URL(next).origin !== GRAPH) throw new Error("Meta insights: refusing a next page outside graph.facebook.com");
    else url = next;
  }
}
