// The blog's half of app/sitemap.ts, kept pure so it is testable without a
// Strapi or a Next runtime.
import type { MetadataRoute } from "next";
import type { ArticleSummary } from "../types/index.ts";

/**
 * `/blog` plus one entry per published article.
 *
 * `/blog` is listed even when `articles` is empty — the listing exists whether
 * or not Strapi could be read just now, and dropping it from the sitemap for an
 * hour because the CMS was asleep would tell crawlers it went away. Its date is
 * the newest article edit, since that is the only thing that changes the page;
 * with no articles to go by it is `fallback`.
 */
export function blogSitemapEntries(
  articles: Pick<ArticleSummary, "slug" | "updatedAt">[],
  siteUrl: string,
  fallback: Date
): MetadataRoute.Sitemap {
  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}/blog/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const newest = articles.reduce<string | null>(
    (latest, article) =>
      latest === null || article.updatedAt > latest ? article.updatedAt : latest,
    null
  );

  return [
    {
      url: `${siteUrl}/blog`,
      lastModified: newest ? new Date(newest) : fallback,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...articleRoutes,
  ];
}
