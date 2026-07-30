// Low-level KeyCRM Open API client.
//
// Server-only: requires KEYCRM_API_TOKEN from .env.local (never expose to the
// client bundle). Rate limit is 60 req/min per key — responses are cached via
// Next.js fetch cache (revalidate) so page renders don't hit the API directly.
//
// Every call here is given a deadline, and the reason is worth stating: KeyCRM
// resolves to a *single* A record on one OVH host in Germany — no CDN, no
// second address to fail over to — so when that host is unreachable the failure
// is `connect ETIMEDOUT`, not an HTTP status. A fetch with no signal then waits
// out the OS-level TCP timeout, which is tens of seconds; production logs showed
// exactly that against 141.95.107.43:443. On a page render ISR absorbs it (the
// stale page keeps being served), but on the checkout path it means a customer
// watching a spinner while several sequential calls each hang, and a Monobank
// webhook that never returns instead of returning 500 and earning a redelivery.
// A deadline turns every one of those into a fast, retryable failure.

import type { KeyCrmPaginated } from "./keycrm-schema";

const KEYCRM_BASE_URL = "https://openapi.keycrm.app/v1";

// KeyCRM caps `limit` at 50 per page.
export const KEYCRM_PAGE_LIMIT = 50;

// A healthy KeyCRM read answers well inside a second. 8s is generous enough to
// ride out a slow moment and short enough that a dead connection is noticed
// while someone is still willing to wait.
const READ_TIMEOUT_MS = 8_000;
const READ_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

// Writes get longer — see the note on postKeyCrm.
const WRITE_TIMEOUT_MS = 15_000;

// 60 req/min per key, so a rate-limited call must not be retried on the same
// cadence as a network blip: that would spend the remaining attempts instantly
// and still be rate limited.
const RATE_LIMIT_DELAY_MS = 2_000;

/** Thrown for statuses that will not fix themselves, so retrying is pointless. */
class NonRetryableError extends Error {}

/** Retryable, but only after a much longer pause than a transport blip. */
class RateLimitedError extends Error {}

interface FetchKeyCrmOptions {
  params?: Record<string, string>;
  revalidate?: number;
  tags?: string[];
}

function keycrmToken(): string {
  const token = process.env.KEYCRM_API_TOKEN;
  if (!token) {
    throw new Error(
      "KEYCRM_API_TOKEN is not set. Add it to .env.local (server-only)."
    );
  }
  return token;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  // A deadline surfaces as a bare "TimeoutError" / "The operation was aborted",
  // which says nothing in a log line. Name the deadline instead.
  if (error.name === "TimeoutError" || error.name === "AbortError") {
    return `timed out after ${READ_TIMEOUT_MS}ms`;
  }

  // "fetch failed" on its own is equally useless; the useful part (ETIMEDOUT,
  // ECONNREFUSED, ENOTFOUND) is on the cause.
  const cause = (error as { cause?: unknown }).cause;
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? ` / ${String((cause as { code: unknown }).code)}`
      : "";
  return `${error.message}${code}`;
}

/**
 * Read from KeyCRM: deadlined, and retried on anything transient.
 *
 * 4xx other than 429 is not retried — a bad token or a malformed query fails
 * identically on the next attempt, and spending the budget on it only delays
 * the error reaching the caller.
 */
export async function fetchKeyCrm<T>(
  path: string,
  { params, revalidate = 60, tags }: FetchKeyCrmOptions = {}
): Promise<T> {
  const token = keycrmToken();
  const search = params ? `?${new URLSearchParams(params)}` : "";
  const url = `${KEYCRM_BASE_URL}${path}${search}`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= READ_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(READ_TIMEOUT_MS),
        next: { revalidate, tags },
      });

      if (response.status === 429) {
        throw new RateLimitedError(
          `KeyCRM request failed: 429 ${response.statusText} (${path})`
        );
      }
      if (response.status >= 400 && response.status < 500) {
        throw new NonRetryableError(
          `KeyCRM request failed: ${response.status} ${response.statusText} (${path})`
        );
      }
      if (!response.ok) {
        throw new Error(
          `KeyCRM request failed: ${response.status} ${response.statusText} (${path})`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof NonRetryableError) throw error;
      lastError = error;

      if (attempt < READ_ATTEMPTS) {
        const delay =
          error instanceof RateLimitedError
            ? RATE_LIMIT_DELAY_MS
            : RETRY_DELAY_MS;
        console.warn(
          `[KeyCRM] ${path} attempt ${attempt}/${READ_ATTEMPTS} failed ` +
            `(${describe(error)}), retrying in ${delay}ms`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Write to KeyCRM. Never cached and never retried: these calls create real
 * records (orders, payments), so a silent retry could duplicate them.
 *
 * The deadline is deliberately longer than a read's, because it cannot tell
 * "the request never arrived" from "it arrived and the reply was lost" — and on
 * the second the record already exists, so a short deadline would report a
 * failure for an order that was in fact created. Failing at 15s is still much
 * better than not failing at all: without a deadline the caller hangs until the
 * platform kills the function, and for the Monobank webhook that means never
 * returning the 500 that would have earned a redelivery.
 */
export async function postKeyCrm<T>(path: string, body: unknown): Promise<T> {
  return writeKeyCrm<T>("POST", path, body);
}

/** Update an existing KeyCRM record. Same no-cache, no-retry rules as POST. */
export async function putKeyCrm<T>(path: string, body: unknown): Promise<T> {
  return writeKeyCrm<T>("PUT", path, body);
}

async function writeKeyCrm<T>(
  method: "POST" | "PUT",
  path: string,
  body: unknown
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${KEYCRM_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${keycrmToken()}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    // Wrapped so a transport failure reads differently in the logs from a
    // rejection by KeyCRM: only the latter proves the request was seen.
    throw new Error(`KeyCRM ${method} ${path} failed: ${describe(error)}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `KeyCRM ${method} ${path} failed: ${response.status} ${response.statusText} ${text.slice(0, 300)}`
    );
  }

  return response.json() as Promise<T>;
}

/** Fetch every page of a paginated KeyCRM listing endpoint. */
export async function fetchKeyCrmAll<T>(
  path: string,
  { params, revalidate, tags }: FetchKeyCrmOptions = {}
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  for (;;) {
    const response = await fetchKeyCrm<KeyCrmPaginated<T>>(path, {
      params: {
        ...params,
        limit: String(KEYCRM_PAGE_LIMIT),
        page: String(page),
      },
      revalidate,
      tags,
    });

    items.push(...response.data);
    if (page >= response.last_page || !response.next_page_url) break;
    page += 1;
  }

  return items;
}
