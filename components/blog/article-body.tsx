import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { getStrapiMedia } from "@/lib/strapi";
import type {
  BlocksImage,
  BlocksInline,
  BlocksList,
  BlocksListItem,
  BlocksNode,
} from "@/lib/article-body";

// Strapi Blocks → the article, rendered on the server and nowhere else.
//
// Hand-written rather than @strapi/blocks-react-renderer, which was weighed and
// rejected: every node below needs its own styling anyway, so the package's one
// real contribution is the nested inline-modifier walk — the twelve lines of
// `renderText` at the bottom. Against that it adds a third-party React
// dependency to track across versions for a page that has no interactivity at
// all. Nothing here is a client component and nothing here should become one.
//
// Two design elements Blocks has no node for, resolved by convention in #62 and
// enforced by the converter:
//   - a quote IS the red callout panel; the blog has no neutral quote style.
//   - an image's caption lives on the media entry, not in the body, so it
//     travels with the file wherever it is used.

interface ArticleBodyProps {
  blocks: BlocksNode[];
}

export function ArticleBody({ blocks }: ArticleBodyProps) {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {blocks.map((block, index) => (
        <BlockNode key={index} block={block} />
      ))}
    </div>
  );
}

function BlockNode({ block }: { block: BlocksNode }) {
  switch (block.type) {
    case "heading":
      return <Heading block={block} />;

    case "list":
      return <List block={block} />;

    case "quote":
      return (
        // The callout, and the reason the blog has one quote style. Not a
        // <blockquote> by accident: it is quoting the brand's own voice.
        <blockquote className="rounded-[24px] bg-coral px-6 py-6 lg:px-8 lg:py-7 text-white text-body-2 lg:text-body-1 font-medium">
          {renderInline(block.children)}
        </blockquote>
      );

    case "image":
      return <Figure block={block} />;

    case "paragraph":
      // Strapi emits an empty paragraph for a blank line; rendering it would
      // add a gap the author did not ask for on top of the flex gap above.
      if (!hasText(block.children)) return null;
      return (
        <p className="text-body-2 lg:text-body-1 text-neutral-300">
          {renderInline(block.children)}
        </p>
      );

    default:
      // Unreachable for a document the converter produced. A block type added
      // to Strapi later renders as nothing rather than crashing the page.
      return null;
  }
}

// The repo's own type scale (see CLAUDE.md), not hand-picked pixels: `##` is
// the section heading in the design and `###` the smaller one (#62), which is
// exactly what text-h2 and text-h3 are for.
const HEADING_SIZE = {
  2: "text-h2",
  3: "text-h3",
  4: "text-h4",
  5: "text-h4",
  6: "text-h4",
} as const;

function Heading({ block }: { block: Extract<BlocksNode, { type: "heading" }> }) {
  // Level 1 never arrives — the page's only h1 is the title, and
  // markdownToBlocks refuses a `#` rather than let a second one through.
  // The tag follows the level even where the size stops changing: h5 rendered
  // as an <h4> is a document outline that quietly disagrees with the article.
  const Tag = `h${block.level}` as const;

  return (
    <Tag
      className={`font-heading ${HEADING_SIZE[block.level]} font-bold text-white mt-2 lg:mt-4`}
    >
      {renderInline(block.children)}
    </Tag>
  );
}

function List({ block }: { block: BlocksList }) {
  const ListTag = block.format === "ordered" ? "ol" : "ul";

  return (
    <ListTag
      className={
        "flex flex-col gap-2 pl-6 text-body-2 lg:text-body-1 text-neutral-300 " +
        (block.format === "ordered" ? "list-decimal" : "list-disc")
      }
    >
      {nestSublists(block.children).map(({ item, sublists }, index) => (
        <li key={index} className={item ? "pl-1" : "list-none"}>
          {item ? renderInline(item.children) : null}
          {sublists.map((sublist, sublistIndex) => (
            <List key={sublistIndex} block={sublist} />
          ))}
        </li>
      ))}
    </ListTag>
  );
}

