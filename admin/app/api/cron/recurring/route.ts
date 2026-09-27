// Recurring payments (#121): writes each subscription into the Expenses
// journal on the Kyiv day it is due (lib/recurring/store.ts), driven by
// Vercel Cron (admin/vercel.json).
//
// Scheduled 03:00 UTC — 06:00 Kyiv in summer, 05:00 in winter: always after
// Kyiv midnight, so "today" is the day the money leaves, and before anyone
// opens the Admin. Hobby runs crons once a day, which is all this needs; a
// missed night is caught up by the next run, and re-running writes nothing
// twice.
//
// Authenticated like the other crons: Vercel sends `Authorization: Bearer
// $CRON_SECRET` itself, and proxy.ts lets api/cron/ through without a session,
// so this check is the only thing guarding the path.

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kyivDay } from "@/lib/finance/period";
import { GenerationError, generateRecurring, recordRecurringRun } from "@/lib/recurring/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function matchesSecret(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[recurring] CRON_SECRET is not set — refusing");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!matchesSecret(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db()) return NextResponse.json({ error: "No database" }, { status: 500 });

  const startedAt = new Date();
  let run: { ok: boolean; rows: number | null; error: string | null };
  try {
    run = { ok: true, rows: await generateRecurring(kyivDay(startedAt)), error: null };
  } catch (error) {
    run = {
      ok: false,
      rows: error instanceof GenerationError ? error.created : null,
      error: (error instanceof Error ? error.message : String(error)).slice(0, 500),
    };
  }
  try {
    await recordRecurringRun({ ...run, startedAt, finishedAt: new Date() });
  } catch (error) {
    console.error("[recurring] could not record the run:", error);
  }

  if (run.ok) console.log(`[recurring] ${run.rows} expense(s) written`);
  else console.error(`[recurring] failed: ${run.error}`);
  // 500 on failure, so it is visible in Vercel's cron log too.
  return NextResponse.json(run, { status: run.ok ? 200 : 500 });
}
