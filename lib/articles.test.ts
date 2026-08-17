import { test } from "node:test";
import assert from "node:assert/strict";

import { indexArticles } from "./articles.ts";

type RawArticle = Parameters<typeof indexArticles>[0][number];

function raw(overrides: Partial<RawArticle> = {}): RawArticle {
  return {
    id: 1,
    title: "Як обрати пояс",
    slug: "yak-obraty-poyas",
    excerpt: "Коротко про головне",
    category: "ЕКІПІРУВАННЯ",
    publishedAt: "2026-08-01T10:00:00.000Z",
    body: [{ type: "paragraph", children: [{ type: "text", text: "слово" }] }],
    cover: { url: "/uploads/cover.webp", alternativeText: null, width: 1600, height: 900 },
    ...overrides,
  };
}

test("newest first, whatever order Strapi hands them over in", () => {
  const listed = indexArticles([
    raw({ id: 1, slug: "old", publishedAt: "2026-01-01T00:00:00.000Z" }),
    raw({ id: 2, slug: "newest", publishedAt: "2026-08-01T00:00:00.000Z" }),
    raw({ id: 3, slug: "middle", publishedAt: "2026-04-01T00:00:00.000Z" }),
  ]);

  assert.deepEqual(
    listed.map((article) => article.slug),
    ["newest", "middle", "old"]
  );
});

// The card's figure comes from the body, so a stored field can never disagree
// with the text — the whole point of computing it.
test("reading time is computed from the body", () => {
  const words = Array.from({ length: 1000 }, (_, i) => `слово${i}`).join(" ");
  const [article] = indexArticles([
    raw({ body: [{ type: "paragraph", children: [{ type: "text", text: words }] }] }),
  ]);

  assert.equal(article.readingTimeMinutes, 5);
});

test("an article whose body came back empty still reads as a minute", () => {
  const [article] = indexArticles([raw({ body: null })]);
  assert.equal(article.readingTimeMinutes, 1);
});

// Cover is required by the schema, but a media entry can be deleted out from
// under a published article. A card with a hole where the image goes is worse
// than one card fewer.
test("an article without a cover is dropped rather than rendered bare", () => {
  const listed = indexArticles([raw({ slug: "kept" }), raw({ id: 2, slug: "coverless", cover: null })]);

  assert.deepEqual(
    listed.map((article) => article.slug),
    ["kept"]
  );
});

test("the cover falls back to the title for its alt text", () => {
  const [withAlt] = indexArticles([
    raw({ cover: { url: "/uploads/c.webp", alternativeText: "Пояс на помості", width: null, height: null } }),
  ]);
  const [withoutAlt] = indexArticles([raw({ title: "Заголовок" })]);

  assert.equal(withAlt.cover.alt, "Пояс на помості");
  assert.equal(withoutAlt.cover.alt, "Заголовок");
});

test("an empty list is an empty list — zero published articles is a legitimate answer", () => {
  assert.deepEqual(indexArticles([]), []);
});
