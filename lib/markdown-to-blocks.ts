// Markdown in, Strapi Blocks JSON out.
//
// Articles are written and generated in bulk, and Blocks JSON is not a format
// anyone writes by hand: it is verbose, and one bad nesting level is a record
// the API rejects after the article was already written. Markdown is what a
// model emits reliably, so this is the bridge.
//
// Server-side only, and imported by `scripts/publish-article.mts` alone —
// `mdast-util-from-markdown` is a devDependency and must never be reachable
// from a page. Anything a blog page needs lives in ./article-body.ts.
//
// The governing principle here is that this refuses rather than guesses. A
// document it does not fully understand stops the publish with a line number,
// because the alternative — a silently mangled article discovered weeks later
// in production — is the expensive failure when hundreds of articles are
// generated rather than hand-checked.

import { fromMarkdown } from "mdast-util-from-markdown";
import { REQUIRED_MEDIA_FIELDS } from "./article-body.ts";
import type {
  BlocksImageFile,
  BlocksInline,
  BlocksListItem,
  BlocksNode,
  BlocksText,
} from "./article-body.ts";

/** Media entries the publish script has already uploaded, keyed by the src used in the Markdown. */
export interface MarkdownToBlocksOptions {
  images?: Record<string, BlocksImageFile>;
}

/** Text modifiers accumulated while walking down through strong/emphasis/code. */
type Modifiers = Pick<BlocksText, "bold" | "italic" | "code" | "strikethrough">;

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  depth?: number;
  ordered?: boolean;
  children?: MdNode[];
  position?: { start: { line: number } };
}

function lineOf(node: MdNode): number {
  return node.position?.start.line ?? 0;
}

function plainText(node: MdNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(plainText).join("");
}

function fail(node: MdNode, message: string): never {
  throw new Error(`${message} (line ${lineOf(node)})`);
}

/**
 * Inline nodes, carrying modifiers down rather than nesting wrappers: Strapi
 * marks bold text with a flag on the text node itself, so `**a *b* c**` is
 * three text nodes and not a tree.
 */
function toInline(nodes: MdNode[], modifiers: Modifiers = {}): BlocksInline[] {
  const out: BlocksInline[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        if (node.value) out.push({ type: "text", text: node.value, ...modifiers });
        break;

      case "strong":
        out.push(...toInline(node.children ?? [], { ...modifiers, bold: true }));
        break;

      case "emphasis":
        out.push(...toInline(node.children ?? [], { ...modifiers, italic: true }));
        break;

      case "delete":
        out.push(...toInline(node.children ?? [], { ...modifiers, strikethrough: true }));
        break;

      case "inlineCode":
        out.push({ type: "text", text: node.value ?? "", ...modifiers, code: true });
        break;

      case "link":
        // A link's own children are text only — Strapi has no nested link node.
        out.push({
          type: "link",
          url: node.url ?? "",
          children: toInline(node.children ?? [], modifiers).filter(
            (child): child is BlocksText => child.type === "text"
          ),
        });
        break;

      case "break":
        out.push({ type: "text", text: "\n", ...modifiers });
        break;

      case "image":
        // Reached only when an image shares a paragraph with other content.
        // Strapi has no inline image, and silently dropping it would publish an
        // article missing a picture nobody notices is gone.
        fail(node, `Image "${node.url}" shares a line with text — put it on its own line`);
        break;

      default:
        fail(node, `Unsupported inline "${node.type}"`);
    }
  }

  return out;
}

/** A blockquote holds paragraphs, but Strapi's quote node holds inline children only. */
function flattenToInline(nodes: MdNode[]): BlocksInline[] {
  const out: BlocksInline[] = [];

  for (const node of nodes) {
    if (out.length > 0) out.push({ type: "text", text: "\n\n" });

    if (node.type === "paragraph") {
      out.push(...toInline(node.children ?? []));
    } else {
      out.push(...toInline([node]));
    }
  }

  return out;
}

function toListItems(nodes: MdNode[]): BlocksListItem[] {
  return nodes.map((item) => ({
    type: "list-item" as const,
    children: flattenToInline(item.children ?? []),
  }));
}

function isImageOnly(node: MdNode): boolean {
  const children = node.children ?? [];
  return children.length === 1 && children[0].type === "image";
}

function toImageBlock(image: MdNode, options: MarkdownToBlocksOptions): BlocksNode {
  const src = image.url ?? "";
  const file = options.images?.[src];

  if (!file) {
    // The converter never invents a media id. The script uploads the file and
    // hands the entry back under this key; a miss means the article references
    // a picture that was never uploaded, and publishing it half-illustrated is
    // worse than not publishing it.
    fail(image, `Image "${src}" has no uploaded media`);
  }

  // Strapi validates the whole media entry inside the block, not just its id.
  // Passing a partial one through would push the failure out to the API — after
  // the upload, on a finished article — and the message there names paths like
  // `body[6].image.width`, which says nothing about which picture is at fault.
  const missing = REQUIRED_MEDIA_FIELDS.filter((field) => !(field in file));
  if (missing.length > 0) {
    fail(image, `Image "${src}" has an incomplete media entry — missing ${missing.join(", ")}`);
  }

  return { type: "image", image: file, children: [{ type: "text", text: "" }] };
}

/**
 * @throws if the document contains an h1, an unsupported construct, or an image
 * with no matching upload — each with the line number, so a long generated
 * document is navigable.
 */
export function markdownToBlocks(
  markdown: string,
  options: MarkdownToBlocksOptions = {}
): BlocksNode[] {
  const tree = fromMarkdown(markdown) as unknown as MdNode;
  const blocks: BlocksNode[] = [];

  for (const node of tree.children ?? []) {
    switch (node.type) {
      case "heading": {
        const depth = node.depth ?? 1;
        if (depth === 1) {
          // The page has exactly one h1 and it is the `title` field. A second
          // one damages both the layout and the page's outline for search, and
          // a generated document is not read closely enough to catch it.
          fail(
            node,
            `"${plainText(node)}" is a level-1 heading — the article's h1 is the title field, so use ## here`
          );
        }
        blocks.push({
          type: "heading",
          level: depth as 2 | 3 | 4 | 5 | 6,
          children: toInline(node.children ?? []),
        });
        break;
      }

      case "paragraph":
        if (isImageOnly(node)) {
          blocks.push(toImageBlock((node.children ?? [])[0], options));
        } else {
          const children = toInline(node.children ?? []);
          if (children.length > 0) blocks.push({ type: "paragraph", children });
        }
        break;

      case "list":
        blocks.push({
          type: "list",
          format: node.ordered ? "ordered" : "unordered",
          children: toListItems(node.children ?? []),
        });
        break;

      case "blockquote":
        blocks.push({ type: "quote", children: flattenToInline(node.children ?? []) });
        break;

      default:
        // thematicBreak, html, code fences and tables all land here. Strapi
        // has no node for most of them, and the ones it has are not part of
        // this design — refusing is louder than dropping.
        fail(node, `Unsupported block "${node.type}"`);
    }
  }

  return blocks;
}
