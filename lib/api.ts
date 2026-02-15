import { fetchStrapi, getStrapiMedia } from "./strapi";
import type {
  StrapiResponse,
  StrapiProduct,
  StrapiCategory,
  StrapiFilterTag,
  TransformedProduct,
  TransformedCategory,
} from "@/types/strapi";

// Transform Strapi product to frontend format
function transformProduct(product: StrapiProduct): TransformedProduct {
  return {
    id: product.id.toString(),
    documentId: product.documentId,
    name: product.name,
    slug: product.slug,
    price: product.price,
    images: product.mainImage
      ? [
          {
            url: getStrapiMedia(product.mainImage.url),
            alt: product.mainImage.alternativeText || product.name,
          },
        ]
      : [],
    category: product.category?.slug,
    description: product.description || undefined,
    shortDescription: product.shortDescription || undefined,
    sizes: product.variants?.map((v) => v.name) || [],
    filterTags: product.filterTags?.map((t) => t.slug) || [],
    howToMeasure: product.howToMeasure || undefined,
    careInstructions: product.careInstructions || undefined,
    heroImage: product.heroImage
      ? getStrapiMedia(product.heroImage.url)
      : product.mainImage
        ? getStrapiMedia(product.mainImage.url)
        : undefined,
    bgImage: product.backgroundImage
      ? getStrapiMedia(product.backgroundImage.url)
      : undefined,
    galleryImages:
      product.galleryImages?.map((img) => ({
        src: getStrapiMedia(img.image?.url),
        alt: img.alt,
      })) || [],
    variants: product.variants?.map((v) => ({
      name: v.name,
      stock: v.stock,
      sku: v.sku || undefined,
      priceModifier: v.priceModifier,
    })),
    attributes: product.attributes?.map((a) => ({
      name: a.name,
      value: a.value,
    })),
    featured: product.featured,
  };
}

// Transform Strapi category to frontend format
function transformCategory(
  category: StrapiCategory,
  filterTags: StrapiFilterTag[] = []
): TransformedCategory {
  // Get filter tags for this category
  const categoryFilters = filterTags
    .filter((tag) => tag.category?.slug === category.slug)
    .sort((a, b) => a.order - b.order)
    .map((tag) => ({
      slug: tag.slug,
      label: tag.label,
    }));

  // Always add "all" filter at the beginning
  const filters = [{ slug: "all", label: "УСІ" }, ...categoryFilters];

  return {
    slug: category.slug,
    name: category.name,
    description: category.description || undefined,
    image: category.image ? getStrapiMedia(category.image.url) : undefined,
    filters,
  };
}

// API Functions

export async function getProducts(options?: {
  category?: string;
  filter?: string;
  featured?: boolean;
  limit?: number;
}): Promise<TransformedProduct[]> {
  const params = new URLSearchParams();

  // Populate all relations (Strapi 5 syntax)
  params.append("populate", "*");

  // Filters
  if (options?.category) {
    params.append("filters[category][slug][$eq]", options.category);
  }

  if (options?.filter && options.filter !== "all") {
    params.append("filters[filterTags][slug][$in]", options.filter);
  }

  if (options?.featured) {
    params.append("filters[featured][$eq]", "true");
  }

  // Sorting
  params.append("sort", "order:asc");

  // Pagination
  if (options?.limit) {
    params.append("pagination[limit]", options.limit.toString());
  }

  const response = await fetchStrapi<StrapiResponse<StrapiProduct[]>>(
    `/products?${params.toString()}`,
    {
      next: { revalidate: 60, tags: ["products"] },
    }
  );

  return response.data.map(transformProduct);
}

export async function getProductBySlug(
  slug: string
): Promise<TransformedProduct | null> {
  const params = new URLSearchParams();

  params.append("filters[slug][$eq]", slug);
  params.append("populate", "*");

  const response = await fetchStrapi<StrapiResponse<StrapiProduct[]>>(
    `/products?${params.toString()}`,
    {
      next: { revalidate: 60, tags: ["products", `product-${slug}`] },
    }
  );

  if (response.data.length === 0) {
    return null;
  }

  return transformProduct(response.data[0]);
}

export async function getAllProductSlugs(): Promise<string[]> {
  const response = await fetchStrapi<StrapiResponse<StrapiProduct[]>>(
    `/products?fields[0]=slug`,
    {
      next: { revalidate: 60, tags: ["products"] },
    }
  );

  return response.data.map((p) => p.slug);
}

export async function getCategories(): Promise<TransformedCategory[]> {
  const [categoriesRes, filterTagsRes] = await Promise.all([
    fetchStrapi<StrapiResponse<StrapiCategory[]>>(
      `/categories?sort=order:asc&populate=image`,
      {
        next: { revalidate: 60, tags: ["categories"] },
      }
    ),
    fetchStrapi<StrapiResponse<StrapiFilterTag[]>>(
      `/filter-tags?sort=order:asc&populate=category`,
      {
        next: { revalidate: 60, tags: ["filter-tags"] },
      }
    ),
  ]);

  return categoriesRes.data.map((cat) =>
    transformCategory(cat, filterTagsRes.data)
  );
}

export async function getCategoryBySlug(
  slug: string
): Promise<TransformedCategory | null> {
  const [categoriesRes, filterTagsRes] = await Promise.all([
    fetchStrapi<StrapiResponse<StrapiCategory[]>>(
      `/categories?filters[slug][$eq]=${slug}&populate=image`,
      {
        next: { revalidate: 60, tags: ["categories", `category-${slug}`] },
      }
    ),
    fetchStrapi<StrapiResponse<StrapiFilterTag[]>>(
      `/filter-tags?filters[category][slug][$eq]=${slug}&sort=order:asc&populate=category`,
      {
        next: { revalidate: 60, tags: ["filter-tags"] },
      }
    ),
  ]);

  if (categoriesRes.data.length === 0) {
    return null;
  }

  return transformCategory(categoriesRes.data[0], filterTagsRes.data);
}

export async function getAllCategorySlugs(): Promise<string[]> {
  const response = await fetchStrapi<StrapiResponse<StrapiCategory[]>>(
    `/categories?fields[0]=slug`,
    {
      next: { revalidate: 60, tags: ["categories"] },
    }
  );

  return response.data.map((c) => c.slug);
}

export async function getFeaturedProducts(
  limit = 4
): Promise<TransformedProduct[]> {
  return getProducts({ featured: true, limit });
}
