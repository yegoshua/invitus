import { test } from "node:test";
import assert from "node:assert/strict";

import { markdownToBlocks } from "./markdown-to-blocks.ts";
import type {
  BlocksImage,
  BlocksInline,
  BlocksParagraph,
  BlocksHeading,
  BlocksList,
  BlocksQuote,
  BlocksText,
} from "./article-body.ts";

/** Narrows away the link case, which most assertions here are not about. */
function texts(children: BlocksInline[]): BlocksText[] {
  return children.filter((child): child is BlocksText => child.type === "text");
}

// ── the shapes Strapi accepts ────────────────────────────────────────────────
// Every assertion here is against the JSON a `blocks` field validates, verified
// against a real Strapi 5.34 instance. Getting a nesting level wrong does not
// fail loudly at publish time — it fails at the API, on an article that was
// already written.

test("a paragraph becomes one paragraph node", () => {
  const blocks = markdownToBlocks("Пояс — це інструмент.");

  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0], {
    type: "paragraph",
    children: [{ type: "text", text: "Пояс — це інструмент." }],
  });
});

test("blank lines separate paragraphs, a single newline does not", () => {
  const blocks = markdownToBlocks("Перший\nрядок\n\nДругий");

  assert.equal(blocks.length, 2);
  assert.equal(texts((blocks[0] as BlocksParagraph).children)[0].text, "Перший\nрядок");
  assert.equal(texts((blocks[1] as BlocksParagraph).children)[0].text, "Другий");
});

test("## and ### carry their level", () => {
  const blocks = markdownToBlocks("## Товщина\n\n### Ширина");

  assert.deepEqual(blocks[0], {
    type: "heading",
    level: 2,
    children: [{ type: "text", text: "Товщина" }],
  });
  assert.equal((blocks[1] as BlocksHeading).level, 3);
});

// ── the h1 rule ──────────────────────────────────────────────────────────────
// The page has exactly one h1 and it comes from the `title` field. A generated
// `#` has to stop the publish rather than quietly ship a second h1.

test("a level-1 heading is refused, and the message says what to do instead", () => {
  assert.throws(
    () => markdownToBlocks("# Заголовок статті\n\nТекст"),
    (error: Error) => {
      assert.match(error.message, /Заголовок статті/);
      assert.match(error.message, /title/);
      return true;
    }
  );
});

test("the refusal names the line, so a long generated document is navigable", () => {
  assert.throws(
    () => markdownToBlocks("Вступ\n\n## Розділ\n\nТекст\n\n# Помилка"),
    /line 7/
  );
});

// ── lists ────────────────────────────────────────────────────────────────────

test("an unordered list nests items under one list node", () => {
  const blocks = markdownToBlocks("- 10 мм м'якший\n- 13 мм жорсткіший");

  const list = blocks[0] as BlocksList;
  assert.equal(list.type, "list");
  assert.equal(list.format, "unordered");
  assert.equal(list.children.length, 2);
  assert.deepEqual(list.children[0], {
    type: "list-item",
    children: [{ type: "text", text: "10 мм м'якший" }],
  });
});

// Sub-lists are ordinary in a how-to article, and mdast nests them inside the
// parent's list-item. Strapi refuses that — "Inline node must be Text or Link"
// — and wants the nested list as a sibling of the item instead, verified
// against a real Strapi 5.34. So the converter hoists it.
test("a nested list is hoisted to sit beside its parent item, not inside it", () => {
  const blocks = markdownToBlocks("- перший\n  - вкладений\n- другий");

  const list = blocks[0] as BlocksList;
  assert.deepEqual(
    list.children.map((child) => child.type),
    ["list-item", "list", "list-item"]
  );

  const nested = list.children[1] as BlocksList;
  assert.equal(nested.format, "unordered");
  assert.deepEqual(nested.children[0], {
    type: "list-item",
    children: [{ type: "text", text: "вкладений" }],
  });
});

test("a nested list keeps its own format, so an ordered sub-list stays ordered", () => {
  const blocks = markdownToBlocks("- крок\n  1. спершу\n  2. потім");

  const nested = (blocks[0] as BlocksList).children[1] as BlocksList;
  assert.equal(nested.format, "ordered");
  assert.equal(nested.children.length, 2);
});

test("an ordered list is the same node with a different format", () => {
  const blocks = markdownToBlocks("1. Перший\n2. Другий");

  assert.equal((blocks[0] as BlocksList).format, "ordered");
  assert.equal((blocks[0] as BlocksList).children.length, 2);
});

// ── the quote convention ─────────────────────────────────────────────────────
// A quote is the red callout panel. The blog has no other quote style — see the
// note in lib/article-body.ts.

test("a blockquote becomes a quote node", () => {
  const blocks = markdownToBlocks("> Бери пояс на важелі.");

  assert.deepEqual(blocks[0] as BlocksQuote, {
    type: "quote",
    children: [{ type: "text", text: "Бери пояс на важелі." }],
  });
});

