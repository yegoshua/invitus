// Fee rates, Monobank's actual fees and the ingest journal, in Postgres. No
// rules of their own: what a fee is lives in lib/finance/fees.ts, what the
// statement says in lib/ingest/monobank-statement.ts.

import { cache } from "react";
import { db } from "@/lib/db";
import type { Author } from "@/lib/expenses/store";
import { actualFeesByOrder, DEFAULT_FEE_PERCENT, type ActualFee, type FeeRates } from "@/lib/finance/fees";
import type { PaymentFeeRow } from "@/lib/ingest/monobank-statement";
import { freshness, type Freshness, type IngestRun, type IngestSource, type RunState } from "@/lib/ingest/run";

function requireDb() {
  const sql = db();
  if (!sql) throw new Error("DATABASE_URL is not set");
  return sql;
}

export interface FeeData {
  /** False when the database answered with an error: the figures below are the fallback. */
  ok: boolean;
  rates: FeeRates;
  /** Actual fees by KeyCRM order id. */
  actual: ReadonlyMap<number, ActualFee>;
  /** How fresh the Monobank figures are; null when there is no database to have run into. */
  monobank: Freshness | null;
}

/** The latest run and the latest successful one, for the banner. */
async function runStates(source: IngestSource): Promise<{ latest: RunState | null; latestOk: RunState | null }> {
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
 * Everything a page needs about fees, read once per request. Without a
 * database the estimate runs on the default rates; with a failing one too,
 * and `ok: false` says so.
 */
export const loadFees = cache(async (): Promise<FeeData> => {
  const fallback = { rates: DEFAULT_FEE_PERCENT, actual: new Map<number, ActualFee>(), monobank: null };
  const sql = db();
  if (!sql) return { ok: true, ...fallback };
  try {
    const [rates, fees, runs] = await Promise.all([
      sql<Array<{ payment_method_id: number; percent: string }>>`SELECT payment_method_id, percent FROM fee_rates`,
      sql<Array<{ order_id: number | null; fee_kop: string; paid_on: string }>>`
        SELECT order_id, fee_kop, paid_on::text AS paid_on FROM payment_fees WHERE order_id IS NOT NULL`,
      runStates("monobank"),
    ]);
    return {
      ok: true,
      // A method with no row yet (added to KeyCRM later) keeps its default.
      rates: { ...DEFAULT_FEE_PERCENT, ...Object.fromEntries(rates.map((r) => [r.payment_method_id, Number(r.percent)])) },
      actual: actualFeesByOrder(fees.map((f) => ({ orderId: f.order_id, feeKop: Number(f.fee_kop), paidOn: f.paid_on }))),
      monobank: freshness(runs.latest, runs.latestOk, new Date()),
    };
  } catch (error) {
    console.error("[fees] load failed:", error);
    return { ok: false, ...fallback };
  }
});

export async function saveFeeRates(rates: Record<number, number>, editor: Author): Promise<void> {
  const sql = requireDb();
  const rows = Object.entries(rates).map(([id, percent]) => ({
    payment_method_id: Number(id),
    percent,
    updated_by_id: editor.userId,
    updated_by_name: editor.name,
  }));
  if (rows.length === 0) return;
  await sql`
    INSERT INTO fee_rates ${sql(rows, "payment_method_id", "percent", "updated_by_id", "updated_by_name")}
    ON CONFLICT (payment_method_id) DO UPDATE
    SET percent = EXCLUDED.percent, updated_by_id = EXCLUDED.updated_by_id,
        updated_by_name = EXCLUDED.updated_by_name, updated_at = now()`;
}

/** Idempotent: an invoice read twice is one row, carrying what the bank said last. */
export async function upsertPaymentFees(rows: PaymentFeeRow[]): Promise<void> {
  if (rows.length === 0) return;
  const sql = requireDb();
  const values = rows.map((r) => ({
    invoice_id: r.invoiceId,
    order_id: r.orderId,
    amount_kop: r.amountKop,
    fee_kop: r.feeKop,
    paid_at: r.paidAt,
    paid_on: r.paidOn,
    payment_scheme: r.paymentScheme,
  }));
  await sql`
    INSERT INTO payment_fees ${sql(values, "invoice_id", "order_id", "amount_kop", "fee_kop", "paid_at", "paid_on", "payment_scheme")}
    ON CONFLICT (invoice_id) DO UPDATE
    SET order_id = EXCLUDED.order_id, amount_kop = EXCLUDED.amount_kop, fee_kop = EXCLUDED.fee_kop,
        paid_at = EXCLUDED.paid_at, paid_on = EXCLUDED.paid_on, payment_scheme = EXCLUDED.payment_scheme,
        ingested_at = now()`;
}

export async function recordIngestRun(run: IngestRun): Promise<void> {
  const sql = requireDb();
  await sql`
    INSERT INTO ingest_runs (source, started_at, finished_at, ok, row_count, error)
    VALUES (${run.source}, ${run.startedAt}, ${run.finishedAt}, ${run.ok}, ${run.rows}, ${run.error})`;
}
