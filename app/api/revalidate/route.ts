// On-demand revalidation for Strapi content.
//
// Strapi calls this on publish/update/delete (Settings → Webhooks) and the
// affected pages regenerate immediately. That is what lets lib/product-extras
// keep a very long revalidate window: presentation content is pulled when it
// actually changes instead of on a timer, so a Strapi outage at some arbitrary
// moment can no longer be captured into a cached render.
//
// Configure in Strapi → Settings → Webhooks:
//   URL:     https://invitus.com.ua/api/revalidate
//   Header:  Authorization: Bearer <REVALIDATE_SECRET>
//   Events:  entry.publish, entry.unpublish, entry.update, entry.delete
//
// The same secret must be set as REVALIDATE_SECRET in Vercel project env vars.

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  STRAPI_EXTRAS_TAG,
  clearStrapiExtrasBackoff,
} from "@/lib/product-extras";

/**
 * Compare digests rather than the raw strings: timingSafeEqual throws on a
 * length mismatch, and comparing lengths first would leak the secret's length.
 */
function matchesSecret(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.error("[revalidate] REVALIDATE_SECRET is not set — refusing");
    return NextResponse.json(
      { error: "Revalidation is not configured" },
      { status: 500 }
    );
  }

  if (!matchesSecret(bearerToken(request), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Strapi sends { event, model, entry }. Only used for the log line — the
  // whole extras index is refetched regardless of which entry changed.
  const payload = await request
    .json()
    .catch(() => null as { event?: string; model?: string } | null);

  // Lets a Strapi that just came back up be retried at once instead of waiting
  // out the back-off. Only affects this instance — page renders may run in
  // another — but the tag invalidation below is what actually does the work.
  clearStrapiExtrasBackoff();

  // "max" keeps serving the existing render until the new one is ready, rather
  // than making the next visitor wait for a fresh Strapi fetch.
  revalidateTag(STRAPI_EXTRAS_TAG, "max");

  console.log(
    `[revalidate] ${payload?.event ?? "unknown event"} on ${
      payload?.model ?? "unknown model"
    } → invalidated "${STRAPI_EXTRAS_TAG}"`
  );

  return NextResponse.json({
    revalidated: STRAPI_EXTRAS_TAG,
    event: payload?.event ?? null,
  });
}
