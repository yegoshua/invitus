// Daily digest, driven by Vercel Cron (see vercel.json).
//
// Vercel authenticates its own cron calls by sending `Authorization: Bearer
// $CRON_SECRET`, so there is no new secret to invent — but the check is not
// optional: the path is public and anyone could otherwise make the shop send
// itself a report at 3am.
//
// Hobby plan runs crons once a day, which is exactly what this needs. Anything
// hourly (an "order stuck in `new` for 2h" nudge) would need Pro.

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { fetchKeyCrm } from "@/lib/keycrm";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatDigest, summarizeOrders, type DigestOrder } from "@/lib/digest";
import { reportFailure } from "@/lib/alerts";

const KYIV_TIME_ZONE = "Europe/Kyiv";

function matchesSecret(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * The Kyiv calendar day, as KeyCRM wants it.
 *
 * Deliberately not `new Date().toISOString()`: the server runs in UTC, so at
 * 21:00 Kyiv in summer that is still 18:00 UTC — same day, fine — but the same
 * code run near midnight would silently report yesterday. Formatting in the
 * shop's own timezone is the only version that stays correct year-round.
 */
export function kyivDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KYIV_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function kyivDayLabel(now: Date): string {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: KYIV_TIME_ZONE,
    day: "numeric",
    month: "long",
  }).format(now);
}

interface OrderListResponse {
  data?: DigestOrder[];
  last_page?: number;
}

async function fetchOrdersForDay(day: string): Promise<DigestOrder[]> {
  const orders: DigestOrder[] = [];
  let page = 1;

  // Paginated rather than capped: a good day must not be reported as a
  // truncated one. KeyCRM allows 60 req/min and a day is a handful of pages.
  while (page <= 20) {
    const res = await fetchKeyCrm<OrderListResponse>("/order", {
      params: {
        limit: "50",
        page: String(page),
        include: "products",
        "filter[created_between]": `${day} 00:00:00,${day} 23:59:59`,
      },
      revalidate: 0,
    });
    orders.push(...(res.data ?? []));
    if (page >= (res.last_page ?? 1)) break;
    page++;
  }

  return orders;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[digest] CRON_SECRET is not set — refusing");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!matchesSecret(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const day = kyivDay(now);

  try {
    const orders = await fetchOrdersForDay(day);
    const summary = summarizeOrders(orders);
    await sendTelegramMessage(formatDigest(summary, kyivDayLabel(now)));
    console.log(`[digest] ${day}: ${summary.total} orders, ${summary.revenue} UAH`);
    return NextResponse.json({ ok: true, day, ...summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[digest] ${day} failed:`, msg);
    await reportFailure({
      scope: "digest",
      title: "Не вдалося зібрати щоденний підсумок",
      detail: msg,
      context: { День: day },
    });
    return NextResponse.json({ error: "Digest failed" }, { status: 500 });
  }
}
