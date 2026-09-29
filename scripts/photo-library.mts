// Index the brand's Instagram export so an article can be illustrated with our
// own photos.
//
//   pnpm photos:index                       # indexes content/photo-library
//   pnpm photos:index path/to/export
//
// The Photo library is the unpacked "Download your information" archive from
// Instagram, in **JSON** format (the HTML format has nothing to parse). It is
// gitignored: the repo is public, and these are hundreds of megabytes of
// binaries that already live on Instagram. The script writes `INDEX.md` next to
// them — every post with photos, newest first, caption and paths — which is what
// the invitus-article skill searches when it looks for a photo of a product.
//
// It exists as a script rather than something done by hand each time because
// of one quirk: Instagram's JSON writes each UTF-8 byte as its own \u00XX
// escape, so every Ukrainian caption parses as a run of Ð, Ñ and control
// characters. Decoding that correctly, and not double-decoding text that was
// fine, is the part worth getting right once.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const DEFAULT_DIR = "content/photo-library";
const POSTS_FILE = /^posts_\d+\.json$/;
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|heic)$/i;

export interface LibraryPost {
  /** YYYY-MM-DD, UTC. */
  date: string;
  caption: string;
  /** Paths relative to the export root, as Instagram wrote them. */
  images: string[];
}

interface ExportMedia {
  uri?: string;
  creation_timestamp?: number;
  title?: string;
}

interface ExportPost {
  title?: string;
  creation_timestamp?: number;
  media?: ExportMedia[];
}

// ── decoding ─────────────────────────────────────────────────────────────────

/**
 * Undoes Instagram's byte-per-escape encoding.
 *
 * A string that holds any character above U+00FF was never mangled, so it is
 * returned as is. Otherwise its code points are re-read as bytes; if those bytes
 * are not valid UTF-8 the text was genuine Latin-1 all along and is kept.
 */
export function decodeInstagramText(text: string): string {
  if ([...text].some((char) => char.codePointAt(0)! > 0xff)) return text;

  const decoded = Buffer.from(text, "latin1").toString("utf8");
  return decoded.includes("�") ? text : decoded;
}

// ── posts ────────────────────────────────────────────────────────────────────

function toDate(timestamp: number | undefined): string {
  return timestamp ? new Date(timestamp * 1000).toISOString().slice(0, 10) : "невідома дата";
}

/**
 * One export file's posts, reduced to those with at least one photo.
 *
 * A single-photo post carries its caption on the photo; a carousel carries it
 * on the post and leaves the photos' own titles empty — so the post's title wins
 * and the first photo's is the fallback.
 */
export function readPosts(data: unknown): LibraryPost[] {
  if (!Array.isArray(data)) {
    throw new Error("posts file is not a JSON array — export Instagram data in JSON format, not HTML");
  }

  return (data as ExportPost[]).flatMap((post) => {
    const media = post.media ?? [];
    const images = media.map((item) => item.uri ?? "").filter((uri) => IMAGE_EXTENSION.test(uri));
    if (images.length === 0) return [];

    return [
      {
        date: toDate(post.creation_timestamp ?? media[0]?.creation_timestamp),
        caption: decodeInstagramText(post.title || media[0]?.title || "").trim(),
        images,
      },
    ];
  });
}

// ── index ────────────────────────────────────────────────────────────────────

export function renderIndex(posts: LibraryPost[]): string {
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));

  const entries = sorted.map((post) => {
    const caption = post.caption ? post.caption.replace(/\s*\n\s*/g, " ") : "_(без підпису)_";
    const images = post.images.map((path) => `- \`${path}\``).join("\n");
    return `## ${post.date}\n\n${caption}\n\n${images}`;
  });

  return `# Photo library\n\nЗгенеровано \`pnpm photos:index\`. Не редагувати руками.\n\n${entries.join("\n\n")}\n`;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function findPostsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && POSTS_FILE.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

async function main(): Promise<void> {
  const dir = resolve(process.argv[2] ?? DEFAULT_DIR);
  const files = await findPostsFiles(dir);

  if (files.length === 0) {
    throw new Error(`no posts_N.json under ${dir} — unpack the Instagram JSON export there first`);
  }

  const posts: LibraryPost[] = [];
  for (const file of files) {
    posts.push(...readPosts(JSON.parse(await readFile(file, "utf8"))));
  }

  await writeFile(join(dir, "INDEX.md"), renderIndex(posts));
  console.log(`Indexed ${posts.length} posts with photos → ${join(dir, "INDEX.md")}`);
}

if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  main().catch((error: unknown) => {
    console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
