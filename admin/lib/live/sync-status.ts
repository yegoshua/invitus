// What the sync badge says about each source (#124): KeyCRM, read on every
// page open, and the ingest sources, topped up when over ten minutes old.
// Pure, so the rules for "stale" versus "down" are tested rather than read
// off the markup.

import type { Freshness } from "../ingest/run.ts";

export type SyncState = "ok" | "stale" | "down" | "unknown" | "off";

export interface SyncRow {
  name: string;
  state: SyncState;
  /** When the figures on screen were read. */
  at: Date | null;
}

type OrdersSync = { ok: boolean; fetchedAt: Date | null; error: string | null };
type SourceSync = { source: string; configured: false } | { source: string; configured: true; freshness: Freshness | null };

const NAMES: Record<string, string> = { meta: "Meta", monobank: "Monobank", ga4: "GA4" };

function sourceRow(s: SourceSync): SyncRow {
  const name = NAMES[s.source] ?? s.source;
  // Not connected is a fact about the setup, not a failure.
  if (!s.configured) return { name, state: "off", at: null };
  // The journal itself could not be read; the database banner says why.
  if (!s.freshness) return { name, state: "unknown", at: null };
  const { freshness: f } = s;
  if (f.state === "fresh") return { name, state: "ok", at: f.asOf };
  return { name, state: f.asOf ? "stale" : "down", at: f.asOf };
}

export function syncRows(orders: OrdersSync, sources: SourceSync[]): SyncRow[] {
  const keycrm: SyncRow = !orders.ok || !orders.fetchedAt
    ? { name: "KeyCRM", state: "down", at: null }
    : { name: "KeyCRM", state: orders.error ? "stale" : "ok", at: orders.fetchedAt };
  return [keycrm, ...sources.map(sourceRow)];
}

const RANK: Record<SyncState, number> = { off: 0, ok: 1, unknown: 2, stale: 3, down: 4 };

/** One dot for the phone's top bar. */
export function worstState(rows: Array<{ state: SyncState }>): SyncState {
  return rows.reduce<SyncState>((w, r) => (RANK[r.state] > RANK[w] ? r.state : w), "ok");
}

const TIME = new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", hour: "2-digit", minute: "2-digit" });
const DATE = new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", day: "2-digit", month: "2-digit" });
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" });

/** "13:15" today, "25.09, 13:15" another day — Kyiv time either way. */
export function syncTime(at: Date, now: Date): string {
  return DAY.format(at) === DAY.format(now) ? TIME.format(at) : `${DATE.format(at)}, ${TIME.format(at)}`;
}
