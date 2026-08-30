import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveCategoryCopy } from "./category-copy.ts";
import { categoryCopy, type CategoryCopy } from "../content/category-copy.ts";

// The record is `CategoryCopy | undefined` by design — see the note on it. The
// assertions below want the written entries, so narrow once here.
const entries = Object.entries(categoryCopy).filter(
  (entry): entry is [string, CategoryCopy] => Boolean(entry[1]),
);

function copyFor(slug: string): CategoryCopy {
  const copy = categoryCopy[slug];
  assert.ok(copy, `no copy for ${slug}`);
  return copy;
}

test("a category with its own copy gets it", () => {
  const belts = copyFor("belts");
  const resolved = resolveCategoryCopy("belts", "Атлетичні пояси");

  assert.equal(resolved.h1, belts.h1);
  assert.equal(resolved.metaDescription, belts.metaDescription);
  assert.deepEqual(resolved.intro, belts.intro);
});

// KeyCRM can hand us a category nobody has written copy for — category 6
// ("Футболки") is already one. That must degrade, not throw.
test("a category with no entry falls back to the template", () => {
  const resolved = resolveCategoryCopy("shirts", "Футболки");

  assert.equal(resolved.h1, "Футболки");
  assert.match(resolved.metaDescription, /футболки/);
  assert.equal(resolved.intro, null);
});

test("the fallback description lowercases the category name", () => {
  const resolved = resolveCategoryCopy("unknown", "Гумові Петлі");

  assert.match(resolved.metaDescription, /гумові петлі/);
});

// A blank name takes a different path on purpose. Running the placeholder
// heading through the template yields «Купуйте каталог від INVITUS…», which
// reads as broken to anyone who meets it in a search result.
test("a category with no usable name gets a description, not a broken sentence", () => {
  const resolved = resolveCategoryCopy("unknown", "   ");

  assert.equal(resolved.h1, "Каталог");
  assert.doesNotMatch(resolved.metaDescription, /Купуйте каталог/i);
  assert.match(resolved.metaDescription, /INVITUS/);
  assert.equal(resolved.intro, null);
});

// ── Data integrity over the copy record itself ──────────────────────────────
//
// These are the acceptance criteria of #79 as assertions. The point of the
// issue was that four category pages read as near-duplicates; a test is what
// stops the fifth entry from being written by copying the fourth.

// Spelled out rather than derived from lib/api.ts's CATEGORY_SLUG_BY_ID: that
// map also holds categories the catalogue hides, and a test that derives its
// expectation from the code under test asserts nothing. The cost is that a
// fifth sold category has to be added here by hand — which is the point, since
// the failure it produces is the reminder to write the copy.
const SOLD_CATEGORIES = ["belts", "wrist-wraps", "knee-sleeves", "straps"];

test("every catalog category the site sells has copy", () => {
  for (const slug of SOLD_CATEGORIES) {
    assert.ok(categoryCopy[slug], `no copy for ${slug}`);
  }
});

for (const [slug, copy] of entries) {
  test(`${slug}: description fits a SERP snippet`, () => {
    assert.ok(
      copy.metaDescription.length >= 70 && copy.metaDescription.length <= 160,
      `${slug}: ${copy.metaDescription.length} chars, want 70–160`,
    );
  });

  test(`${slug}: h1 is a plain heading, not a sentence`, () => {
    assert.ok(copy.h1.length > 0 && copy.h1.length <= 60, `${slug}: bad h1`);
    assert.doesNotMatch(copy.h1, /\(\d+\)/, `${slug}: h1 carries a count`);
  });

  test(`${slug}: intro has a heading and real paragraphs`, () => {
    assert.ok(copy.intro.heading.length > 0);
    assert.ok(copy.intro.paragraphs.length >= 2);
    for (const paragraph of copy.intro.paragraphs) {
      assert.ok(paragraph.length >= 80, `${slug}: paragraph too thin`);
    }
  });

  // Our own FAQ (content/faq.ts) says the IPF status was never confirmed by
  // ФПУ. "Відповідає стандартам" is a description of how the gear is made;
  // "approved"/"сертифіковано" is a claim about a status we do not hold.
  test(`${slug}: claims no IPF certification`, () => {
    const text = [
      copy.h1,
      copy.metaDescription,
      copy.intro.heading,
      ...copy.intro.paragraphs,
    ].join(" ");

    assert.doesNotMatch(text, /IPF[\s-]*approved/i, `${slug}: claims approval`);
    assert.doesNotMatch(text, /сертифік/i, `${slug}: claims certification`);
    assert.doesNotMatch(text, /схвалено|дозвіл ФПУ/i, `${slug}: claims approval`);
  });
}

// Whole-paragraph comparison only catches a wholesale copy-paste. The criterion
// is "no shared phrasing", and the realistic failure is subtler: one sentence
// carried across while the rest of the paragraph is reworded.
function sentences(text: string): string[] {
  return text
    .split(/[.!?…]+\s+/)
    .map((sentence) => sentence.trim().toLowerCase())
    .filter((sentence) => sentence.length >= 40);
}

test("no two categories share a sentence", () => {
  const seen = new Map<string, string>();

  for (const [slug, copy] of entries) {
    for (const paragraph of copy.intro.paragraphs) {
      for (const sentence of sentences(paragraph)) {
        const previous = seen.get(sentence);
        assert.equal(
          previous,
          undefined,
          `${slug} repeats a sentence from ${previous}: "${sentence.slice(0, 60)}…"`,
        );
        seen.set(sentence, slug);
      }
    }
  }
});

test("no two categories share a meta description", () => {
  const descriptions = entries.map(([, copy]) => copy.metaDescription);

  assert.equal(new Set(descriptions).size, descriptions.length);
});
