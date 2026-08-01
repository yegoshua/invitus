// KeyCRM adapter.
//
// Sole owner of: fetching, schema knowledge, slug generation, fallbacks.
// UI code consumes the domain types from `@/types` and does not know
// KeyCRM exists. If KeyCRM changes (renamed field, new property type),
// edits live here.
//
// KeyCRM is the commerce source of truth: products, prices, stock, photos,
// categories, variants (offers). Presentation content — 3D models, hero
// backgrounds, measurement guides, featured flags — comes from Strapi via
// lib/product-extras.ts (matched by keycrmId field or slug), with
// content/product-extras.ts as the offline fallback when Strapi is down.

import { fetchKeyCrm, fetchKeyCrmAll } from "./keycrm";
import { slugify } from "./slugify";
import { readOfferVariant, VARIANT_PROPERTY_NAMES } from "./variant-property";
import {
  getStrapiExtras,
  resolveExtras,
  type ExtrasIndex,
} from "./product-extras";
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

// Categories temporarily hidden from the entire site: navigation, catalog,
// sitemap, featured lists and product pages. Filtered at the fetch layer so
// every consumer is covered. To bring a category back, just remove its id.
const HIDDEN_CATEGORY_IDS = new Set<number>([
  5, // Додаткові товари — Браслет, Рушник, ID Card. Ціна 0, категорії немає в
  //    навігації, а сторінки все одно віддавались і лежали в sitemap.
  6, // Футболки — поки немає в продажу
  7, // Службове (тест) — 0.50 ₴ товар для перевірки бойового еквайрингу
]);

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
  const extras = resolveExtras(extrasIndex, p.id, slug);

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
  featured?: boolean;
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
  const products = await fetchAllProducts({ categoryId });
  let mapped = products.map((p) => toProduct(p, categoryById, extrasIndex));

  // `featured` comes from content/product-extras.ts; if nothing is marked,
  // fall back to plain catalog order so the homepage never goes empty.
  if (options?.featured) {
    const featured = mapped.filter((p) => p.featured);
    if (featured.length) mapped = featured;
  }

  if (options?.limit) {
    mapped = mapped.slice(0, options.limit);
  }

  return mapped;
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

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  return getProducts({ featured: true, limit });
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