test("a multi-paragraph blockquote collapses into one quote node", () => {
  // Strapi's quote node holds inline children, not blocks. Left unflattened
  // this produces a paragraph nested inside a quote, which the API rejects.
  const blocks = markdownToBlocks("> Перший абзац\n>\n> Другий абзац");

  assert.equal(blocks.length, 1);
  const quote = blocks[0] as BlocksQuote;
  assert.equal(quote.type, "quote");
  assert.ok(quote.children.every((child) => child.type === "text"));
});

// ── inline ───────────────────────────────────────────────────────────────────

test("bold and italic become modifiers on the text node, not wrappers", () => {
  const blocks = markdownToBlocks("Це **важливо** і *трохи* менш.");

  assert.deepEqual((blocks[0] as BlocksParagraph).children, [
    { type: "text", text: "Це " },
    { type: "text", text: "важливо", bold: true },
    { type: "text", text: " і " },
    { type: "text", text: "трохи", italic: true },
    { type: "text", text: " менш." },
  ]);
});

test("nested emphasis carries both modifiers on one node", () => {
  const blocks = markdownToBlocks("**дуже *дуже* важливо**");

  const children = texts((blocks[0] as BlocksParagraph).children);
  const both = children.find((child) => child.italic);
  assert.deepEqual(both, { type: "text", text: "дуже", bold: true, italic: true });
});

test("a link is an inline node wrapping its own text", () => {
  const blocks = markdownToBlocks("Дивись [каталог](/shop/belts) зараз.");

  const children = (blocks[0] as BlocksParagraph).children;
  assert.deepEqual(children[1], {
    type: "link",
    url: "/shop/belts",
    children: [{ type: "text", text: "каталог" }],
  });
});

test("inline code survives as a modifier", () => {
  const blocks = markdownToBlocks("Розмір `65-80 см` підходить.");

  const children = (blocks[0] as BlocksParagraph).children;
  assert.deepEqual(children[1], { type: "text", text: "65-80 см", code: true });
});

// ── images ───────────────────────────────────────────────────────────────────
// The converter never invents a media id. The publish script uploads the file,
// then hands the resolved media entry back here by the key used in the Markdown.

/**
 * A complete Strapi media entry. Every field here is one the API refuses the
 * article without — verified by writing a converted document into a real
 * Strapi 5.34: an image node built from just `{ id, url }` came back with
 * eleven validation errors, one per missing field.
 */
function mediaEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    url: "/uploads/buckle_a1b2c3.webp",
    name: "buckle.webp",
    hash: "buckle_a1b2c3",
    ext: ".webp",
    mime: "image/webp",
    size: 41.2,
    width: 1600,
    height: 1200,
    formats: null,
    provider: "local",
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
    ...overrides,
  };
}

test("an image resolves through the supplied media map", () => {
  const media = mediaEntry();
  const blocks = markdownToBlocks("![](buckle.jpg)", { images: { "buckle.jpg": media } });

  const image = blocks[0] as BlocksImage;
  assert.equal(image.type, "image");
  assert.deepEqual(image.image, media);
});

test("an image node still carries the empty children Strapi expects", () => {
  const blocks = markdownToBlocks("![](buckle.jpg)", {
    images: { "buckle.jpg": mediaEntry() },
  });

  assert.deepEqual((blocks[0] as BlocksImage).children, [{ type: "text", text: "" }]);
});

test("an unresolved image is refused by name rather than published broken", () => {
  assert.throws(() => markdownToBlocks("![](missing.jpg)", { images: {} }), /missing\.jpg/);
});

// The failure this guards against is not hypothetical: an image node carrying
// only id and url reaches the API and is rejected there, after the upload has
// already happened and on an article that was already written. Refusing here
// costs a second; refusing there costs a half-finished publish.
test("a media entry missing the fields Strapi requires is refused, and they are named", () => {
  const incomplete = { id: 42, url: "/uploads/buckle.webp" } as never;

  assert.throws(
    () => markdownToBlocks("![](buckle.jpg)", { images: { "buckle.jpg": incomplete } }),
    (error: Error) => {
      assert.match(error.message, /buckle\.jpg/);
      assert.match(error.message, /width/);
      assert.match(error.message, /mime/);
      return true;
    }
  );
});

test("a media entry with a null formats field is complete — Strapi allows the null", () => {
  assert.doesNotThrow(() =>
    markdownToBlocks("![](buckle.jpg)", { images: { "buckle.jpg": mediaEntry({ formats: null }) } })
  );
});

test("an image on its own line is a block, not an inline child of a paragraph", () => {
  const blocks = markdownToBlocks("Текст\n\n![](buckle.jpg)\n\nЩе текст", {
    images: { "buckle.jpg": mediaEntry() },
  });

  assert.deepEqual(
    blocks.map((block) => block.type),
    ["paragraph", "image", "paragraph"]
  );
});

// ── the whole document ───────────────────────────────────────────────────────

test("an empty document is an empty list of blocks, not a throw", () => {
  assert.deepEqual(markdownToBlocks(""), []);
  assert.deepEqual(markdownToBlocks("\n\n  \n"), []);
});
