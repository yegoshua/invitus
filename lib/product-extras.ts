// Strapi-backed presentation extras, merged into KeyCRM products in lib/api.ts.
//
// KeyCRM owns commerce (prices, stock, photos, orders); Strapi owns
// presentation (3D models, hero backgrounds, measurement guides, featured).
// Matching: by `keycrmId` field on the Strapi product when present (add a
// number field in Strapi Content-Type Builder to make links rename-proof),
// otherwise by slugified product NAME — names match across both systems
// ("Poseidon Lifting Belt" in Strapi and KeyCRM), while Strapi's own slug
// field uses a different convention ("belt-poseidon") and cannot be used.
//
// Resilient by design — and the thing being defended against is not latency
// but *cache poisoning*. Next doesn't cache a failed fetch, yet it does cache
// the page rendered from one: a 3-second Strapi blip used to freeze fallback
// content into static HTML that kept being served long after Strapi recovered.
// Three layers, in order of what they protect:
//
//   1. Retries with a generous budget. This code runs during `next build` and
//      during background ISR regeneration — nobody is waiting on it, the
//      visitor is already being served the previous render. A timed-out
//      attempt also *wakes* a sleeping instance, so attempt 2 usually lands
//      fast. Spending 30s here is free; a wrong render costs hours.
//   2. `lastGood` — the newest successful index is kept in memory and served
//      when a later fetch fails, so one blip can't downgrade a process that
//      already knows the answer. This is what stops a single timeout during a
//      build burst from baking fallbacks into every remaining page.
//   3. Back-off after failure, so a genuinely dead Strapi doesn't re-pay the
//      whole retry budget on every render.
//
// Freshness comes from the webhook at app/api/revalidate, which busts the
// "strapi-extras" tag the moment content is published in Strapi. The
// revalidate window below is only a safety net for a missed webhook, so it is
// deliberately long: the fewer times we touch Strapi, the fewer chances a blip
// there has to become a visible bug here.

import { getStrapiURL, getStrapiMedia } from "./strapi";
import { slugify } from "./slugify";
import type { StrapiProduct, StrapiResponse } from "./strapi-schema";
import {
  productExtras as localFallbackExtras,
  type ProductExtras,
} from "@/content/product-extras";

export interface ExtrasIndex {
  byKeycrmId: Map<number, ProductExtras>;
  bySlug: Map<string, ProductExtras>;
}

const EMPTY: ExtrasIndex = { byKeycrmId: new Map(), bySlug: new Map() };

/** Cache tag busted by the Strapi webhook at app/api/revalidate. */
export const STRAPI_EXTRAS_TAG = "strapi-extras";

// Strapi Cloud's free tier sleeps when idle and cold-starts in ~6-7s (warm:
// ~0.2s). One attempt has to clear that comfortably, and a miss is worth
// retrying rather than degrading — the timed-out attempt has already started
// the wake-up, so the retry is usually the fast case.
const ATTEMPT_TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_000;

// Safety net for a missed webhook, not the freshness mechanism. See the note
// at the top of this file.
const REVALIDATE_S = 86_400;

// After exhausting every attempt, stop trying for a minute so a genuinely
// unreachable Strapi doesn't re-pay the full retry budget on every render.
const FAILURE_BACKOFF_MS = 60_000;
let skipUntil = 0;

// Last index fetched successfully by this process. Served instead of EMPTY
// whenever a later fetch fails, so a blip can't cost content we already have.
let lastGood: ExtrasIndex | null = null;

// Single-flight guard: while one fetch is in progress, concurrent callers
// share its promise instead of each opening their own request. Without this,
// a burst of page renders on a cold (sleeping) Strapi each waited the full
// timeout in parallel, stacking into tens of seconds of dev render time.
let inFlight: Promise<ExtrasIndex> | null = null;

