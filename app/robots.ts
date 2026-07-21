import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Allow all crawlers — including AI/GEO bots (GPTBot, PerplexityBot, Google-Extended,
// ClaudeBot, etc.) — so the brand can surface in AI answers. Only funnel,
// transactional and API routes are kept out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/checkout", "/payment-result", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
