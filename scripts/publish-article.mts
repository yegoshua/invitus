// Publish a Markdown article to Strapi.
//
//   pnpm publish:article content/articles/some-article.md
//   pnpm publish:article content/articles/some-article.md --apply
//
// Dry-run by default — it writes to the production CMS, which is the only one
// there is. Idempotent: matched on `slug`, so re-running updates the article
// rather than creating a second copy, and an image already uploaded under its
// derived name is reused instead of piling up duplicates in the media library.
//
// The article is created as a **draft**. A generated article gets proof-read
// before it is public, and Strapi's draft is exactly that mechanism — nothing
// here publishes.
//
// Order matters, and it is the reason the steps are not in the obvious one:
//
//   1. Front-matter is validated first. A missing `title` should cost nothing.
//   2. The body is converted against stub media, which validates the whole
//      document — an h1, a `---`, an unsupported construct — while still
//      collecting the images it references. So a bad document fails before a
//      single byte is uploaded, rather than leaving orphaned files behind.
//   3. Only then are images normalised and uploaded, and only then is the
//      article written.
//
// Images are resized to 1600px wide and re-encoded as WebP before upload. This
// does little for the reader — next/image already serves them something smaller
// — and everything for Strapi Cloud's storage quota, which five photos straight
// from a phone per article would exhaust within a couple of dozen posts. Same
// discipline the 3D models already follow.

import { access, readFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import sharp from "sharp";
import { parse as parseYaml } from "yaml";
import { markdownToBlocks } from "./markdown-to-blocks.mts";
import type { BlocksImageFile, BlocksNode } from "../lib/article-body.ts";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL;
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

/** Mirrors the `category` enumeration on the Article type (see issue #61). */
const CATEGORIES = ["ЕКІПІРУВАННЯ", "ТЕХНІКА", "ТРЕНУВАННЯ", "ЗМАГАННЯ", "ДОГЛЯД"];

const MAX_IMAGE_WIDTH = 1600;
const WEBP_QUALITY = 80;

export interface ArticleFrontMatter {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  cover: string;
  /** Markdown image src → the caption stored on the media entry. */
  images?: Record<string, string>;
  seoTitle?: string;
  seoDescription?: string;
}

// ── parsing ──────────────────────────────────────────────────────────────────

/**
 * Splits `---`-delimited YAML front matter from the body.
 *
 * The delimiter is only recognised at the very start of the file. A `---` in
 * the middle is a horizontal rule, and the converter refuses those by name —
 * silently treating one as a second front-matter block would truncate an
 * article at a plausible-looking place.
 */
export function splitFrontMatter(source: string): { data: unknown; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) {
    throw new Error("No front matter — the file must start with a --- block");
  }

  return { data: parseYaml(match[1]), body: source.slice(match[0].length) };
}

export function validateFrontMatter(data: unknown): ArticleFrontMatter {
  if (!data || typeof data !== "object") {
    throw new Error("Front matter is empty");
  }

  const record = data as Record<string, unknown>;
  const required = ["title", "slug", "excerpt", "category", "cover"] as const;
  const missing = required.filter(
    (field) => typeof record[field] !== "string" || record[field].trim() === ""
  );

  if (missing.length > 0) {
    throw new Error(`Front matter is missing ${missing.join(", ")}`);
  }

  const category = record.category as string;
  if (!CATEGORIES.includes(category)) {
    // Checked here rather than left to the API: this runs before any upload,
    // and Strapi's own rejection would arrive after the images are already in
    // the media library.
    throw new Error(`Category "${category}" is not one of ${CATEGORIES.join(", ")}`);
  }

  return record as unknown as ArticleFrontMatter;
}

/**
 * The name an article's image is stored under in the media library.
 *
 * Derived rather than taken from the file so a re-run finds what it uploaded
 * last time: two articles may both ship a `cover.jpg`, and the slug is what
 * keeps them apart.
 */
export function mediaName(slug: string, src: string): string {
  const stem = basename(src, extname(src)).replace(/[^a-zA-Z0-9-]+/g, "-");
  return `${slug}-${stem}.webp`;
}

/** A complete media entry, so the converter's own validation passes on the dry pass. */
const STUB_MEDIA: BlocksImageFile = {
  id: 0,
  url: "",
  name: "",
  hash: "",
  ext: ".webp",
  mime: "image/webp",
  size: 0,
  width: 0,
  height: 0,
  formats: null,
  provider: "",
  createdAt: "",
  updatedAt: "",
};

