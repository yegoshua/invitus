// The daily ingest, driven by Vercel Cron (admin/vercel.json). One run reads
// every automatic source, each as an independent stage: a failing source is
// written to `ingest_runs` and shows a «Дані станом на …» banner, and the
// others carry on (lib/ingest/run.ts). Today that is Monobank's statement;
// Meta (#111) and GA4 (#112) join as further stages.
//
// Scheduled 00:30 UTC: 03:30 Kyiv in summer, 02:30 in winter — after the
// day's last payments, before anyone opens the Admin. Hobby allows one a day.
//
// Authenticated like the site's digest cron: Vercel sends `Authorization:
// Bearer $CRON_SECRET` itself. The path is outside the login proxy (a cron
// has no session), so this check is the only thing guarding it.
//
// Re-running is safe — every stage upserts. `?since=YYYY-MM-DD` reads back to
// that day instead of the last 30, for the first backfill:
//   curl -H "Authorization: Bearer $CRON_SECRET" "https://admin.invitus.com.ua/api/cron/ingest?since=2026-07-01"

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getMerchantStatement } from "@site/lib/monobank";
import { recordIngestRun, upsertPaymentFees } from "@/lib/fees/store";
import { ACCOUNTING_START } from "@/lib/finance/orders";
import { mapStatement, mergeWindows, statementWindows, type PaymentFeeRow } from "@/lib/ingest/monobank-statement";
import { runStages, type IngestStage } from "@/lib/ingest/run";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Nightly look-back: late status changes (hold → success) and a missed night are both caught. */
const LOOKBACK_DAYS = 30;

function matchesSecret(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Where the look-back starts: `since` when it is a real day from the accounting start on. */
function startOf(since: string | null, now: Date): Date {
  const fallback = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
  if (!since || !/^\d{4}-\d{2}-\d{2}$/.test(since) || since < ACCOUNTING_START) return fallback;
  // Midnight Kyiv is 21:00 or 22:00 UTC the day before; starting at the
  // earlier of the two only reads an hour more.
  const d = new Date(`${since}T00:00:00+03:00`);
  return Number.isNaN(d.getTime()) || d >= now ? fallback : d;
}

function monobankStage(from: Date, to: Date): IngestStage {
  return {
    source: "monobank",
    async run() {
      if (!process.env.MONOBANK_TOKEN) throw new Error("MONOBANK_TOKEN is not set");
      const windows: PaymentFeeRow[][] = [];
      for (const w of statementWindows(from, to)) {
        const { rows: got, skipped } = mapStatement(await getMerchantStatement(w.from, w.to));
        windows.push(got);
        // A held or failed payment is normal; anything else is a row we could not read.
        const odd = skipped.filter((s) => !s.reason.startsWith("status "));
        if (odd.length) console.warn(`[ingest] monobank: skipped ${odd.length} unreadable row(s):`, odd);
      }
      const rows = mergeWindows(windows);
      await upsertPaymentFees(rows);
      return { rows: rows.length };
    },
  };
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[ingest] CRON_SECRET is not set — refusing");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!matchesSecret(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Nowhere to write the data or the journal: nothing to run.
  if (!db()) return NextResponse.json({ error: "No database" }, { status: 500 });

  const now = new Date();
  const since = startOf(new URL(req.url).searchParams.get("since"), now);
  const runs = await runStages([monobankStage(since, now)], recordIngestRun);

  for (const r of runs) {
    if (r.ok) console.log(`[ingest] ${r.source}: ${r.rows} row(s)`);
    else console.error(`[ingest] ${r.source} failed: ${r.error}`);
  }
  const ok = runs.every((r) => r.ok);
  // 500 when any stage failed, so the failure is also visible in Vercel's cron log.
  return NextResponse.json({ ok, runs }, { status: ok ? 200 : 500 });
}
