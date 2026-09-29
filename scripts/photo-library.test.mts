import { test } from "node:test";
import assert from "node:assert/strict";

import {
  decodeInstagramText,
  exportRootFor,
  mergePosts,
  readPosts,
  renderIndex,
} from "./photo-library.mts";

// The script's I/O half — walking the export, writing INDEX.md — is exercised
// by running it. What is tested here is every decision that would otherwise
// fail quietly: a caption left as mojibake, a photo path that does not open
// from where INDEX.md sits, a post listed twice, a day off by one.

// Instagram's JSON export writes every UTF-8 byte as its own \u00XX escape, so
// a Ukrainian caption parses as Latin-1 garbage. This is the string JSON.parse
// actually hands back for "Пояс".
const mojibake = (text: string) => Buffer.from(text, "utf8").toString("latin1");

// ── decoding ─────────────────────────────────────────────────────────────────

test("a caption from the export is decoded back to Ukrainian", () => {
  assert.equal(mojibake("Пояс"), "Ð\u009fÐ¾Ñ\u008fÑ\u0081");
  assert.equal(decodeInstagramText(mojibake("Пояс")), "Пояс");
});

test("emoji survive decoding", () => {
  assert.equal(decodeInstagramText(mojibake("Новий дроп 🔥")), "Новий дроп 🔥");
});

test("text that is already correct is left alone", () => {
  assert.equal(decodeInstagramText("Пояс"), "Пояс");
  assert.equal(decodeInstagramText("IPF approved"), "IPF approved");
});

test("genuine Latin-1 that is not UTF-8 in disguise is left alone", () => {
  assert.equal(decodeInstagramText("café"), "café");
});

// ── posts ────────────────────────────────────────────────────────────────────

const SINGLE = {
  media: [
    {
      uri: "media/posts/202405/111.jpg",
      creation_timestamp: 1716200000,
      title: mojibake("Пояс Зевс"),
    },
  ],
};

const CAROUSEL = {
  title: mojibake("Дроп бинтів"),
  creation_timestamp: 1720000000,
  media: [
    { uri: "media/posts/202407/222.jpg", creation_timestamp: 1720000000, title: "" },
    { uri: "media/posts/202407/223.mp4", creation_timestamp: 1720000000, title: "" },
    { uri: "media/posts/202407/224.webp", creation_timestamp: 1720000000, title: "" },
  ],
};

const VIDEO_ONLY = {
  media: [{ uri: "media/posts/202408/333.mp4", creation_timestamp: 1723000000, title: "Рілс" }],
};

test("a single-photo post takes its caption from the photo", () => {
  const [post] = readPosts([SINGLE]);

  assert.deepEqual(post, {
    date: "2024-05-20",
    caption: "Пояс Зевс",
    images: ["media/posts/202405/111.jpg"],
  });
});

test("a carousel takes its caption from the post and keeps only its photos", () => {
  const [post] = readPosts([CAROUSEL]);

  assert.equal(post.caption, "Дроп бинтів");
  assert.deepEqual(post.images, ["media/posts/202407/222.jpg", "media/posts/202407/224.webp"]);
});

test("a post's date is its day in Kyiv, not in UTC", () => {
  // 2024-05-19 22:30 UTC is already 01:30 on the 20th in Kyiv.
  const late = { media: [{ uri: "media/posts/a.jpg", creation_timestamp: 1716157800, title: "" }] };

  assert.equal(readPosts([late])[0].date, "2024-05-20");
});

test("a post with no photos is not in the library", () => {
  assert.deepEqual(readPosts([VIDEO_ONLY]), []);
});

test("an export that is not the JSON format is refused by name", () => {
  assert.throws(() => readPosts({ html: true }), /JSON/);
});

// ── index ────────────────────────────────────────────────────────────────────

test("the index lists newest posts first, with caption and photo paths", () => {
  const index = renderIndex(readPosts([SINGLE, CAROUSEL]));

  assert.ok(index.indexOf("2024-07-03") < index.indexOf("2024-05-20"));
  assert.match(index, /Дроп бинтів/);
  assert.match(index, /media\/posts\/202405\/111\.jpg/);
});

test("a post with no date goes last, not first", () => {
  const index = renderIndex([
    { date: null, caption: "Без дати", images: ["a.jpg"] },
    { date: "2024-01-01", caption: "З датою", images: ["b.jpg"] },
  ]);

  assert.ok(index.indexOf("З датою") < index.indexOf("Без дати"));
  assert.match(index, /невідома дата/);
});

test("a post without a caption says so rather than printing nothing", () => {
  const index = renderIndex([{ date: "2024-01-01", caption: "", images: ["a.jpg"] }]);

  assert.match(index, /без підпису/);
});

// ── export root ──────────────────────────────────────────────────────────────

// Unzipping on macOS puts the whole export in a folder of its own, so the
// `media/posts/…` a post names is relative to that folder, not to the library.
test("the export root is the ancestor the photo path actually resolves from", () => {
  const files = new Set(["/lib/instagram-invitus-2026/media/posts/202405/111.jpg"]);

  const root = exportRootFor(
    "/lib/instagram-invitus-2026/your_instagram_activity/media/posts_1.json",
    "/lib",
    "media/posts/202405/111.jpg",
    (path) => files.has(path),
  );

  assert.equal(root, "/lib/instagram-invitus-2026");
});

test("a posts file whose photos resolve from nowhere is refused", () => {
  assert.throws(
    () => exportRootFor("/lib/x/posts_1.json", "/lib", "media/posts/1.jpg", () => false),
    /media\/posts\/1\.jpg/,
  );
});

// ── merging ──────────────────────────────────────────────────────────────────

test("photos are listed relative to the library", () => {
  const post = { date: "2024-05-20", caption: "Пояс", images: ["media/posts/202405/1.jpg"] };

  const [merged] = mergePosts("/lib", [{ root: "/lib/export-a", posts: [post] }]);

  assert.deepEqual(merged.images, ["export-a/media/posts/202405/1.jpg"]);
});

// Instagram names a photo after its media id, so the same post exported twice —
// into the same folder or a new one — has the same file name both times.
test("a post exported twice is listed once", () => {
  const post = { date: "2024-05-20", caption: "Пояс", images: ["media/posts/202405/1.jpg"] };
  const other = { date: "2024-05-21", caption: "Бинти", images: ["media/posts/202405/2.jpg"] };

  const merged = mergePosts("/lib", [
    { root: "/lib/export-a", posts: [post] },
    { root: "/lib/export-b", posts: [post, other] },
  ]);

  assert.deepEqual(merged.map((entry) => entry.caption), ["Пояс", "Бинти"]);
});
