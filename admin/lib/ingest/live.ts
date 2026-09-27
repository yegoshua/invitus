// Live data (#124): Meta and Monobank are topped up — today and yesterday —
// when a page is opened and their last good ingest is over ten minutes old,
// and on «Оновити зараз». The rules (when, which window) are ./top-up.ts; this
// is the running: the same stages as the nightly cron (./stages.ts), written
// to `ingest_runs` the same way, one at a time per source.
//
// One at a time twice over: in this process a second page joins the first
// one's run (singleFlight), and across server instances the `ingest_claims`
// row decides who reads (claimIngest) — the other simply renders what the
// database has.

import { after } from "next/server";
import { cache } from "react";
import { db } from "@/lib/db";
import { settledWithin, singleFlight } from "@/lib/live/flight";
import { fullSyncWarning, runStages, type Freshness, type IngestRun } from "./run";
import { LIVE_SOURCES, metaStage, monobankStage, sourceConfigured, type LiveSource } from "./stages";
import { claimIngest, latestFullRun, loadFreshness, recordIngestRun, releaseIngest, runStates } from "./store";
import { RENDER_WAIT_MS, topUpDays, topUpDecision, topUpRange } from "./top-up";

const flight = singleFlight<LiveSource, IngestRun | null>();

/** Null when another instance holds the claim, or the claim could not be taken. */
function topUp(source: LiveSource): Promise<IngestRun | null> {
  return flight.run(source, async () => {
    let token: string | null;
    try {
      token = await claimIngest(source);
    } catch (error) {
      // Most likely 0004_ingest_claims.sql not applied. The page renders
      // without the top-up rather than risk two of them.
      console.error(`[live] could not claim ${source}:`, error);
      return null;
    }
    if (!token) return null;
    try {
      const now = new Date();
      const days = topUpDays(now);
      const range = topUpRange(now);
      const stage = source === "meta" ? metaStage(days.from, days.to, "top-up") : monobankStage(range.from, range.to, "top-up");
      const [run] = await runStages([stage], recordIngestRun);
      if (run.ok) console.log(`[live] ${source} topped up: ${run.rows} row(s)`);
      else console.error(`[live] ${source} top-up failed: ${run.error}`);
      return run;
    } finally {
      await releaseIngest(source, token).catch((error) => console.error(`[live] could not release ${source}:`, error));
    }
  });
}

async function topUpIfStale(source: LiveSource): Promise<void> {
  if (!sourceConfigured(source)) return;
  if (!flight.running(source)) {
    const { latest, latestOk } = await runStates(source);
    if (topUpDecision({ configured: true, latest, latestOk, now: new Date() }) !== "due") return;
  }
  await topUp(source);
}

/** Waits up to `ms` for the work; whatever is left finishes after the response. */
async function awaitOrDefer(work: Promise<unknown>, ms: number): Promise<void> {
  if (!(await settledWithin(work, ms))) after(() => work);
}

/**
 * Before a page reads Ad spend, fees or their freshness: top up every stale
 * source, waiting at most RENDER_WAIT_MS. Once per request, so the layout and
 * the page share it — and both must await it before those reads, or they
 * render what was there before.
 */
export const topUpStaleSources = cache(async (): Promise<void> => {
  if (!db()) return;
  const work = Promise.allSettled(
    LIVE_SOURCES.map((s) => topUpIfStale(s).catch((error) => console.error(`[live] ${s} top-up check failed:`, error)))
  );
  await awaitOrDefer(work, RENDER_WAIT_MS);
});

/** «Оновити зараз»: both sources, fresh or not. */
export async function topUpAllNow(deadlineMs: number): Promise<void> {
  if (!db()) return;
  const work = Promise.allSettled(LIVE_SOURCES.filter(sourceConfigured).map(topUp));
  await awaitOrDefer(work, deadlineMs);
}

export type SourceSync =
  | { source: LiveSource; configured: false }
  | {
      source: LiveSource;
      configured: true;
      freshness: Freshness | null;
      /** Set when the last full run is over 36 h old while top-ups keep the data fresh. */
      fullSync: { since: Date | null } | null;
    };

async function latestFullOrNull(source: LiveSource): Promise<Date | null | undefined> {
  try {
    return await latestFullRun(source);
  } catch (error) {
    console.error(`[live] ${source} full-run check failed:`, error);
    return undefined;
  }
}

/** Per source, for the sync badge — after the top-up, so it reports what the page shows. */
export const loadSourceSync = cache(async (): Promise<SourceSync[]> => {
  await topUpStaleSources();
  const now = new Date();
  return Promise.all(
    LIVE_SOURCES.map(async (source): Promise<SourceSync> => {
      if (!sourceConfigured(source)) return { source, configured: false };
      const [freshness, latestFull] = await Promise.all([loadFreshness(source), db() ? latestFullOrNull(source) : undefined]);
      // undefined: the journal could not be read — the database banner covers it.
      const fullSync = latestFull === undefined ? null : fullSyncWarning({ configured: true, freshness, latestFullOk: latestFull, now });
      return { source, configured: true, freshness, fullSync };
    })
  );
});
