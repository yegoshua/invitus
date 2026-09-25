// The daily ingest: independent stages, each one recorded in `ingest_runs`,
// success or failure. Pure orchestration — the stages and the journal are
// handed in — so "one source failing stops none of the others" is a tested
// rule rather than a try/catch someone might later widen.
//
// A source is added (#111 Meta, #112 GA4) by adding a stage to the route and
// a name here; nothing else changes.

export type IngestSource = "monobank" | "meta" | "ga4";

/**
 * `full`: the nightly cron's long window (or a `?since=` backfill), the only
 * run that catches changes made back in time. `top-up`: today and yesterday,
 * run when a page is opened (#124).
 */
export type IngestKind = "full" | "top-up";

export interface IngestStage {
  source: IngestSource;
  /** Defaults to `full`. */
  kind?: IngestKind;
  /** Throws on failure; the message is what the journal and the banner show. */
  run: () => Promise<{ rows: number }>;
}

export interface IngestRun {
  source: IngestSource;
  kind: IngestKind;
  startedAt: Date;
  finishedAt: Date;
  ok: boolean;
  rows: number | null;
  error: string | null;
}

const MAX_ERROR = 500;

function message(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.length > MAX_ERROR ? `${text.slice(0, MAX_ERROR - 1)}…` : text;
}

/**
 * Runs the stages one after another. Sequential on purpose: each source has
 * its own rate limit, and a daily job has time to spare.
 */
export async function runStages(
  stages: IngestStage[],
  record: (run: IngestRun) => Promise<void>,
  clock: () => Date = () => new Date()
): Promise<IngestRun[]> {
  const runs: IngestRun[] = [];
  for (const stage of stages) {
    const startedAt = clock();
    const base = { source: stage.source, kind: stage.kind ?? "full", startedAt };
    let run: IngestRun;
    try {
      const { rows } = await stage.run();
      run = { ...base, finishedAt: clock(), ok: true, rows, error: null };
    } catch (error) {
      run = { ...base, finishedAt: clock(), ok: false, rows: null, error: message(error) };
    }
    try {
      await record(run);
    } catch (error) {
      // The data itself landed (or did not) either way; only the journal
      // entry is lost, and the banner will call the source stale tomorrow.
      console.error(`[ingest] could not record the ${stage.source} run:`, error);
    }
    runs.push(run);
  }
  return runs;
}

export interface RunState {
  startedAt: Date;
  ok: boolean;
  error: string | null;
}

export type Freshness = { state: "fresh"; asOf: Date } | { state: "stale"; asOf: Date | null; error: string | null };

/** A daily cron that has not succeeded in a day and a half has missed a night. */
const STALE_AFTER_MS = 36 * 3_600_000;

/**
 * Whether a source's data can be shown without a «Дані станом на …» banner:
 * its latest run worked, and recently. Otherwise the data is as of the last
 * run that did work — or of never.
 */
export function freshness(latest: RunState | null, latestOk: RunState | null, now: Date): Freshness {
  const asOf = latestOk?.startedAt ?? null;
  if (latest?.ok && asOf && now.getTime() - asOf.getTime() <= STALE_AFTER_MS) return { state: "fresh", asOf };
  return { state: "stale", asOf, error: latest && !latest.ok ? latest.error : null };
}

/**
 * The top-ups keep a source fresh by the rule above, but they read two days;
 * a refund or a Meta revision further back is caught only by a full run. So
 * a full run older than STALE_AFTER_MS is its own warning — `since` is when
 * the last one worked, null for never. Nothing for a source that is not
 * configured, nor while the data itself is stale or unknown: that banner
 * already says more.
 */
export function fullSyncWarning({
  configured,
  freshness,
  latestFullOk,
  now,
}: {
  configured: boolean;
  freshness: Freshness | null;
  latestFullOk: Date | null;
  now: Date;
}): { since: Date | null } | null {
  if (!configured || freshness?.state !== "fresh") return null;
  if (latestFullOk && now.getTime() - latestFullOk.getTime() <= STALE_AFTER_MS) return null;
  return { since: latestFullOk };
}