export function getStrapiExtras(): Promise<ExtrasIndex> {
  if (Date.now() < skipUntil) return Promise.resolve(lastGood ?? EMPTY);
  if (inFlight) return inFlight;
  inFlight = fetchStrapiExtras().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Cancel the failure back-off so the next read retries Strapi immediately.
 *
 * Deliberately does NOT clear `lastGood`: that value is only ever replaced by a
 * newer successful fetch. Dropping it would mean a refetch that fails right
 * after this call falls all the way back to EMPTY — reintroducing exactly the
 * poisoned render this module exists to prevent.
 */
export function clearStrapiExtrasBackoff(): void {
  skipUntil = 0;
}

async function fetchStrapiExtras(): Promise<ExtrasIndex> {
  try {
    const json = await fetchWithRetries();

    const byKeycrmId = new Map<number, ProductExtras>();
    const bySlug = new Map<string, ProductExtras>();

    for (const p of json.data) {
      const galleryImages = (p.galleryImages ?? [])
        .filter((g) => g.image)
        .map((g) => ({
          url: getStrapiMedia(g.image.url),
          alt: g.alt || g.image.alternativeText || p.name,
        }));

      // Only variants carrying a SKU can be linked to a KeyCRM offer; the rest
      // are ignored rather than guessed at. See ProductExtras.sizeLabelsBySku.
      const sizeLabelsBySku: Record<string, string> = {};
      for (const variant of p.variants ?? []) {
        if (variant.sku && variant.name) {
          sizeLabelsBySku[variant.sku] = variant.name;
        }
      }

      const extras: ProductExtras = {
        model3dUrl: p.model3d ? getStrapiMedia(p.model3d.url) : undefined,
        heroImage: p.heroImage
          ? {
              url: getStrapiMedia(p.heroImage.url),
              alt: p.heroImage.alternativeText || p.name,
            }
          : undefined,
        bgImage: p.backgroundImage
          ? {
              url: getStrapiMedia(p.backgroundImage.url),
              alt: p.backgroundImage.alternativeText || p.name,
            }
          : undefined,
        galleryImages: galleryImages.length ? galleryImages : undefined,
        howToMeasure: p.howToMeasure ?? undefined,
        careInstructions: p.careInstructions ?? undefined,
        featured: p.featured || undefined,
        sizeLabelsBySku: Object.keys(sizeLabelsBySku).length
          ? sizeLabelsBySku
          : undefined,
      };

      if (p.keycrmId != null) byKeycrmId.set(p.keycrmId, extras);
      bySlug.set(slugify(p.name), extras);
    }

    lastGood = { byKeycrmId, bySlug };
    return lastGood;
  } catch (error) {
    skipUntil = Date.now() + FAILURE_BACKOFF_MS;
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      lastGood
        ? `Strapi extras fetch failed (${reason}), serving last known good index`
        : `Strapi extras unavailable (${reason}), rendering with fallbacks`
    );
    return lastGood ?? EMPTY;
  }
}

/**
 * One GET, retried on anything transient. 4xx is not retried: a bad token or a
 * malformed query won't fix itself, and burning the budget on it only delays
 * the fallback render.
 */
async function fetchWithRetries(): Promise<StrapiResponse<StrapiProduct[]>> {
  const url = getStrapiURL(
    "/api/products?populate[model3d]=true&populate[heroImage]=true&populate[backgroundImage]=true&populate[galleryImages][populate]=image&populate[variants]=true&pagination[limit]=100"
  );

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        next: { revalidate: REVALIDATE_S, tags: [STRAPI_EXTRAS_TAG] },
      });

      if (response.status >= 400 && response.status < 500) {
        throw new NonRetryableError(`Strapi responded ${response.status}`);
      }
      if (!response.ok) throw new Error(`Strapi responded ${response.status}`);

      return (await response.json()) as StrapiResponse<StrapiProduct[]>;
    } catch (error) {
      if (error instanceof NonRetryableError) throw error;
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(
          `Strapi extras attempt ${attempt}/${MAX_ATTEMPTS} failed (${reason}), retrying`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError;
}

class NonRetryableError extends Error {}

/** Strapi first (keycrmId, then slug), local file as offline fallback. */
export function resolveExtras(
  index: ExtrasIndex,
  keycrmId: number,
  slug: string
): ProductExtras | undefined {
  return (
    index.byKeycrmId.get(keycrmId) ??
    index.bySlug.get(slug) ??
    localFallbackExtras[keycrmId]
  );
}
