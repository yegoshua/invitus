// Resolves the page copy for a shop category.
//
// The categories the site renders come from KeyCRM; the copy lives in
// content/category-copy.ts and is written by hand. Those two lists are not the
// same list and never will be — a category added in KeyCRM this morning has no
// entry here, and that has to render rather than 404 or throw. So every field
// this returns has a generated fallback, and `intro` is simply absent when
// nobody has written one.

import {
  categoryCopy,
  type CategoryIntro,
} from "../content/category-copy.ts";

export interface ResolvedCategoryCopy {
  h1: string;
  metaDescription: string;
  /** null when this category has no hand-written copy yet. */
  intro: CategoryIntro | null;
}

/** Last-resort heading, for a category KeyCRM returned with a blank name. */
const FALLBACK_HEADING = "Каталог";

function fallbackDescription(categoryName: string): string {
  return `Купуйте ${categoryName.toLowerCase()} від INVITUS. Українська якість для пауерліфтингу та важкої атлетики.`;
}

export function resolveCategoryCopy(
  slug: string,
  categoryName: string,
): ResolvedCategoryCopy {
  const copy = categoryCopy[slug];
  if (copy) return { ...copy };

  const name = categoryName.trim();

  return {
    h1: name || FALLBACK_HEADING,
    metaDescription: fallbackDescription(name || FALLBACK_HEADING),
    intro: null,
  };
}
