// KeyCRM adapter.
//
// Sole owner of: fetching, schema knowledge, slug generation, fallbacks.
// UI code consumes the domain types from `@/types` and does not know
// KeyCRM exists. If KeyCRM changes (renamed field, new property type),
// edits live here.
//
// KeyCRM is the commerce source of truth: products, prices, stock, photos,
// categories, variants (offers). Presentation content — 3D models, hero
// backgrounds, measurement guides — AND placement — catalog order, the two
// curated homepage rows, cross-sell — come from Strapi via
// lib/product-extras.ts (matched by keycrmId field or slugified name), with
// content/product-extras.ts as the offline fallback when Strapi is down.
//
// Every placement lever fails open: see sortByPlacement and pickRow for the
// two rules that make editorial control safe to hand over — no order sorts
// last rather than nowhere, and a row is always topped up to four.

import { fetchKeyCrm, fetchKeyCrmAll } from "./keycrm";
import { slugify } from "./slugify";
import { HIDDEN_CATEGORY_IDS } from "./hidden-categories";
import { readOfferVariant, VARIANT_PROPERTY_NAMES } from "./variant-property";
import {
  getStrapiExtras,
  resolveExtras,
  type ExtrasIndex,
} from "./product-extras";
import type { ProductRef } from "@/content/product-extras";
import type {
  KeyCrmProduct,
  KeyCrmOffer,
  KeyCrmCategory,
} from "./keycrm-schema";
import type {
  Product,
  Category,
  ProductVariant,
  ProductSize,
} from "@/types";

// ──────────────────────────────────────────────────────────────────────────
// Category mapping: KeyCRM category id → site slug
// ──────────────────────────────────────────────────────────────────────────

const CATEGORY_SLUG_BY_ID: Record<number, string> = {
  1: "belts", // Атлетичні пояси
  2: "wrist-wraps", // Кистьові бинти
  3: "knee-sleeves", // Наколінники
  4: "straps", // Лямки Вісімки
  6: "shirts", // Футболки
};

// ──────────────────────────────────────────────────────────────────────────
// Internal: slugs
// ──────────────────────────────────────────────────────────────────────────

function categorySlug(category: KeyCrmCategory): string {
  return CATEGORY_SLUG_BY_ID[category.id] ?? slugify(category.name);
}

// ──────────────────────────────────────────────────────────────────────────
// Internal: size ordering (S/M/L/XL and numeric ranges like "65-80 см")
// ──────────────────────────────────────────────────────────────────────────

// Covers the full belt size chart (XS–4XL). A letter missing from this list
// falls through to the numeric/alphabetical comparison below, where "4XL"
// sorted ahead of "S" — the belt chips came out in the wrong order.
const LETTER_SIZE_ORDER = [
  "XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL",
];

