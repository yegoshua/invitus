import { test } from "node:test";
import assert from "node:assert/strict";

import { blogSitemapEntries } from "./blog-sitemap.ts";

const SITE = "https://invitus.com.ua";
const NOW = new Date("2026-09-29T12:00:00.000Z");

test("lists /blog and every article, dated by its last edit", () => {
  const entries = blogSitemapEntries(
    [
      { slug: "yak-obraty-poyas", updatedAt: "2026-09-01T10:00:00.000Z" },
      { slug: "bynty", updatedAt: "2026-07-15T08:30:00.000Z" },
    ],
    SITE,
    NOW
  );

  assert.deepEqual(
    entries.map((entry) => [entry.url, (entry.lastModified as Date).toISOString()]),
    [
      [`${SITE}/blog`, "2026-09-01T10:00:00.000Z"],
      [`${SITE}/blog/yak-obraty-poyas`, "2026-09-01T10:00:00.000Z"],
      [`${SITE}/blog/bynty`, "2026-07-15T08:30:00.000Z"],
    ]
  );
});

// The listing's date follows the newest edit, not the first article in the
// list — the list is sorted by publish date, and an old article edited today
// changes /blog too.
test("/blog takes the newest edit, whatever the order", () => {
  const [blog] = blogSitemapEntries(
    [
      { slug: "newer-publish", updatedAt: "2026-08-01T00:00:00.000Z" },
      { slug: "older-publish-edited-later", updatedAt: "2026-09-20T00:00:00.000Z" },
    ],
    SITE,
    NOW
  );

  assert.equal((blog.lastModified as Date).toISOString(), "2026-09-20T00:00:00.000Z");
});

// A Strapi outage reaches here as an empty list: the listing must stay in the
// sitemap rather than vanish from it for an hour.
test("with no articles, /blog is still listed and falls back to the given date", () => {
  const entries = blogSitemapEntries([], SITE, NOW);

  assert.deepEqual(entries, [
    { url: `${SITE}/blog`, lastModified: NOW, changeFrequency: "weekly", priority: 0.6 },
  ]);
});
