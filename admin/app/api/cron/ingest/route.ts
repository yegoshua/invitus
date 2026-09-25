// The daily ingest, driven by Vercel Cron (admin/vercel.json). One run reads
// every automatic source, each as an independent stage: a failing source is
// written to `ingest_runs` and shows a «Дані станом на …» banner, and the
// others carry on (lib/ingest/run.ts). Today that is Monobank's statement
// and Meta's Ad spend; GA4 (#112) joins as a further stage.
//
// Scheduled 00:30 UTC: 03:30 Kyiv in summer, 02:30 in winter — after the
// day's last payments, before anyone opens the Admin. Hobby allows one a day.
//
// Authenticated like the site's digest cron: Vercel sends `Authorization:
// Bearer $CRON_SECRET` itself. The path is outside the login proxy (a cron
// has no session), so this check is the only thing guarding it.
//
// Re-running is safe — every stage upserts. `?since=YYYY-MM-DD` reads back to
// that day instead of each stage's own look-back, for the first backfill:
//   curl -H "Authorization: Bearer $CRON_SECRET" "https://admin.invitus.com.ua/api/cron/ingest?since=2026-07-01"

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getMerchantStatement } from "@site/lib/monobank";
import { replaceAdSpend } from "@/lib/expenses/store";
import { upsertPaymentFees } from "@/lib/fees/store";
import { ACCOUNTING_START } from "@/lib/finance/orders";
import { addDays, kyivDay, type Day } from "@/lib/finance/period";
import { adSpendWindows, mergeAdSpend, type AdSpendRow } from "@/lib/ingest/ad-spend";
import { adAccountId, insightsPages } from "@/lib/ingest/meta-client";
import { mapInsights } from "@/lib/ingest/meta-insights";
import { mapStatement, mergeWindows, statementWindows, type PaymentFeeRow } from "@/lib/ingest/monobank-statement";
import { runStages, type IngestStage } from "@/lib/ingest/run";
import { recordIngestRun } from "@/lib/ingest/store";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Nightly look-back: late status changes (hold → success) and a missed night are both caught. */
const LOOKBACK_DAYS = 30;

/**
 * Meta's look-back, in days before today. Spend mostly settles within a few
 * days, but Meta treats insights as open to revision for up to 28 — its
 * longest attribution window — and back-fills late corrections into past
 * days. Re-reading all 28 every night is still one request of campaigns × 29
 * rows, so there is nothing to save by cutting it closer, and a week of
 * missed nights is caught along the way.
 */
const META_LOOKBACK_DAYS = 28;

function matchesSecret(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** `since` when it is a real day from the accounting start on; null otherwise. */
function sinceDay(since: string | null): Day | null {
  return since && /^\d{4}-\d{2}-\d{2}$/.test(since) && since >= ACCOUNTING_START ? since : null;
}

/** Where the Monobank look-back starts. */
function startOf(since: Day | null, now: Date): Date {
  const fallback = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
  if (!since) return fallback;
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

/**
 * Meta's Ad spend over from..to, re-read in full: every campaign-day
 * upserted, every stored one Meta no longer reports deleted (replaceAdSpend).
 * The days are the ad account's own — it must be set to Europe/Kyiv, or a
 * day's spend lands on a neighbouring Kyiv day.
 */
function metaStage(from: Day, to: Day): IngestStage {
  return {
    source: "meta",
    async run() {
      const token = process.env.META_ACCESS_TOKEN;
      const rawAccount = process.env.META_AD_ACCOUNT_ID;
      if (!token || !rawAccount) {
        throw new Error("Meta is not configured: META_ACCESS_TOKEN and META_AD_ACCOUNT_ID must both be set");
      }
      const account = adAccountId(rawAccount);
      const pages: AdSpendRow[][] = [];
      for (const window of adSpendWindows(from, to)) {
        for await (const body of insightsPages({ token, account, window })) {
          const { rows, skipped } = mapInsights(body);
          pages.push(rows);
          if (skipped.length) console.warn(`[ingest] meta: skipped ${skipped.length} unreadable row(s):`, skipped);
        }
      }
      // Nothing is written until every window has been read: a half-read
      // window would make the unread half look revised to zero.
      const rows = mergeAdSpend(pages);
      const { removed } = await replaceAdSpend("meta", { from, to }, rows);
      if (removed) console.log(`[ingest] meta: removed ${removed} campaign-day(s) Meta no longer reports`);
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
  const since = sinceDay(new URL(req.url).searchParams.get("since"));
  const today = kyivDay(now);
  const metaFrom = since && since < today ? since : addDays(today, -META_LOOKBACK_DAYS);
  const runs = await runStages([monobankStage(startOf(since, now), now), metaStage(metaFrom, today)], recordIngestRun);

  for (const r of runs) {
    if (r.ok) console.log(`[ingest] ${r.source}: ${r.rows} row(s)`);
    else console.error(`[ingest] ${r.source} failed: ${r.error}`);
  }
  const ok = runs.every((r) => r.ok);
  // 500 when any stage failed, so the failure is also visible in Vercel's cron log.
  return NextResponse.json({ ok, runs }, { status: ok ? 200 : 500 });
}
