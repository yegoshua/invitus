// The ingest journal in Postgres: every run of every source, and how fresh
// that makes each one. No rules of its own — what "fresh" means is
// freshness() in ./run.ts.

import { cache } from "react";
import { db } from "@/lib/db";
import { freshness, type Freshness, type IngestRun, type IngestSource, type RunState } from "./run";

function requireDb() {
  const sql = db();
  if (!sql) throw new Error("DATABASE_URL is not set");
  return sql;
}

/** The latest run and the latest successful one, for the banner. */
export async function runStates(source: IngestSource): Promise<{ latest: RunState | null; latestOk: RunState | null }> {
  const sql = requireDb();
  // One row per outcome: the newest success and the newest failure.
  const rows = await sql<Array<{ started_at: Date; ok: boolean; error: string | null }>>`
    SELECT DISTINCT ON (ok) started_at, ok, error FROM ingest_runs
    WHERE source = ${source}
    ORDER BY ok, started_at DESC`;
  const states = rows.map((r) => ({ startedAt: r.started_at, ok: r.ok, error: r.error }));
  const latestOk = states.find((s) => s.ok) ?? null;
  const latest = states.reduce<RunState | null>((a, s) => (!a || s.startedAt > a.startedAt ? s : a), null);
  return { latest, latestOk };
}

/**
 * How fresh a source's data is, once per request. Null when there is no
 * database, or it failed to answer — the page's own database banner says so,
 * and a second banner about the same outage would only add noise.
 */
export const loadFreshness = cache(async (source: IngestSource): Promise<Freshness | null> => {
  if (!db()) return null;
  try {
    const { latest, latestOk } = await runStates(source);
    return freshness(latest, latestOk, new Date());
  } catch (error) {
    console.error(`[ingest] ${source} freshness failed:`, error);
    return null;
  }
});

export async function recordIngestRun(run: IngestRun): Promise<void> {
  const sql = requireDb();
  await sql`
    INSERT INTO ingest_runs (source, started_at, finished_at, ok, row_count, error)
    VALUES (${run.source}, ${run.startedAt}, ${run.finishedAt}, ${run.ok}, ${run.rows}, ${run.error})`;
}
