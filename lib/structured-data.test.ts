import { test } from "node:test";
import assert from "node:assert/strict";

import { SITE_URL } from "./site.ts";
import { blogPostingSchema, websiteSchema } from "./structured-data.ts";
import type { Article } from "../types/index.ts";

const ORGANIZATION = { "@id": `${SITE_URL}/#organization` };

test("WebSite names the site and points its publisher at the Organization", () => {
  const website = websiteSchema();

  assert.equal(website["@type"], "WebSite");
  assert.equal(website.url, `${SITE_URL}/`);
  assert.equal(website.name, "INVITUS");
  assert.deepEqual(website.publisher, ORGANIZATION);
});

// A SearchAction promises a search results page at a URL. The site has none,
// so declaring one would send Google to a page that does not exist.
test("WebSite carries no SearchAction while the site has no search", () => {
  assert.equal("potentialAction" in websiteSchema(), false);
});

function article(overrides: Partial<Article> = {}): Article {
  return {
    id: "1",
    title: "Як обрати атлетичний пояс",
    slug: "yak-obraty-atletychnyy-poyas",
    excerpt: "Товщина, застібка, розмір.",
    category: "ЕКІПІРУВАННЯ",
    publishedAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    readingTimeMinutes: 5,
    cover: { url: "https://cdn.example/cover.webp", alt: "Пояс на помості" },
    body: [],
    ...overrides,
  };
}

test("BlogPosting describes the article as the page prints it", () => {
  const posting = blogPostingSchema(article());
  const url = `${SITE_URL}/blog/yak-obraty-atletychnyy-poyas`;

  assert.equal(posting["@type"], "BlogPosting");
  assert.equal(posting.headline, "Як обрати атлетичний пояс");
  assert.equal(posting.description, "Товщина, застібка, розмір.");
  assert.equal(posting.url, url);
  assert.equal(posting.mainEntityOfPage, url);
  assert.deepEqual(posting.image, ["https://cdn.example/cover.webp"]);
  assert.equal(posting.datePublished, "2026-09-01T10:00:00.000Z");
  assert.equal(posting.dateModified, "2026-09-20T08:00:00.000Z");
});

// There is no author field in Strapi: the brand writes the blog, so the brand
// is the author. Naming a person nobody entered would be invented data.
test("BlogPosting is authored and published by the Organization", () => {
  const posting = blogPostingSchema(article());

  assert.deepEqual(posting.author, {
    "@type": "Organization",
    ...ORGANIZATION,
    name: "INVITUS",
  });
  assert.deepEqual(posting.publisher, ORGANIZATION);
});

// seoTitle/seoDescription feed <title> and the meta description only. The
// page prints `title` in its h1, and structured data has to match the page.
test("BlogPosting ignores the SEO title and description, which the page never prints", () => {
  const posting = blogPostingSchema(
    article({ seoTitle: "Як вибрати пояс для пауерліфтингу", seoDescription: "Гайд." })
  );

  assert.equal(posting.headline, "Як обрати атлетичний пояс");
  assert.equal(posting.description, "Товщина, застібка, розмір.");
});

test("a site-relative cover becomes absolute", () => {
  const posting = blogPostingSchema(article({ cover: { url: "/assets/cover.webp", alt: "" } }));

  assert.deepEqual(posting.image, [`${SITE_URL}/assets/cover.webp`]);
});