/**
 * Puts a hoisted sub-list back inside the item it belongs to.
 *
 * Strapi stores a nested list as a *sibling* of its parent item rather than a
 * child — it refuses the other nesting outright, so the converter hoists (see
 * lib/article-body.ts). Rendering that shape literally means a sub-list is its
 * own `<li>`, and an `<li>` increments the list counter whether or not its
 * marker is hidden: `1. / 2. / <sub-list> / 3.` prints the last item as **4**.
 * Re-nesting is what makes the numbering right, and it is also the only way to
 * get the indentation the second level is supposed to have.
 *
 * A list whose very first child is a sub-list has no item to attach to; it gets
 * a markerless `<li>` of its own, which is unreachable from Markdown but is not
 * worth crashing over if someone builds one by hand in the admin.
 */
function nestSublists(
  children: (BlocksListItem | BlocksList)[]
): { item: BlocksListItem | null; sublists: BlocksList[] }[] {
  const nested: { item: BlocksListItem | null; sublists: BlocksList[] }[] = [];

  for (const child of children) {
    if (child.type === "list") {
      const previous = nested[nested.length - 1];
      if (previous) previous.sublists.push(child);
      else nested.push({ item: null, sublists: [child] });
      continue;
    }
    nested.push({ item: child, sublists: [] });
  }

  return nested;
}

function Figure({ block }: { block: BlocksImage }) {
  const { image } = block;
  const caption = image.caption?.trim();

  return (
    <figure className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-[24px] bg-surface">
        <Image
          src={getStrapiMedia(image.url)}
          alt={image.alternativeText || caption || ""}
          // The intrinsic size travels with the media entry, which is what lets
          // the space be reserved before the image lands. Both are guaranteed
          // present: the API refuses an image block without them.
          width={image.width}
          height={image.height}
          sizes="(max-width: 767px) 100vw, 750px"
          className="h-auto w-full object-cover"
        />
      </div>
      {caption ? (
        <figcaption className="text-sm text-neutral-500">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

// ── inline ───────────────────────────────────────────────────────────────────

const LINK_CLASS =
  "text-coral underline underline-offset-4 hover:text-coral-dark transition-colors";

function renderInline(children: BlocksInline[]): React.ReactNode {
  return children.map((child, index) => {
    if (child.type === "link") {
      // Only a site path goes through the router. Anything else — an external
      // site, but also mailto:, tel: and a bare #anchor — is a plain <a>;
      // handing those to next/link asks it to route to a page that isn't one.
      if (child.url.startsWith("/")) {
        return (
          <Link key={index} href={child.url} className={LINK_CLASS}>
            {renderInline(child.children)}
          </Link>
        );
      }

      const external = /^https?:\/\//.test(child.url);

      return (
        <a
          key={index}
          href={child.url}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={LINK_CLASS}
        >
          {renderInline(child.children)}
        </a>
      );
    }

    return <Fragment key={index}>{renderText(child)}</Fragment>;
  });
}

/**
 * Modifiers nest, and Strapi sets them as flags on one text node rather than as
 * nested nodes — `**_bold italic_**` arrives as a single node with both. So they
 * are wrapped outward one at a time instead of switched between.
 */
function renderText(node: Extract<BlocksInline, { type: "text" }>): React.ReactNode {
  let rendered: React.ReactNode = node.text;

  if (node.code) {
    rendered = (
      <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9em]">{rendered}</code>
    );
  }
  if (node.bold) rendered = <strong className="font-semibold text-white">{rendered}</strong>;
  if (node.italic) rendered = <em>{rendered}</em>;
  if (node.underline) rendered = <u>{rendered}</u>;
  if (node.strikethrough) rendered = <s>{rendered}</s>;

  return rendered;
}

function hasText(children: BlocksInline[]): boolean {
  return children.some((child) =>
    child.type === "link" ? hasText(child.children) : child.text.trim() !== ""
  );
}
