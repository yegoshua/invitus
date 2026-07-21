import type { MetadataRoute } from "next";
import { getAllCategorySlugs, getAllProductSlugs } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

// Rebuild the sitemap at most hourly so it stays fresh without hammering the
// KeyCRM API (60 req/min limit).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Indexable static routes. Funnel/transactional pages (/checkout,
  // /payment-result) are intentionally excluded — see robots.ts.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/refund`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic routes from KeyCRM — degrade gracefully: a transient outage or a
  // missing token at build time must not break sitemap generation.
  let categorySlugs: string[] = [];
  let productSlugs: string[] = [];
  try {
    [categorySlugs, productSlugs] = await Promise.all([
      getAllCategorySlugs(),
      getAllProductSlugs(),
    ]);
  } catch {
    // Keep just the static routes on failure.
  }

  const categoryRoutes: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${SITE_URL}/shop/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${SITE_URL}/product/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
