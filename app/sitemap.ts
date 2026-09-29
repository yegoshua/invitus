import type { MetadataRoute } from "next";
import { getAllCategorySlugs, getAllProductSlugs } from "@/lib/api";
import { getArticles } from "@/lib/articles";
import { blogSitemapEntries } from "@/lib/blog-sitemap";
import { SITE_URL } from "@/lib/site";
import type { ArticleSummary } from "@/types";

// Rebuild the sitemap at most hourly so it stays fresh without hammering the
// KeyCRM API (60 req/min limit). Articles come through lib/articles.ts's own
// cache, busted on publish, so an hour is also the most a new one waits here.
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

  // Blog from Strapi, started first so it runs alongside KeyCRM, and caught on
  // its own so one source being down never costs the other its entries. Unlike
  // /blog itself, the sitemap may swallow the error: getArticles() throws rather
  // than return [] so the listing never caches an empty blog under a 200, but
  // here an outage only omits the articles until the next rebuild — /blog stays
  // listed either way. The failure is already logged by lib/articles.ts.
  const articlesPromise = getArticles().catch((): ArticleSummary[] => []);

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

  const articles = await articlesPromise;

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...productRoutes,
    ...blogSitemapEntries(articles, SITE_URL, now),
  ];
}
