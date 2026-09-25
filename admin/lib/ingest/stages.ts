// The ingest stages, by window: the nightly cron runs them over the whole tail
// (app/api/cron/ingest), the top-up over today and yesterday (./live.ts). One
// implementation, so a top-up writes exactly what the night would have.

import { getMerchantStatement } from "@site/lib/monobank";
import { replaceAdSpend } from "@/lib/expenses/store";
import { upsertPaymentFees } from "@/lib/fees/store";
import type { Day } from "@/lib/finance/period";
import { adSpendWindows, mergeAdSpend, type AdSpendRow } from "./ad-spend";
import { adAccountId, insightsPages } from "./meta-client";
import { mapInsights } from "./meta-insights";
import { mapStatement, mergeWindows, statementWindows, type PaymentFeeRow } from "./monobank-statement";
import type { IngestStage, IngestSource } from "./run";

/** The sources a page top-up can reach. GA4 (#112) joins when it has a stage. */
export type LiveSource = Extract<IngestSource, "monobank" | "meta">;
export const LIVE_SOURCES: LiveSource[] = ["meta", "monobank"];

/**
 * Whether the source has what it needs to be read. The cron runs an
 * unconfigured stage anyway so the journal says why; a page top-up skips it,
 * so a missing token costs no render time.
 */
export function sourceConfigured(source: LiveSource): boolean {
  if (source === "monobank") return !!process.env.MONOBANK_TOKEN;
  return !!process.env.META_ACCESS_TOKEN && !!process.env.META_AD_ACCOUNT_ID;
}

/** Monobank's statement from..to, upserted on invoice_id. */
export function monobankStage(from: Date, to: Date): IngestStage {
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
 * upserted, every stored one Meta no longer reports deleted (replaceAdSpend) —
 * inside from..to only, so the window must be exactly the days that were read.
 * The days are the ad account's own — it must be set to Europe/Kyiv, or a
 * day's spend lands on a neighbouring Kyiv day.
 */
export function metaStage(from: Day, to: Day): IngestStage {
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
