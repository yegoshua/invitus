// Strapi adapter.
//
// Sole owner of: fetching, schema knowledge, media URL resolution, fallbacks.
// UI code consumes the domain types from `@/types` and does not know
// Strapi exists. If Strapi changes (renamed field, new media component,
// additional locale handling), edits live here.

import { fetchStrapi, getStrapiMedia } from "./strapi";
import type {
  StrapiResponse,
  StrapiProduct,
  StrapiCategory,
  StrapiFilterTag,
  StrapiMedia,
} from "./strapi-schema";
import type { Product, Category, ProductImage } from "@/types";

// ──────────────────────────────────────────────────────────────────────────
// Internal: media → ProductImage
// ──────────────────────────────────────────────────────────────────────────

function toProductImage(
  media: StrapiMedia | null | undefined,
  fallbackAlt: string
): ProductImage | undefined {
  if (!media) return undefined;
  return {
    url: getStrapiMedia(media.url),
    alt: media.alternativeText || fallbackAlt,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Internal: StrapiProduct → Product
// ──────────────────────────────────────────────────────────────────────────

function toProduct(p: StrapiProduct): Product {
  const mainImage = toProductImage(p.mainImage, p.name);

  return {
    id: p.id.toString(),
    documentId: p.documentId,
    name: p.name,
    slug: p.slug,
    price: p.price,
    category: p.category?.slug,

    description: p.description ?? undefined,
    shortDescription: p.shortDescription ?? undefined,
    howToMeasure: p.howToMeasure ?? undefined,
    careInstructions: p.careInstructions ?? undefined,

    mainImage,
    heroImage: toProductImage(p.heroImage, p.name) ?? mainImage,
    bgImage: toProductImage(p.backgroundImage, p.name),
    galleryImages:
      p.galleryImages
        ?.map((img) => toProductImage(img.image, img.alt))
        .filter((img): img is ProductImage => Boolean(img)) ?? [],

    model3dUrl: p.model3d ? getStrapiMedia(p.model3d.url) : undefined,

    sizes: p.variants?.map((v) => v.name) ?? [],
    filterTags: p.filterTags?.map((t) => t.slug) ?? [],

    variants: p.variants?.map((v) => ({
      name: v.name,
      stock: v.stock,
      sku: v.sku ?? undefined,
      priceModifier: v.priceModifier,
    })),
    attributes: p.attributes?.map((a) => ({
      name: a.name,
      value: a.value,
    })),

    featured: p.featured,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Internal: StrapiCategory → Category
// ──────────────────────────────────────────────────────────────────────────

const ALL_FILTER = { slug: "all", label: "УСІ" };

function toCategory(
  cat: StrapiCategory,
  filterTags: StrapiFilterTag[] = []
): Category {
  const categoryFilters = filterTags
    .filter((tag) => tag.category?.slug === cat.slug)
    .sort((a, b) => a.order - b.order)
    .map((tag) => ({ slug: tag.slug, label: tag.label }));

  return {
    slug: cat.slug,
    name: cat.name,
    description: cat.description ?? undefined,
    image: cat.image ? getStrapiMedia(cat.image.url) : undefined,
    filters: [ALL_FILTER, ...categoryFilters],
  };
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
  const params = new URLSearchParams();
  params.append("populate", "*");

  if (options?.category) {
    params.append("filters[category][slug][$eq]", options.category);
  }

  if (options?.filter && options.filter !== "all") {
    params.append("filters[filterTags][slug][$in]", options.filter);
  }

  if (options?.featured) {
    params.append("filters[featured][$eq]", "true");
  }

  params.append("sort", "order:asc");

  if (options?.limit) {
    params.append("pagination[limit]", options.limit.toString());
  }

  const response = await fetchStrapi<StrapiResponse<StrapiProduct[]>>(
    `/products?${params.toString()}`,
    { next: { revalidate: 60, tags: ["products"] } }
  );

  return response.data.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const query = new URLSearchParams({
    "filters[slug][$eq]": slug,
    "populate[mainImage]": "true",
    "populate[heroImage]": "true",
    "populate[backgroundImage]": "true",
    "populate[model3d]": "true",
    "populate[category]": "true",
    "populate[filterTags]": "true",
    "populate[variants]": "true",
    "populate[attributes]": "true",
    "populate[galleryImages][populate]": "*",
  });

  const response = await fetchStrapi<StrapiResponse<StrapiProduct[]>>(
    `/products?${query.toString()}`,
    { next: { revalidate: 60, tags: ["products", `product-${slug}`] } }
  );

  if (response.data.length === 0) return null;
  return toProduct(response.data[0]);
}

export async function getAllProductSlugs(): Promise<string[]> {
  const response = await fetchStrapi<StrapiResponse<StrapiProduct[]>>(
    `/products?fields[0]=slug`,
    { next: { revalidate: 60, tags: ["products"] } }
  );
  return response.data.map((p) => p.slug);
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  return getProducts({ featured: true, limit });
}

// ──────────────────────────────────────────────────────────────────────────
// Public: categories
// ──────────────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const [categoriesRes, filterTagsRes] = await Promise.all([
    fetchStrapi<StrapiResponse<StrapiCategory[]>>(
      `/categories?sort=order:asc&populate=image`,
      { next: { revalidate: 60, tags: ["categories"] } }
    ),
    fetchStrapi<StrapiResponse<StrapiFilterTag[]>>(
      `/filter-tags?sort=order:asc&populate=category`,
      { next: { revalidate: 60, tags: ["filter-tags"] } }
    ),
  ]);

  return categoriesRes.data.map((cat) => toCategory(cat, filterTagsRes.data));
}

export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  const [categoriesRes, filterTagsRes] = await Promise.all([
    fetchStrapi<StrapiResponse<StrapiCategory[]>>(
      `/categories?filters[slug][$eq]=${slug}&populate=image`,
      { next: { revalidate: 60, tags: ["categories", `category-${slug}`] } }
    ),
    fetchStrapi<StrapiResponse<StrapiFilterTag[]>>(
      `/filter-tags?filters[category][slug][$eq]=${slug}&sort=order:asc&populate=category`,
      { next: { revalidate: 60, tags: ["filter-tags"] } }
    ),
  ]);

  if (categoriesRes.data.length === 0) return null;
  return toCategory(categoriesRes.data[0], filterTagsRes.data);
}

export async function getAllCategorySlugs(): Promise<string[]> {
  const response = await fetchStrapi<StrapiResponse<StrapiCategory[]>>(
    `/categories?fields[0]=slug`,
    { next: { revalidate: 60, tags: ["categories"] } }
  );
  return response.data.map((c) => c.slug);
}