/**
 * Converts the body against stub media purely to have it checked, and returns
 * the image sources it asked for along the way.
 *
 * This is what lets a malformed document fail before anything is uploaded. The
 * proxy answers every lookup, so the converter's "no uploaded media" refusal
 * cannot fire here — every other refusal still does.
 */
export function validateBodyAndCollectImages(body: string): string[] {
  const found: string[] = [];

  const images = new Proxy({} as Record<string, BlocksImageFile>, {
    get(_target, key) {
      if (typeof key !== "string") return undefined;
      if (!found.includes(key)) found.push(key);
      return STUB_MEDIA;
    },
    has: () => true,
  });

  markdownToBlocks(body, { images });
  return found;
}

// ── Strapi ───────────────────────────────────────────────────────────────────

function requireEnv(): { url: string; token: string } {
  if (!STRAPI_URL || !STRAPI_TOKEN) {
    throw new Error(
      "NEXT_PUBLIC_STRAPI_URL and STRAPI_API_TOKEN must be set — run through `pnpm publish:article`, which loads .env.local"
    );
  }
  return { url: STRAPI_URL, token: STRAPI_TOKEN };
}

/**
 * Strapi Cloud's free tier sleeps, and the first request after that answers 503
 * from the edge rather than from Strapi — measured at ~15s to wake. One retry
 * turns "run it again" into "it worked", and there is no reason to retry more
 * than once: if the second attempt still fails, the instance is not asleep, it
 * is down, and a script writing to production should say so rather than grind.
 *
 * Only the read path benefits in practice — by the time anything is written,
 * the instance is awake.
 */
async function strapi<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const { url, token } = requireEnv();
  const response = await fetch(`${url}/api${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  if (response.status >= 500 && retry && init.method === undefined) {
    console.log(`  …Strapi answered ${response.status}, waking it and retrying once`);
    await new Promise((done) => setTimeout(done, 15_000));
    return strapi<T>(path, init, false);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Strapi ${response.status} on ${path}: ${detail.slice(0, 300)}`);
  }

  return response.json() as Promise<T>;
}

async function findUploadedByName(name: string): Promise<BlocksImageFile | null> {
  const files = await strapi<BlocksImageFile[]>(
    `/upload/files?filters[name][$eq]=${encodeURIComponent(name)}`
  );
  return files[0] ?? null;
}

/**
 * Rewrites an existing entry's caption.
 *
 * Needed because reuse is keyed on the file name, not on its metadata: without
 * this, editing a caption in the front matter and re-running would report
 * "reused" and change nothing, which is exactly the kind of quiet no-op the
 * rest of this pipeline refuses to have.
 */
async function updateCaption(
  id: number,
  name: string,
  caption: string | undefined
): Promise<BlocksImageFile> {
  const form = new FormData();
  form.append(
    "fileInfo",
    JSON.stringify({ name, caption: caption ?? null, alternativeText: caption ?? null })
  );

  return strapi<BlocksImageFile>(`/upload?id=${id}`, { method: "POST", body: form });
}

async function uploadImage(
  sourcePath: string,
  name: string,
  caption: string | undefined
): Promise<BlocksImageFile> {
  const normalised = await sharp(await readFile(sourcePath))
    // withoutEnlargement: a photo already narrower than the cap is left alone
    // rather than upscaled into a bigger file that shows no more detail.
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const form = new FormData();
  form.append("files", new Blob([new Uint8Array(normalised)], { type: "image/webp" }), name);
  form.append(
    "fileInfo",
    JSON.stringify({
      name,
      // The caption lives on the media entry, not in the article body: Strapi's
      // image block carries the whole media record, so the caption travels with
      // the file wherever it is used.
      caption: caption ?? null,
      alternativeText: caption ?? null,
    })
  );

  const uploaded = await strapi<BlocksImageFile[]>("/upload", { method: "POST", body: form });
  return uploaded[0];
}

interface StrapiArticle {
  documentId: string;
  slug: string;
}

async function findArticleBySlug(slug: string): Promise<StrapiArticle | null> {
  const response = await strapi<{ data: StrapiArticle[] }>(
    `/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&status=draft`
  );
  return response.data[0] ?? null;
}

