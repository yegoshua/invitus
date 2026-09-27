"use server";

// «Оновити зараз» next to the sync badge (#124). A Server Action is a public
// POST endpoint, so it checks the session itself (ADR 0002).

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/server";
import { topUpAllNow } from "@/lib/ingest/live";
import { reloadOrders } from "@/lib/keycrm-orders";
import { settledWithin } from "@/lib/live/flight";

/** Past this the page re-renders with what has landed; the rest finishes in the background. */
const REFRESH_DEADLINE_MS = 10_000;

/**
 * Presses closer together than this re-render but read nothing: KeyCRM's
 * budget is 60 a minute for the shop too, and the numbers are seconds old.
 * Per server instance, which is enough to stop a finger, not a script — the
 * session check is what stops a script.
 */
const MIN_INTERVAL_MS = 15_000;
let lastRead = 0;

export async function refreshNow(): Promise<void> {
  await requireAdmin();
  const now = Date.now();
  if (now - lastRead >= MIN_INTERVAL_MS) {
    lastRead = now;
    await settledWithin(Promise.all([reloadOrders(), topUpAllNow(REFRESH_DEADLINE_MS)]), REFRESH_DEADLINE_MS);
  }
  refresh();
}
