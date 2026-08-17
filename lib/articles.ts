// The published article list, read from Strapi. Server-only.
//
// Modelled on lib/promo-codes.ts and lib/product-extras.ts — retries, an
// in-memory `lastGood`, a failure back-off, a long cache window busted on
// publish by the webhook at app/api/revalidate, and single-flight so a burst of
// renders against a sleeping Strapi shares one request.
//
// One thing is deliberately NOT copied from those two, and it is the decision
// this module turns on. Products have KeyCRM behind them and promo codes have
// "not right now, try again" as an honest answer; the blog has neither. Strapi
// is the only place an article exists, so there is no degraded list to fall
// back to — only an empty one. Hence:
//
//   1. Strapi down, the page already rendered once → Next keeps serving the
//      previous render, the background revalidation fails, nobody notices.
//      That case is free and needs no code here.
//   2. Strapi down on a *cold* render → this throws. The page does not render
//      and Next caches nothing.
//   3. Genuinely zero published articles → an empty array, and the page says so.
//
// Case 2 must never turn into case 3. Returning [] on a failed fetch renders a
// perfectly valid "поки що порожньо" page under HTTP 200, which Next then
// caches for the whole revalidate window — a one-minute Strapi blip becomes a
// day of a silently empty blog with nothing in the logs. That is exactly the
// cache-poisoning trap described at the top of lib/product-extras.ts, and the
// only defence available to a section with no second source is to refuse to
// render at all.
//
// The list is fetched with the API token: Strapi answers 403 anonymously for
// this collection, matching promo codes rather than products.

// The `.ts` extensions below are not a slip: the mapping half of this module is
// covered by node:test's type stripping, which resolves relative specifiers
// literally. tsconfig has `allowImportingTsExtensions` for exactly this — same
// as lib/promo.ts.
import { readingTimeMinutes, type BlocksNode } from "./article-body.ts";
import { getStrapiMedia } from "./strapi.ts";
import {
  requiredStrapiAuthHeaders,
  strapiGetWithRetries,
} from "./strapi-fetch.ts";
import type { Article, ArticleSummary } from "../types/index.ts";

/** Cache tag busted by the Strapi webhook at app/api/revalidate. */
export const STRAPI_ARTICLES_TAG = "strapi-articles";

// Because of case 2 above, this budget is not the promo loader's and not the
// extras loader's: those two degrade when they give up, this one refuses to
// render. Every attempt spent here is cheaper than what failing costs.
//
// The numbers come from a real failure rather than from a guess. A `next build`
// with an empty fetch cache against a sleeping Strapi Cloud instance exhausted
// [20s, 8s] and took the whole deploy down with it — 8s is not a retry against
// something that is still waking, it is a second way to lose. So: three
// attempts, none of them short, with a gap long enough for the instance the
// first attempt woke to actually finish waking (the publish script waits 15s
// for the same reason). Worst case ~55s on a render nobody is watching;
// against that, a deploy that fails because a CMS was asleep.
const ATTEMPT_TIMEOUTS_MS = [20_000, 15_000, 15_000];
const RETRY_DELAY_MS = 2_500;

// Freshness comes from the webhook, not from this window — see the note at the
// top of lib/product-extras.ts. It is a safety net for a missed webhook.
const REVALIDATE_S = 86_400;

// So a genuinely dead Strapi doesn't re-pay the full retry budget on every
// render. While it holds, a process that has read the list serves what it has
// and one that never has still throws — the back-off changes how long we wait
// for the answer, never what the answer is.
const FAILURE_BACKOFF_MS = 60_000;

// No pagination: the blog is a dozen articles and a limit that is never reached
// is an honest stand-in until article count is a real problem. The cap exists
// only so a runaway Strapi cannot hand us an unbounded page.
const QUERY =
  "/api/articles?populate=cover&sort=publishedAt:desc&pagination[limit]=100";

function bySlugQuery(slug: string): string {
  return (
    `/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}` +
    "&populate=cover&pagination[limit]=1"
  );
}

let skipUntil = 0;
let lastGood: ArticleSummary[] | null = null;
let inFlight: Promise<ArticleSummary[]> | null = null;

/** Cancel the failure back-off so the next read retries Strapi immediately. */
export function clearArticlesBackoff(): void {
  skipUntil = 0;
}

/**
 * Every published article, newest first.
 *
 * Throws if this process has never read the list successfully. See the note at
 * the top of this file: an empty array here means zero published articles and
 * nothing else.
 */
