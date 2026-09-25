// The top-up: when a page is opened and a source's last good ingest is older
// than ten minutes, today and yesterday are read again before the page
// renders (#124). Pure — which window, and whether to run at all; the running
// is lib/ingest/live.ts.
//
// Ten minutes because Meta itself reports spend 15 minutes to a few hours
// late: reading it more often buys nothing but requests. Today and yesterday
// because those are the days that are still moving; the nightly cron keeps
// re-reading the whole tail (Meta 28 days, Monobank 30), since both revise
// older days too.

import { addDays, kyivDay, type Period } from "../finance/period.ts";
import type { RunState } from "./run.ts";

export const TOP_UP_AFTER_MS = 10 * 60_000;

/**
 * After a failed run the source is left alone for five minutes, so a dead
 * Meta does not make every page wait out the render deadline.
 */
export const RETRY_FAILED_AFTER_MS = 5 * 60_000;

/** How long a page waits for a top-up before it renders what the database has. */
export const RENDER_WAIT_MS = 3_000;

export type TopUpDecision = "unconfigured" | "fresh" | "backing-off" | "due";

export function topUpDecision({
  configured,
  latest,
  latestOk,
  now,
  force = false,
}: {
  configured: boolean;
  latest: RunState | null;
  latestOk: RunState | null;
  now: Date;
  /** «Оновити зараз»: freshness and back-off are the reader's call, not ours. */
  force?: boolean;
}): TopUpDecision {
  if (!configured) return "unconfigured";
  if (force) return "due";
  const age = (run: RunState) => now.getTime() - run.startedAt.getTime();
  if (latestOk && age(latestOk) < TOP_UP_AFTER_MS) return "fresh";
  if (latest && !latest.ok && age(latest) < RETRY_FAILED_AFTER_MS) return "backing-off";
  return "due";
}

/**
 * Yesterday and today in Kyiv, exactly: Meta's stage replaces the whole window
 * it is given, so a wider one would delete days it did not read.
 */
export function topUpDays(now: Date): Period {
  const today = kyivDay(now);
  return { from: addDays(today, -1), to: today };
}

/**
 * Monobank's statement is by instant, not by day: from yesterday's midnight in
 * Kyiv to now. Midnight is taken at +03:00, the earlier of Kyiv's two offsets —
 * in winter that reads an hour more, and the upsert makes it harmless.
 */
export function topUpRange(now: Date): { from: Date; to: Date } {
  return { from: new Date(`${topUpDays(now).from}T00:00:00+03:00`), to: now };
}
