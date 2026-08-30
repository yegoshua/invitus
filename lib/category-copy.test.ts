import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveCategoryCopy } from "./category-copy.ts";
import { categoryCopy } from "../content/category-copy.ts";

test("a category with its own copy gets it", () => {
  const resolved = resolveCategoryCopy("belts", "Атлетичні пояси");

  assert.equal(resolved.h1, categoryCopy.belts.h1);
  assert.equal(resolved.metaDescription, categoryCopy.belts.metaDescription);
  assert.deepEqual(resolved.intro, categoryCopy.belts.intro);
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

test("a category name that is only whitespace still yields an h1", () => {
  const resolved = resolveCategoryCopy("unknown", "   ");

  assert.equal(resolved.h1, "Каталог");
  assert.equal(resolved.intro, null);
});

// ── Data integrity over the copy record itself ──────────────────────────────
//
// These are the acceptance criteria of #79 as assertions. The point of the
// issue was that four category pages read as near-duplicates; a test is what
// stops the fifth entry from being written by copying the fourth.

const entries = Object.entries(categoryCopy);

test("every catalog category the site sells has copy", () => {
  for (const slug of ["belts", "wrist-wraps", "knee-sleeves", "straps"]) {
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

test("no two categories share a paragraph", () => {
  const seen = new Map<string, string>();

  for (const [slug, copy] of entries) {
    for (const paragraph of copy.intro.paragraphs) {
      const previous = seen.get(paragraph);
      assert.equal(previous, undefined, `${slug} repeats a paragraph from ${previous}`);
      seen.set(paragraph, slug);
    }
  }
});

test("no two categories share a meta description", () => {
  const descriptions = entries.map(([, copy]) => copy.metaDescription);

  assert.equal(new Set(descriptions).size, descriptions.length);
});
