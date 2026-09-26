// The Design prompt: a fixed text with the customer's one free idea in it,
// copied into whatever AI model they use. The site generates nothing itself.
//
// The technical half is English because that is what every image model reads
// best; the idea stays in the customer's own language. It carries the Belt
// design's requirements and nothing about taste.

import { BELT_LENGTH_CM, type PrintZone } from "./belt-design.ts";
import { CUSTOM_BASE } from "./custom-base.ts";

/** The idea field's cap — long enough for a paragraph, short enough to stay an idea. */
export const IDEA_MAX_LENGTH = 500;

/** What stands in for an empty idea, so the customer knows where theirs goes. */
export const IDEA_PLACEHOLDER = "[Describe your idea here, in any language]";

const OPEN = "<<<";
const CLOSE = ">>>";

/**
 * One line, no delimiters. Whatever the customer typed — including something
 * shaped like a heading or a closing delimiter — cannot start a section of its
 * own; it can only ever be the idea.
 */
function normaliseIdea(idea: string): string {
  const line = idea
    .replaceAll(OPEN, " ")
    .replaceAll(CLOSE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, IDEA_MAX_LENGTH)
    .trim();
  return line || IDEA_PLACEHOLDER;
}

function percent(cm: number): number {
  return Math.round((cm / BELT_LENGTH_CM) * 100);
}

/** The Print zones, as the AI sees the banner: percent of its width, left to right. */
function zoneLines(zones: readonly PrintZone[]): string[] {
  const back = zones.find((z) => z.kind === "back");
  const hidden = zones.filter((z) => z.kind === "under-buckle");
  const left = hidden.find((z) => z.from === 0);
  const right = hidden.find((z) => z.to === BELT_LENGTH_CM);

  const lines: string[] = [];
  if (back) {
    lines.push(
      `- The centre of the banner (${percent(back.from)}–${percent(back.to)}% of its width) is the lifter's back: put the main motif there.`,
    );
  }
  lines.push("- The areas either side of the centre wrap around the lifter's sides: keep them secondary.");
  if (left && right) {
    lines.push(
      `- The outer ${percent(left.to - left.from)}% on the left and ${percent(right.to - right.from)}% on the right are hidden under the buckle: background only, nothing important.`,
    );
  }
  return lines;
}

export function buildDesignPrompt(
  idea: string,
  zones: readonly PrintZone[] = CUSTOM_BASE.printZones,
): string {
  return [
    "Create a flat surface design to be printed on the outside of a weightlifting belt.",
    "",
    "The idea, in the customer's own words (any language):",
    OPEN,
    normaliseIdea(idea),
    CLOSE,
    "",
    "Technical requirements:",
    "- A flat 2D artwork of the surface only: not a mockup, not a photo of a belt, no belt shape, buckle, stitching, perspective or shadows.",
    "- A very wide horizontal banner with an aspect ratio of 10:1. If 10:1 is not available, use the widest aspect ratio you have.",
    ...zoneLines(zones),
    "- Fill the background edge to edge with one solid colour, so the design can be extended seamlessly.",
    "- No text, letters, logos or watermarks, unless the idea asks for it.",
    "- High resolution with crisp details.",
  ].join("\n");
}