// ── main ─────────────────────────────────────────────────────────────────────

interface PlannedImage {
  src: string;
  path: string;
  name: string;
  caption?: string;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const path = args.find((arg) => !arg.startsWith("--"));

  if (!path) {
    console.error("Usage: pnpm publish:article <path-to-article.md> [--apply]");
    process.exitCode = 1;
    return;
  }

  const file = resolve(path);
  const source = await readFile(file, "utf8");

  // 1 & 2 — everything that can fail for free, before anything is written.
  const { data, body } = splitFrontMatter(source);
  const front = validateFrontMatter(data);
  const referenced = validateBodyAndCollectImages(body);

  const dir = dirname(file);
  const planned: PlannedImage[] = [
    { src: front.cover, path: join(dir, front.cover), name: mediaName(front.slug, front.cover), caption: undefined },
    ...referenced.map((src) => ({
      src,
      path: join(dir, src),
      name: mediaName(front.slug, src),
      caption: front.images?.[src],
    })),
  ];

  // Every file is checked before the first upload, not as each one comes up.
  // Discovering the third image is missing after two are already in the media
  // library leaves the article half-uploaded and the library dirty.
  const absent: string[] = [];
  for (const image of planned) {
    try {
      await access(image.path);
    } catch {
      absent.push(image.src);
    }
  }

  const captionless = planned.filter((image) => image.src !== front.cover && !image.caption);

  console.log(`\n${front.title}`);
  console.log(`  slug      ${front.slug}`);
  console.log(`  category  ${front.category}`);
  console.log(`  images    ${planned.map((image) => image.src).join(", ") || "none"}`);
  for (const image of captionless) {
    console.log(`  ⚠ no caption for ${image.src} — it will render bare`);
  }

  // Bail before touching the network: a missing file is settled locally, and
  // waking a sleeping Strapi Cloud instance to learn it costs fifteen seconds
  // and tells us nothing new.
  if (absent.length > 0) {
    for (const src of absent) console.log(`  ✖ missing file ${join(dir, src)}`);
    console.log(`\nCannot publish — ${absent.length} image file(s) missing.\n`);
    process.exitCode = 1;
    return;
  }

  const existing = await findArticleBySlug(front.slug);
  console.log(`  action    ${existing ? `update ${existing.documentId}` : "create"} (as draft)`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.\n");
    return;
  }

  // 3 — writes start here.
  const uploaded: Record<string, BlocksImageFile> = {};
  for (const image of planned) {
    const found = await findUploadedByName(image.name);
    if (found) {
      if ((found.caption ?? null) !== (image.caption ?? null)) {
        uploaded[image.src] = await updateCaption(found.id, image.name, image.caption);
        console.log(`  recaptioned ${image.name}`);
      } else {
        console.log(`  reused    ${image.name}`);
        uploaded[image.src] = found;
      }
      continue;
    }
    const entry = await uploadImage(image.path, image.name, image.caption);
    console.log(`  uploaded  ${image.name} (${Math.round(entry.size)} KB)`);
    uploaded[image.src] = entry;
  }

  const blocks: BlocksNode[] = markdownToBlocks(body, { images: uploaded });

  const payload = {
    data: {
      title: front.title,
      slug: front.slug,
      excerpt: front.excerpt,
      category: front.category,
      cover: uploaded[front.cover].id,
      body: blocks,
      ...(front.seoTitle ? { seoTitle: front.seoTitle } : {}),
      ...(front.seoDescription ? { seoDescription: front.seoDescription } : {}),
    },
  };

  // Strapi 5 creates and updates the draft here; publishing stays a human
  // action in the admin. Note that a plain PUT writes through to the published
  // version too if one exists — see the note in CLAUDE.md.
  const saved = existing
    ? await strapi<{ data: StrapiArticle }>(`/articles/${existing.documentId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    : await strapi<{ data: StrapiArticle }>("/articles", {
        method: "POST",
        body: JSON.stringify(payload),
      });

  console.log(`\n✓ ${existing ? "Updated" : "Created"} draft ${saved.data.documentId}`);
  console.log("  Publish it from the Strapi admin when it reads right.\n");
}

// Only run when invoked directly, so the exported helpers stay importable from
// the test file without publishing anything.
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((error: unknown) => {
    console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
