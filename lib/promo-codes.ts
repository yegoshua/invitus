// The promo code list, read from Strapi and kept close at hand. Server-only.
//
// This is a deliberate, narrow exception to the rule at the top of
// lib/orders.ts — "a payment path must not depend on a CMS". Promo codes have
// nowhere else to live, so the exception is bought by making Strapi's
// availability stop mattering, exactly the way lib/product-extras.ts does it:
//
//   1. Retries with a generous budget, because Strapi Cloud's free tier sleeps
//      and a timed-out attempt is itself the wake-up call.
//   2. `lastGood` — the newest list this process read successfully. A blip
//      cannot cost a discount we already know about.
//   3. Back-off, so a genuinely dead Strapi does not re-pay the retry budget on
//      every checkout.
//   4. A long cache window busted on publish by the webhook at
//      app/api/revalidate, so the ordinary case never touches Strapi at all.
//
// What is NOT done: guessing. If the list has never been read by this process,
// a code is refused with an explanation rather than either honoured on trust or
// dropped in silence — a customer told "try again in a minute" can decide what
// to do; one silently charged full price after typing a valid code cannot.
//
// The list is fetched with the API token and never reaches the browser. Strapi
// answers 403 anonymously, and it should stay that way: a public collection of
// promo codes is a public list of discounts.

import { getStrapiURL } from "./strapi";
import {
  evaluatePromoCode,
  indexPromoCodes,
  normalizePromoCode,
  PROMO_MESSAGES,
  type PromoCode,
  type PromoEvaluation,
  type RawPromoCode,
} from "./promo";

/** Cache tag busted by the Strapi webhook at app/api/revalidate. */
export const STRAPI_PROMO_TAG = "strapi-promo-codes";

// Unlike the extras index, this runs with a customer watching: they pressed
// "apply" and are waiting for a yes or a no. So the budget is shaped for that
// rather than copied from lib/product-extras.ts.
//
// The first attempt is long enough to *win* against a cold start — Strapi Cloud's
// free tier was measured at 14.6s from asleep, so the 12s the extras loader uses
// loses that race every time and then loses it twice more. The second is short:
// if the first timed out it has already woken the instance, so a retry either
// lands quickly or is not going to land at all. Worst case ~29s and the ordinary
// cold case succeeds outright, against 38s of guaranteed failure before.
const ATTEMPT_TIMEOUTS_MS = [20_000, 8_000];
const RETRY_DELAY_MS = 1_000;
const REVALIDATE_S = 86_400;
const FAILURE_BACKOFF_MS = 60_000;

const QUERY = "/api/promo-codes?pagination[limit]=200&sort=id:asc";

let skipUntil = 0;
let lastGood: Map<string, PromoCode> | null = null;
let inFlight: Promise<Map<string, PromoCode> | null> | null = null;

/**
 * Look a code up and price it against a goods subtotal.
 *
 * The single entry point for "is this code good, and what is it worth" — the
 * checkout's validation endpoint and the order pricing both call it, so the
 * number on the screen and the number on the invoice come from one code path
 * rather than two that agree today.
 *
 * `unavailable` is the one answer that is not a verdict on the code: the list
 * has never been read, so nothing is known about it. Everything else — a code
 * that does not exist, an empty field — is handed to evaluatePromoCode, which
 * owns every rule and every message.
 */
export async function checkPromoCode(
  raw: string,
  subtotal: number
): Promise<PromoEvaluation> {
  const index = await getPromoCodes();
  if (!index) {
    return {
      ok: false,
      reason: "unavailable",
      message: PROMO_MESSAGES.unavailable,
    };
  }

  // Normalised on both sides, so `viper_gym` finds `VIPER_GYM`.
  return evaluatePromoCode(index.get(normalizePromoCode(raw)), subtotal);
}

/** Cancel the failure back-off so the next read retries Strapi immediately. */
export function clearPromoCodesBackoff(): void {
  skipUntil = 0;
}

/**
 * The whole list by normalised code, or `null` if it has never been read.
 *
 * Concurrent callers share one request (single-flight): a burst of checkouts
 * against a sleeping Strapi would otherwise each wait out the full budget in
 * parallel.
 */
function getPromoCodes(): Promise<Map<string, PromoCode> | null> {
  if (Date.now() < skipUntil) return Promise.resolve(lastGood);
  if (inFlight) return inFlight;
  inFlight = fetchPromoCodes().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function fetchPromoCodes(): Promise<Map<string, PromoCode> | null> {
  try {
    // Sorted oldest-first by the query, which is what makes indexPromoCodes'
    // duplicate rule ("the first wins") mean the same thing on every server.
    const json = await getWithRetries<{ data: RawPromoCode[] }>();

    lastGood = indexPromoCodes(json.data ?? []);
    return lastGood;
  } catch (error) {
    skipUntil = Date.now() + FAILURE_BACKOFF_MS;
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      lastGood
        ? `[promo] Strapi fetch failed (${reason}), serving the last known good list`
        : `[promo] Strapi unavailable (${reason}), promo codes cannot be checked`
    );
    return lastGood;
  }
}

async function getWithRetries<T>(): Promise<T> {
  const token = process.env.STRAPI_API_TOKEN;
  if (!token) {
    // Not retryable and not a Strapi problem: Strapi answers 403 anonymously,
    // so without the token every code on the site is refused.
    throw new NonRetryableError("STRAPI_API_TOKEN is not set (server-only)");
  }

  const url = getStrapiURL(QUERY);
  let lastError: unknown;

  for (let attempt = 1; attempt <= ATTEMPT_TIMEOUTS_MS.length; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUTS_MS[attempt - 1]),
        next: { revalidate: REVALIDATE_S, tags: [STRAPI_PROMO_TAG] },
      });

      if (response.status >= 400 && response.status < 500) {
        throw new NonRetryableError(`Strapi responded ${response.status}`);
      }
      if (!response.ok) throw new Error(`Strapi responded ${response.status}`);

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof NonRetryableError) throw error;
      lastError = error;
      if (attempt < ATTEMPT_TIMEOUTS_MS.length) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(
          `[promo] Strapi attempt ${attempt}/${ATTEMPT_TIMEOUTS_MS.length} ` +
            `failed (${reason}), retrying`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError;
}

class NonRetryableError extends Error {}
