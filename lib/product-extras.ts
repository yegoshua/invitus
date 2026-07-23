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
// Resilient by design: single attempt, 10s timeout, 60s back-off after a
// failure — a down Strapi degrades the site to fallbacks, never blocks it.
// The timeout is generous on purpose: Strapi Cloud's free tier sleeps when
// idle and cold-starts in ~6-7s, so a tighter budget would drop presentation
// content (hero/bg images) for the first visitor after every quiet spell.
// Once warm it answers in ~0.15s, and revalidate:300 means only one request
// per 5 min ever pays the cold-start cost.

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

// After a failed fetch, skip Strapi for a minute so an unreachable instance
// doesn't add latency to every page render.
let skipUntil = 0;

// Single-flight guard: while one fetch is in progress, concurrent callers
// share its promise instead of each opening their own request. Without this,
// a burst of page renders on a cold (sleeping) Strapi each waited the full
// timeout in parallel, stacking into tens of seconds of dev render time.
let inFlight: Promise<ExtrasIndex> | null = null;

export function getStrapiExtras(): Promise<ExtrasIndex> {
  if (Date.now() < skipUntil) return Promise.resolve(EMPTY);
  if (inFlight) return inFlight;
  inFlight = fetchStrapiExtras().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function fetchStrapiExtras(): Promise<ExtrasIndex> {
  try {
    const response = await fetch(
      getStrapiURL(
        "/api/products?populate[model3d]=true&populate[heroImage]=true&populate[backgroundImage]=true&populate[galleryImages][populate]=image&pagination[limit]=100"
      ),
      {
        signal: AbortSignal.timeout(10000),
        next: { revalidate: 300, tags: ["strapi-extras"] },
      }
    );
    if (!response.ok) throw new Error(`Strapi responded ${response.status}`);

    const json = (await response.json()) as StrapiResponse<StrapiProduct[]>;

    const byKeycrmId = new Map<number, ProductExtras>();
    const bySlug = new Map<string, ProductExtras>();

    for (const p of json.data) {
      const galleryImages = (p.galleryImages ?? [])
        .filter((g) => g.image)
        .map((g) => ({
          url: getStrapiMedia(g.image.url),
          alt: g.alt || g.image.alternativeText || p.name,
        }));

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
      };

      if (p.keycrmId != null) byKeycrmId.set(p.keycrmId, extras);
      bySlug.set(slugify(p.name), extras);
    }

    return { byKeycrmId, bySlug };
  } catch (error) {
    console.warn(
      "Strapi extras unavailable, rendering with fallbacks:",
      error instanceof Error ? error.message : error
    );
    skipUntil = Date.now() + 60_000;
    return EMPTY;
  }
}

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
