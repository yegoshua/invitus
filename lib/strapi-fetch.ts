// One GET against Strapi, retried on anything transient. Server-only.
//
// Three loaders read Strapi through this — lib/product-extras.ts,
// lib/promo-codes.ts and lib/articles.ts — and they had grown three copies of
// the same loop. The copies are the hazard: the 4xx rule and the cold-start
// budget are the sort of thing that gets fixed in one file and left wrong in
// the other two.
//
// What is shared is only the *transport*: how many attempts, how long each
// waits, which statuses are worth another try, and the cache entry the answer
// lands in. Everything a caller does with a failure stays with the caller,
// because the three answers are deliberately different and must stay that way —
// extras degrade to fallbacks, a promo code is refused with an explanation, the
// blog refuses to render at all. See the note at the top of each file.
//
// The budgets are passed in for the same reason — each was arrived at from what
// its caller loses by giving up, and they are not interchangeable. See the note
// above the timeouts in each file before touching one.

import { getStrapiURL } from "./strapi.ts";

/**
 * A failure no retry can fix — a bad token, a malformed query. Burning the rest
 * of the budget on it only delays the caller's fallback.
 */
export class StrapiNonRetryableError extends Error {}

/** A 4xx that carries meaning: a single type nobody has saved yet. */
export class StrapiNotFoundError extends StrapiNonRetryableError {}

// Long enough that a wedged connection isn't retried instantly, short enough to
// be invisible next to the attempt timeouts it sits between. A caller retrying
// against an instance it is trying to *wake* wants longer — see `retryDelay`.
const DEFAULT_RETRY_DELAY_MS = 1_000;

export interface StrapiGetOptions {
  /** Path and query string, passed to getStrapiURL. */
  query: string;
  /** Cache tag, busted by the Strapi webhook at app/api/revalidate. */
  tag: string;
  /** Per-attempt timeouts, in order. Its length is the attempt count. */
  timeouts: readonly number[];
  /** Cache window in seconds — a safety net for a missed webhook, not the
   *  freshness mechanism. */
  revalidate: number;
  /** Bracketed label leading every log line, e.g. "[promo]". */
  logPrefix: string;
  /** Extra request headers — authorization, typically. See strapiAuthHeaders. */
  headers?: Record<string, string>;
  /**
   * Gap between attempts. Defaults to 1s, which is the "don't hammer a wedged
   * connection" case. Pass more when the retry is aimed at an instance the
   * previous attempt started waking and the gap is what gives it time to
   * finish — lib/articles.ts spends 2.5s for exactly that.
   */
  retryDelay?: number;
}

/**
 * Fetch and parse one Strapi endpoint, retrying transient failures.
 *
 * Throws `StrapiNotFoundError` on 404, `StrapiNonRetryableError` on any other
 * 4xx (immediately, without spending the remaining attempts), and whatever the
 * final attempt failed with once the budget is exhausted.
 */
export async function strapiGetWithRetries<T>({
  query,
  tag,
  timeouts,
  revalidate,
  logPrefix,
  headers = {},
  retryDelay = DEFAULT_RETRY_DELAY_MS,
}: StrapiGetOptions): Promise<T> {
  const url = getStrapiURL(query);
  let lastError: unknown;

  for (let attempt = 1; attempt <= timeouts.length; attempt++) {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeouts[attempt - 1]),
        next: { revalidate, tags: [tag] },
      });

      if (response.status === 404) {
        throw new StrapiNotFoundError("Strapi responded 404");
      }
      if (response.status >= 400 && response.status < 500) {
        throw new StrapiNonRetryableError(`Strapi responded ${response.status}`);
      }
      if (!response.ok) throw new Error(`Strapi responded ${response.status}`);

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof StrapiNonRetryableError) throw error;
      lastError = error;
      if (attempt < timeouts.length) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(
          `${logPrefix} Strapi attempt ${attempt}/${timeouts.length} ` +
            `failed (${reason}), retrying`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError;
}

/**
 * The authorization header when a token is configured, and nothing when it
 * isn't. For collections Strapi serves anonymously, where the token is an
 * optional upgrade rather than a requirement.
 */
export function strapiAuthHeaders(): Record<string, string> {
  const token = process.env.STRAPI_API_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * The authorization header, or a non-retryable failure.
 *
 * For the collections Strapi answers 403 on anonymously — promo codes and
 * articles. A missing token is not a Strapi problem and no number of attempts
 * will produce one, so it fails the way a bad token does: at once, with a
 * message saying what is actually wrong.
 */
export function requiredStrapiAuthHeaders(): Record<string, string> {
  const token = process.env.STRAPI_API_TOKEN;
  if (!token) {
    throw new StrapiNonRetryableError(
      "STRAPI_API_TOKEN is not set (server-only)"
    );
  }
  return { Authorization: `Bearer ${token}` };
}
