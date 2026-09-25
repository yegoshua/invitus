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

/** A claim older than this is taken to belong to an instance that died. */
const CLAIM_EXPIRES_SECONDS = 120;

/**
 * Takes the top-up claim on a source, across every server instance: the token
 * when this caller now holds it, null when someone else does.
 */
export async function claimIngest(source: IngestSource): Promise<string | null> {
  const sql = requireDb();
  const token = crypto.randomUUID();
  const rows = await sql`
    INSERT INTO ingest_claims (source, claimed_at, token) VALUES (${source}, now(), ${token})
    ON CONFLICT (source) DO UPDATE SET claimed_at = now(), token = EXCLUDED.token
    WHERE ingest_claims.claimed_at IS NULL
       OR ingest_claims.claimed_at < now() - make_interval(secs => ${CLAIM_EXPIRES_SECONDS})
    RETURNING source`;
  return rows.length ? token : null;
}

export async function releaseIngest(source: IngestSource, token: string): Promise<void> {
  const sql = requireDb();
  await sql`UPDATE ingest_claims SET claimed_at = NULL, token = NULL WHERE source = ${source} AND token = ${token}`;
}
