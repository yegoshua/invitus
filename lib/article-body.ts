// The shape of a Strapi `blocks` field, and the one figure the site derives
// from it. No dependencies, deliberately: this module is imported by the blog
// pages, whereas the Markdown converter next door pulls a parser that is only a
// devDependency. Merging the two would put a package that production never
// installs into a page's import graph, and the failure would appear on Vercel
// rather than here.

export interface BlocksText {
  type: "text";
  text: string;
  bold?: true;
  italic?: true;
  underline?: true;
  strikethrough?: true;
  code?: true;
}

export interface BlocksLink {
  type: "link";
  url: string;
  children: BlocksText[];
}

export type BlocksInline = BlocksText | BlocksLink;

export interface BlocksParagraph {
  type: "paragraph";
  children: BlocksInline[];
}

/**
 * Level 1 is absent on purpose. The page's only h1 is the `title` field, and
 * `markdownToBlocks` refuses a `#` rather than let a second one through.
 */
export interface BlocksHeading {
  type: "heading";
  level: 2 | 3 | 4 | 5 | 6;
  children: BlocksInline[];
}

export interface BlocksListItem {
  type: "list-item";
  children: BlocksInline[];
}

/**
 * A nested list is a sibling of the item it belongs under, not a child of it:
 * Strapi answers "Inline node must be Text or Link" to a list placed inside a
 * `list-item`, and accepts one placed beside it. Markdown nests the other way
 * round, so the converter hoists.
 */
export interface BlocksList {
  type: "list";
  format: "ordered" | "unordered";
  children: (BlocksListItem | BlocksList)[];
}

/**
 * Rendered as the red callout panel, and that is the blog's only quote style.
 * The trade was made knowingly: Strapi's blocks set cannot be extended, the
 * design needs an accent panel far more often than it needs a neutral citation,
 * and the alternative was a Dynamic Zone that turns writing into assembling.
 */
export interface BlocksQuote {
  type: "quote";
  children: BlocksInline[];
}

/**
 * A Strapi media entry as it appears inside an image block.
 *
 * These fields are not the ones the renderer happens to want — they are the
 * ones the API refuses the article without. An image node built from just
 * `{ id, url }` comes back with eleven validation errors, one per missing
 * field, verified against a real Strapi 5.34. `formats` may be null (small
 * images and SVGs have no derived sizes) but the key must be present.
 */
export interface BlocksImageFile {
  id: number;
  url: string;
  name: string;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  width: number;
  height: number;
  formats: Record<string, unknown> | null;
  provider: string;
  createdAt: string;
  updatedAt: string;
  alternativeText?: string | null;
  caption?: string | null;
  [key: string]: unknown;
}


export interface BlocksImage {
  type: "image";
  image: BlocksImageFile;
  /** Strapi stores an empty text child alongside the image. */
  children: [BlocksText];
}

export type BlocksNode =
  | BlocksParagraph
  | BlocksHeading
  | BlocksList
  | BlocksQuote
  | BlocksImage;

/** Average adult reading speed. The figure on the design was set against it. */
const WORDS_PER_MINUTE = 200;

function countWords(node: unknown): number {
  if (!node || typeof node !== "object") return 0;

  const record = node as { text?: unknown; children?: unknown };

  if (typeof record.text === "string") {
    // Split on whitespace rather than counting separators: runs of spaces and
    // trailing punctuation would otherwise each add a phantom word.
    return record.text.trim().split(/\s+/).filter(Boolean).length;
  }

  if (Array.isArray(record.children)) {
    return record.children.reduce<number>((sum, child) => sum + countWords(child), 0);
  }

  return 0;
}

/**
 * The "N хв. читання" figure, computed rather than stored.
 *
 * A field the author fills is one more thing to forget, and once the text is
 * edited it starts lying — a number that disagrees with the article is worse
 * than no number. Images contribute nothing: they cost the reader time, but
 * inventing seconds-per-image would make the figure less honest, not more.
 *
 * Never returns 0. Rounding down would print "0 хв. читання" on anything under
 * two hundred words, which reads as a bug rather than as a short article.
 */
export function readingTimeMinutes(blocks: BlocksNode[]): number {
  const words = blocks.reduce((sum, block) => sum + countWords(block), 0);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
