// The Finance chat's daily digest, driven by Vercel Cron (admin/vercel.json).
//
// It runs here, in the Admin, rather than beside the orders digest in the
// site, because Profit needs the Expenses and the Expenses live in the
// Admin's database. Giving the public shop a connection string to that
// database is the thing ADR 0001 split the Admin off to avoid; the Admin
// already holds everything this needs — KeyCRM read access, the bot token and
// the Finance chat id it checks membership against.
//
// Vercel authenticates its own cron calls with `Authorization: Bearer
// $CRON_SECRET`. The check is not optional: the path is public, and proxy.ts
// lets it through without a session because a cron has none.

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@site/lib/telegram";
import { listExpenses } from "@/lib/expenses/store";
import { loadFees } from "@/lib/fees/store";
import { financeDigest, formatFinanceDigest } from "@/lib/finance/digest";
import { kyivDay } from "@/lib/finance/period";
import { loadOrders } from "@/lib/keycrm-orders";

function matchesSecret(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[finance digest] CRON_SECRET is not set — refusing");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!matchesSecret(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const day = kyivDay(now);
  // Both reads report failure as a value, never a throw, so a KeyCRM or
  // database outage still sends a digest that says what it could not read —
  // silence would look the same as a broken cron.
  const [orders, expenses, fees] = await Promise.all([
    loadOrders(),
    listExpenses(`${day.slice(0, 7)}-01`, day),
    loadFees(),
  ]);

  const digest = financeDigest({
    now,
    orders: orders.ok ? { ok: true, value: orders.orders } : { ok: false },
    expenses,
    fees: fees.ok ? { ok: true, actual: fees.actual, rates: fees.rates } : { ok: false },
  });

  const sent = await sendTelegramMessage(formatFinanceDigest(digest), { target: "finance" });
  if (!sent) {
    // No alert: alerts go to this same chat, which is what just failed.
    console.error(`[finance digest] ${day}: not delivered`);
    return NextResponse.json({ error: "Not delivered", day }, { status: 502 });
  }

  console.log(
    `[finance digest] ${day}: profit ${digest.profit.ok ? digest.profit.day : "unknown"}, stuck ${digest.stuck?.count ?? "unknown"}`
  );
  return NextResponse.json({ ok: true, ...digest });
}
