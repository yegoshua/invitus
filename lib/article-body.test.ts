import { test } from "node:test";
import assert from "node:assert/strict";

import { readingTimeMinutes } from "./article-body.ts";
import type { BlocksNode } from "./article-body.ts";

function paragraph(text: string): BlocksNode {
  return { type: "paragraph", children: [{ type: "text", text }] };
}

function words(count: number): string {
  return Array.from({ length: count }, (_, i) => `слово${i}`).join(" ");
}

test("two hundred words is one minute", () => {
  assert.equal(readingTimeMinutes([paragraph(words(200))]), 1);
});

test("a thousand words is five, which is the figure on the design", () => {
  assert.equal(readingTimeMinutes([paragraph(words(1000))]), 5);
});

test("words are counted across every block, not just the first", () => {
  const blocks = [paragraph(words(150)), paragraph(words(150)), paragraph(words(100))];
  assert.equal(readingTimeMinutes(blocks), 2);
});

// A rounded-down count would print "0 хв. читання" on anything under two
// hundred words, which reads as a bug rather than as a short article.
test("a short article is one minute, never zero", () => {
  assert.equal(readingTimeMinutes([paragraph("Три слова тут")]), 1);
});

test("an empty article is still one minute", () => {
  assert.equal(readingTimeMinutes([]), 1);
});

test("text nested inside headings, lists, quotes and links all counts", () => {
  const blocks: BlocksNode[] = [
    { type: "heading", level: 2, children: [{ type: "text", text: words(50) }] },
    {
      type: "list",
      format: "unordered",
      children: [{ type: "list-item", children: [{ type: "text", text: words(50) }] }],
    },
    { type: "quote", children: [{ type: "text", text: words(50) }] },
    {
      type: "paragraph",
      children: [
        { type: "link", url: "/shop", children: [{ type: "text", text: words(50) }] },
      ],
    },
  ];

  assert.equal(readingTimeMinutes(blocks), 1);
});

// An image is the one block that costs the reader time without carrying words.
// It is not counted: guessing at seconds-per-image would make the figure less
// honest, not more.
test("an image contributes no words", () => {
  const blocks: BlocksNode[] = [
    {
      type: "image",
      image: {
        id: 1,
        url: "/uploads/x.webp",
        name: "x.webp",
        hash: "x_a1b2",
        ext: ".webp",
        mime: "image/webp",
        size: 12.5,
        width: 800,
        height: 600,
        formats: null,
        provider: "local",
        createdAt: "2026-08-15T10:00:00.000Z",
        updatedAt: "2026-08-15T10:00:00.000Z",
      },
      children: [{ type: "text", text: "" }],
    },
    paragraph(words(400)),
  ];

  assert.equal(readingTimeMinutes(blocks), 2);
});

test("punctuation and multiple spaces do not inflate the count", () => {
  assert.equal(readingTimeMinutes([paragraph("Один,   два.   Три!")]), 1);
});

test("rounds to the nearest minute rather than always up", () => {
  // 260 words is 1.3 minutes — closer to one than to two.
  assert.equal(readingTimeMinutes([paragraph(words(260))]), 1);
  // 320 is 1.6, which rounds the other way.
  assert.equal(readingTimeMinutes([paragraph(words(320))]), 2);
});