function compareSizes(a: string, b: string): number {
  const ia = LETTER_SIZE_ORDER.indexOf(a.toUpperCase());
  const ib = LETTER_SIZE_ORDER.indexOf(b.toUpperCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

// ──────────────────────────────────────────────────────────────────────────
// Internal: KeyCrmProduct → Product
// ──────────────────────────────────────────────────────────────────────────

function toProduct(
  p: KeyCrmProduct,
  categoryById: Map<number, KeyCrmCategory>,
  extrasIndex: ExtrasIndex,
  offers?: KeyCrmOffer[]
): Product {
  const category =
    p.category_id != null ? categoryById.get(p.category_id) : undefined;

  const galleryImages = (p.attachments_data ?? [])
    .filter((url) => url !== p.thumbnail_url)
    .map((url) => ({ url, alt: p.name }));

  const activeOffers = offers?.filter((o) => !o.is_archived) ?? [];

  const slug = slugify(p.name);
  const extras = extrasFor(extrasIndex, p);

  // KeyCRM owns which sizes exist; Strapi only supplies nicer wording for them,
  // keyed by the offer SKU. An offer Strapi says nothing about keeps KeyCRM's
  // own value as its label, so a belt added today is merely plainer, not broken.
  const sizes: ProductSize[] = [];
  const seenSizeValues = new Set<string>();
  for (const offer of activeOffers) {
    const value = readOfferVariant(offer)?.value;
    if (!value || seenSizeValues.has(value)) continue;
    seenSizeValues.add(value);
    sizes.push({
      value,
      label: (offer.sku && extras?.sizeLabelsBySku?.[offer.sku]) || value,
    });
  }
  sizes.sort((a, b) => compareSizes(a.value, b.value));

  // A product with offers but no readable variant property cannot be ordered:
  // the size selector renders nothing, and lib/orders.ts then rejects the line
  // because no offer matches an empty size. Loud beats silently unbuyable.
  if (activeOffers.length && !sizes.length) {
    const found = [
      ...new Set(activeOffers.flatMap((o) => o.properties.map((x) => x.name))),
    ];
    console.warn(
      `[api] ${p.name} (id ${p.id}) has ${activeOffers.length} offers but none ` +
        `carries ${JSON.stringify(VARIANT_PROPERTY_NAMES)} — found ` +
        `${JSON.stringify(found)}. It cannot be ordered until KeyCRM is fixed.`
    );
  }

  const variants: ProductVariant[] | undefined = activeOffers.length
    ? activeOffers.map((o) => ({
        name:
          readOfferVariant(o)?.value ??
          o.properties.map((prop) => prop.value).join(" / "),
        stock: Math.max(0, o.quantity),
        sku: o.sku ?? undefined,
        priceModifier: o.price - p.min_price || undefined,
      }))
    : undefined;

  // Two distinct photo slots:
  //   mainImage — the KeyCRM thumbnail (clean white-bg studio shot). Used in
  //     list contexts: catalog cards, cart drawer, checkout summary.
  //   heroImage — the big product-page hero. Prefers Strapi's heroImage (e.g. a
  //     transparent shot that sits on the scene background), else the thumbnail.
  const keycrmThumb = p.thumbnail_url
    ? { url: p.thumbnail_url, alt: p.name }
    : undefined;
  const mainImage = keycrmThumb;
  const heroImage = extras?.heroImage ?? keycrmThumb;

  return {
    id: p.id.toString(),
    documentId: p.id.toString(),
    name: p.name,
    slug,
    price: p.min_price,
    category: category ? categorySlug(category) : undefined,

    description: p.description ?? undefined,
    howToMeasure: extras?.howToMeasure,
    careInstructions: extras?.careInstructions,

    mainImage,
    heroImage,
    bgImage: extras?.bgImage,
    galleryImages: extras?.galleryImages ?? galleryImages,

    model3dUrl: extras?.model3dUrl,

    sizes,
    filterTags: [],

    variants,
    featured: extras?.featured,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Internal: cached raw listings
// ──────────────────────────────────────────────────────────────────────────

async function fetchAllCategories(): Promise<KeyCrmCategory[]> {
  const categories = await fetchKeyCrmAll<KeyCrmCategory>(
    "/products/categories",
    { tags: ["categories"] }
  );
  return categories.filter((c) => !HIDDEN_CATEGORY_IDS.has(c.id));
}

async function fetchCategoryMap(): Promise<Map<number, KeyCrmCategory>> {
  const categories = await fetchAllCategories();
  return new Map(categories.map((c) => [c.id, c]));
}

async function fetchAllProducts(params?: {
  categoryId?: number;
}): Promise<KeyCrmProduct[]> {
  const products = await fetchKeyCrmAll<KeyCrmProduct>("/products", {
    params:
      params?.categoryId != null
        ? { "filter[category_id]": String(params.categoryId) }
        : undefined,
    tags: ["products"],
  });

  // KeyCRM returns newest-first; the catalog reads better in creation order.
  return products
    .filter((p) => !p.is_archived)
    .filter(
      (p) => p.category_id == null || !HIDDEN_CATEGORY_IDS.has(p.category_id)
    )
    .sort((a, b) => a.id - b.id);
}

// ──────────────────────────────────────────────────────────────────────────
// Internal: placement — editorial order, and Strapi relations → KeyCRM products
// ──────────────────────────────────────────────────────────────────────────

// How many products a homepage section or a related row holds. The desktop
// grid is `grid-cols-4`; a row that comes up short reads as a broken grid, so
// every row is topped up to this from its fallback chain — see pickRow.
const ROW_SIZE = 4;

/**
 * Editorial order from Strapi, ascending; anything Strapi has no opinion about
 * sorts to the END in KeyCRM creation order.
 *
 * Null-last is the load-bearing half. A product created in KeyCRM minutes ago
 * has no Strapi entry yet, and it must still be on the site — at the bottom,
 * not nowhere. The same holds when Strapi is unreachable and every product
 * loses its order at once: the catalog degrades to exactly the sequence it
 * showed before this field existed, rather than to an empty page.
 *
 * `order` is numbered per category (the catalog is only ever rendered
 * category-scoped), so cross-category rows fall through to the id tie-break.
 */
function sortByPlacement(
  products: KeyCrmProduct[],
  extrasIndex: ExtrasIndex
): KeyCrmProduct[] {
  const orderOf = (p: KeyCrmProduct) => extrasFor(extrasIndex, p)?.order;

  return [...products].sort((a, b) => {
    const oa = orderOf(a);
    const ob = orderOf(b);
    if (oa !== ob) {
      if (oa == null) return 1;
      if (ob == null) return -1;
      return oa - ob;
    }
    return a.id - b.id;
  });
}

/**
 * Strapi relation entries → the live KeyCRM products they name.
 *
 * A ref that resolves to nothing — archived in KeyCRM, deleted, or renamed
 * while still on the pre-`keycrmId` slug join — is dropped and named in a
 * warning, the same way the adapter already complains about offers with no size
 * property. Silently rendering a short row would read as a bug in the grid
 * rather than as a stale pointer in the CMS.
 */
function resolveRefs(
  refs: ProductRef[] | undefined,
  products: KeyCrmProduct[],
  context: string
): KeyCrmProduct[] {
  if (!refs?.length) return [];

  const byKeycrmId = new Map(products.map((p) => [p.id, p]));
  const bySlug = new Map(products.map((p) => [slugify(p.name), p]));

  const resolved: KeyCrmProduct[] = [];
  for (const ref of refs) {
    const match =
      (ref.keycrmId != null ? byKeycrmId.get(ref.keycrmId) : undefined) ??
      bySlug.get(ref.slug);
    if (match) {
      resolved.push(match);
      continue;
    }
    console.warn(
      `[api] ${context} points at "${ref.name}"` +
        (ref.keycrmId != null ? ` (keycrmId ${ref.keycrmId})` : "") +
        `, which is not a live KeyCRM product — dropping it and topping the row ` +
        `back up. Fix the list in Strapi, or set keycrmId if it was renamed.`
    );
  }
  return resolved;
}

/**
 * Take from each source in turn until the row holds `ROW_SIZE` products.
 *
 * This IS the fallback chain — the ordering of `sources` is the policy, and
 * every row on the site is built by handing it a different list. Sources are
 * lazy so an expensive one is never computed for a row the curated list already
 * filled. `exclude` seeds the dedup set, which is how the product being viewed
 * stays out of its own related row without ever counting against the limit.
 *
 * Deduplication is per row on purpose: the same hero product appearing in both
 * homepage sections is a deliberate editorial choice, not a mistake.
 */
function pickRow(
  sources: (() => KeyCrmProduct[])[],
  exclude: number[] = []
): KeyCrmProduct[] {
  const picked: KeyCrmProduct[] = [];
  const seen = new Set<number>(exclude);

  for (const source of sources) {
    if (picked.length >= ROW_SIZE) break;
    for (const candidate of source()) {
      if (picked.length >= ROW_SIZE) break;
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      picked.push(candidate);
    }
  }

  return picked;
}

/** The extras for a KeyCRM product, resolved the one canonical way. */
function extrasFor(extrasIndex: ExtrasIndex, p: KeyCrmProduct) {
  return resolveExtras(extrasIndex, p.id, slugify(p.name));
}

async function fetchOffers(productId: number): Promise<KeyCrmOffer[]> {
  const response = await fetchKeyCrm<{ data: KeyCrmOffer[] }>("/offers", {
    params: { "filter[product_id]": String(productId), limit: "50" },
    tags: ["products", `product-offers-${productId}`],
  });
  return response.data;
}

// ──────────────────────────────────────────────────────────────────────────
// Public: products
// ──────────────────────────────────────────────────────────────────────────

export async function getProducts(options?: {
  category?: string;
  filter?: string;
  limit?: number;
}): Promise<Product[]> {
  const [categoryById, extrasIndex] = await Promise.all([
    fetchCategoryMap(),
    getStrapiExtras(),
  ]);

  let categoryId: number | undefined;
  if (options?.category) {
    categoryId = [...categoryById.values()].find(
      (c) => categorySlug(c) === options.category
    )?.id;
    if (categoryId == null) return [];
  }

  // `filter` (filter tags) has no KeyCRM equivalent yet — tags are ignored.
  const products = sortByPlacement(
    await fetchAllProducts({ categoryId }),
    extrasIndex
  );
  let mapped = products.map((p) => toProduct(p, categoryById, extrasIndex));

  if (options?.limit) {
    mapped = mapped.slice(0, options.limit);
  }

  return mapped;
}

/**
 * One of the two curated product rows on the homepage.
 *
 * The chain per section, independently: **curated list → `featured` → catalog
 * order**. The homepage can therefore never go empty, and a four-column grid
 * never renders three cards — which reads as a bug, not as curation.
 *
 * The curated list doubles as a queue: only the first entries that resolve and
 * fit are used, so dragging a product to the top in Strapi puts it in the
 * section without anyone having to remove what it displaced.
 */
export async function getHomepageSection(
  section: "showcase" | "shopCta"
): Promise<Product[]> {
  const [categoryById, extrasIndex] = await Promise.all([
    fetchCategoryMap(),
    getStrapiExtras(),
  ]);

  const products = sortByPlacement(await fetchAllProducts(), extrasIndex);

  const picked = pickRow([
    () =>
      resolveRefs(extrasIndex.homepage[section], products, `homepage ${section}`),
    () => products.filter((p) => extrasFor(extrasIndex, p)?.featured),
    () => products,
  ]);

  return picked.map((p) => toProduct(p, categoryById, extrasIndex));
}

/**
 * The "Твій фул-сет тут" row under a product.
 *
 * Explicit `relatedProducts` from Strapi first — those may cross categories, so
 * a belt can suggest wrist wraps — then category-mates in editorial order. The
 * product being viewed is excluded *before* the limit is applied; doing it
 * after is what used to leave three cards in a four-column grid for whichever
 * product happened to be first in its category.
 *
 * A category with five products or fewer still yields a short row, and that is
 * deliberate: padding it from an unrelated category would be a worse answer
 * than showing everything there is.
 */
export async function getRelatedProducts(product: Product): Promise<Product[]> {
  const [categoryById, extrasIndex] = await Promise.all([
    fetchCategoryMap(),
    getStrapiExtras(),
  ]);

  const products = sortByPlacement(await fetchAllProducts(), extrasIndex);

  const currentId = Number(product.id);
  const extras = resolveExtras(extrasIndex, currentId, product.slug);

  const picked = pickRow(
    [
      () =>
        resolveRefs(
          extras?.relatedProducts,
          products,
          `relatedProducts of "${product.name}"`
        ),
      () =>
        products.filter((p) => {
          const category =
            p.category_id != null ? categoryById.get(p.category_id) : undefined;
          return category && categorySlug(category) === product.category;
        }),
    ],
    // Excluding the product being viewed here — rather than filtering the row
    // afterwards — is the whole fix: it never counts against the four, and a
    // list that happens to name itself isn't reported as a broken ref.
    [currentId]
  );

  return picked.map((p) => toProduct(p, categoryById, extrasIndex));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const [products, categoryById, extrasIndex] = await Promise.all([
    fetchAllProducts(),
    fetchCategoryMap(),
    getStrapiExtras(),
  ]);

  const match = products.find((p) => slugify(p.name) === slug);
  if (!match) return null;

  const offers = match.has_offers ? await fetchOffers(match.id) : undefined;
  return toProduct(match, categoryById, extrasIndex, offers);
}

export async function getAllProductSlugs(): Promise<string[]> {
  const products = await fetchAllProducts();
  return products.map((p) => slugify(p.name));
}

// ──────────────────────────────────────────────────────────────────────────
// Public: categories
// ──────────────────────────────────────────────────────────────────────────

const ALL_FILTER = { slug: "all", label: "УСІ" };

function toCategory(cat: KeyCrmCategory): Category {
  return {
    slug: categorySlug(cat),
    name: cat.name,
    // KeyCRM has no filter-tag taxonomy — only the implicit "all" filter.
    filters: [ALL_FILTER],
  };
}

export async function getCategories(): Promise<Category[]> {
  const categories = await fetchAllCategories();
  return categories.map(toCategory);
}

export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  const categories = await fetchAllCategories();
  const match = categories.find((c) => categorySlug(c) === slug);
  return match ? toCategory(match) : null;
}

export async function getAllCategorySlugs(): Promise<string[]> {
  const categories = await fetchAllCategories();
  return categories.map((c) => categorySlug(c));
}