export function getArticles(): Promise<ArticleSummary[]> {
  if (Date.now() < skipUntil) {
    return lastGood
      ? Promise.resolve(lastGood)
      : Promise.reject(new ArticlesUnavailableError("backing off after a recent failure"));
  }
  if (inFlight) return inFlight;
  inFlight = fetchArticles().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function fetchArticles(): Promise<ArticleSummary[]> {
  try {
    const json = await getWithRetries<{ data: RawArticle[] }>(QUERY);
    lastGood = indexArticles(json.data ?? []);
    return lastGood;
  } catch (error) {
    skipUntil = Date.now() + FAILURE_BACKOFF_MS;
    const reason = error instanceof Error ? error.message : String(error);

    if (lastGood) {
      console.warn(
        `[articles] Strapi fetch failed (${reason}), serving the last known good list`
      );
      return lastGood;
    }

    console.error(`[articles] Strapi unavailable (${reason}), refusing to render the blog`);
    throw new ArticlesUnavailableError(reason);
  }
}

/**
 * One published article, body and all, or `null` if there is no such article.
 *
 * The two failure modes are kept strictly apart, and that separation is the
 * whole job here. `null` means Strapi answered and had nothing under this slug
 * — unknown, unpublished or deleted — and the page turns that into a 404. A
 * Strapi that cannot be reached throws instead: a 404 rendered out of an outage
 * is cached and served long after the article is back, which is the listing's
 * empty-page trap wearing a different status code.
 *
 * No `lastGood` here, unlike the list. It would only ever help the second fetch
 * of the same slug inside one process, which Next's own request cache already
 * covers; the honest answer for a page whose content cannot be read is to not
 * render it. The already-rendered reader is protected by ISR, not by us.
 */
export async function getArticle(slug: string): Promise<Article | null> {
  if (Date.now() < skipUntil) {
    // Shares the list's back-off deliberately: it records "Strapi is down", not
    // "that one query failed", and re-paying the retry budget per article page
    // during an outage helps nobody.
    throw new ArticlesUnavailableError("backing off after a recent failure");
  }

  try {
    const json = await getWithRetries<{ data: RawArticle[] }>(bySlugQuery(slug));
    const raw = json.data?.[0];
    if (!raw) return null;

    const [summary] = indexArticles([raw]);
    // Only reachable when the cover has gone missing, which indexArticles drops
    // rather than render. Same call as the listing makes, for the same reason.
    if (!summary) return null;

    return {
      ...summary,
      body: raw.body ?? [],
      seoTitle: raw.seoTitle ?? undefined,
      seoDescription: raw.seoDescription ?? undefined,
    };
  } catch (error) {
    skipUntil = Date.now() + FAILURE_BACKOFF_MS;
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[articles] Strapi unavailable (${reason}), refusing to render "${slug}"`);
    throw new ArticlesUnavailableError(reason);
  }
}

/** Thrown rather than degrading to an empty list. See the note at the top. */
export class ArticlesUnavailableError extends Error {
  constructor(reason: string) {
    super(`The article list could not be read from Strapi: ${reason}`);
    this.name = "ArticlesUnavailableError";
  }
}

/**
 * The shared Strapi GET, with this module's budget bound to it. Both reads —
 * the list and one slug — go through here, so a page cannot end up on a budget
 * the note above ATTEMPT_TIMEOUTS_MS does not describe.
 */
async function getWithRetries<T>(query: string): Promise<T> {
  return strapiGetWithRetries<T>({
    query,
    tag: STRAPI_ARTICLES_TAG,
    timeouts: ATTEMPT_TIMEOUTS_MS,
    retryDelay: RETRY_DELAY_MS,
    revalidate: REVALIDATE_S,
    logPrefix: "[articles]",
    // Strapi answers 403 anonymously for articles, so without the token the
    // blog cannot be read at all — a failure no retry can fix.
    headers: requiredStrapiAuthHeaders(),
  });
}

// ── mapping ──────────────────────────────────────────────────────────────────

/** Raw Strapi shape. Private to this module — the UI sees ArticleSummary. */
interface RawArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  body: BlocksNode[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  cover: {
    url: string;
    alternativeText: string | null;
    width: number | null;
    height: number | null;
  } | null;
}

/**
 * Raw entries → the list the page renders, newest first.
 *
 * Sorted here as well as in the query: the ordering is the one thing about this
 * list a reader will notice being wrong, and owning it locally makes it
 * testable without a Strapi. Cover is required by the schema but a media entry
 * can be deleted out from under an article, so an article without one is
 * dropped with a warning naming it rather than rendered as a hole in the grid.
 */
export function indexArticles(raw: RawArticle[]): ArticleSummary[] {
  return raw
    .filter((article) => {
      if (article.cover?.url) return true;
      console.warn(`[articles] "${article.slug}" has no cover image — skipped`);
      return false;
    })
    .map((article) => ({
      id: String(article.id),
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      category: article.category,
      publishedAt: article.publishedAt,
      // Computed, never stored: a field the author fills starts lying the first
      // time the text is edited. See lib/article-body.ts.
      readingTimeMinutes: readingTimeMinutes(article.body ?? []),
      cover: {
        url: getStrapiMedia(article.cover!.url),
        alt: article.cover!.alternativeText || article.title,
        width: article.cover!.width ?? undefined,
        height: article.cover!.height ?? undefined,
      },
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
