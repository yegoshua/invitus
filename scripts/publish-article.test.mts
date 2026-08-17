import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mediaName,
  splitFrontMatter,
  validateBodyAndCollectImages,
  validateFrontMatter,
} from "./publish-article.mts";

// The script's I/O half — uploading, writing to Strapi — has no seam worth
// testing and is exercised by running it. What is tested here is everything
// that decides whether a write should happen at all, because those decisions
// run before anything is uploaded and are the whole reason a bad article costs
// nothing.

const FRONT = `---
title: Як обрати пояс
slug: yak-obraty-poyas
category: ЕКІПІРУВАННЯ
excerpt: Коротко про головне.
cover: cover.jpg
images:
  buckle.jpg: Важільна застібка
---

Тіло статті.
`;

// ── front matter ─────────────────────────────────────────────────────────────

test("front matter is parsed and the body starts after it", () => {
  const { data, body } = splitFrontMatter(FRONT);

  assert.equal((data as { title: string }).title, "Як обрати пояс");
  assert.equal(body.trim(), "Тіло статті.");
});

test("a file with no front matter is refused", () => {
  assert.throws(() => splitFrontMatter("Просто текст"), /front matter/i);
});

// A `---` mid-document is a horizontal rule, which the converter refuses by
// name. Treating one as a closing delimiter would silently truncate the article
// at a plausible-looking place, which is the worst kind of wrong.
test("only a leading delimiter counts, so a mid-document rule is left in the body", () => {
  const { body } = splitFrontMatter(`---\ntitle: T\n---\n\nПерший\n\n---\n\nДругий\n`);

  assert.match(body, /Перший/);
  assert.match(body, /---/);
  assert.match(body, /Другий/);
});

test("every missing required field is named at once, not one per run", () => {
  assert.throws(
    () => validateFrontMatter({ title: "Т", cover: "c.jpg" }),
    (error: Error) => {
      assert.match(error.message, /slug/);
      assert.match(error.message, /excerpt/);
      assert.match(error.message, /category/);
      return true;
    }
  );
});

test("a blank field counts as missing", () => {
  assert.throws(
    () => validateFrontMatter({ title: "  ", slug: "s", excerpt: "e", category: "ТЕХНІКА", cover: "c.jpg" }),
    /title/
  );
});

// Checked before any upload: Strapi would reject it too, but only after the
// images are already sitting in the media library.
test("a category outside the schema's enumeration is refused, and the options listed", () => {
  assert.throws(
    () => validateFrontMatter({ title: "Т", slug: "s", excerpt: "e", category: "ПОБУТ", cover: "c.jpg" }),
    /ЕКІПІРУВАННЯ/
  );
});

test("a complete front matter passes through unchanged", () => {
  const { data } = splitFrontMatter(FRONT);
  const front = validateFrontMatter(data);

  assert.equal(front.slug, "yak-obraty-poyas");
  assert.equal(front.images?.["buckle.jpg"], "Важільна застібка");
});

// ── media names ──────────────────────────────────────────────────────────────

test("the upload name is derived from the slug, so two articles can both ship cover.jpg", () => {
  assert.equal(mediaName("yak-obraty-poyas", "cover.jpg"), "yak-obraty-poyas-cover.webp");
  assert.notEqual(
    mediaName("inshyy-post", "cover.jpg"),
    mediaName("yak-obraty-poyas", "cover.jpg")
  );
});

test("the name is always .webp, since that is what gets uploaded", () => {
  assert.match(mediaName("s", "photo.PNG"), /\.webp$/);
});

test("characters that would need escaping in a query are stripped", () => {
  assert.equal(mediaName("s", "фото 1.jpg"), "s--1.webp");
});

// ── the pre-upload body check ────────────────────────────────────────────────

test("the images a body references are collected without any of them existing yet", () => {
  const found = validateBodyAndCollectImages("Текст\n\n![](buckle.jpg)\n\n![](strap.jpg)");

  assert.deepEqual(found, ["buckle.jpg", "strap.jpg"]);
});

test("a body with no images collects nothing rather than failing", () => {
  assert.deepEqual(validateBodyAndCollectImages("## Розділ\n\nТекст"), []);
});

// This is the check that makes a malformed article free: it fails here, before
// a single byte has been uploaded, rather than after.
test("an h1 in the body is refused during the collection pass", () => {
  assert.throws(() => validateBodyAndCollectImages("# Заголовок\n\nТекст"), /title/);
});

test("a horizontal rule is refused during the collection pass too", () => {
  assert.throws(() => validateBodyAndCollectImages("Текст\n\n---\n\nЩе"), /horizontal rule/);
});
