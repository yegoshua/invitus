// Resolves the page copy for a shop category.
//
// The categories the site renders come from KeyCRM; the copy lives in
// content/category-copy.ts and is written by hand. Those two lists are not the
// same list and never will be — a category added in KeyCRM this morning has no
// entry here, and that has to render rather than 404 or throw. So every field
// this returns has a fallback, and `intro` is simply absent when nobody has
// written one.

import {
  categoryCopy,
  type CategoryIntroCopy,
} from "../content/category-copy.ts";

export interface ResolvedCategoryCopy {
  h1: string;
  metaDescription: string;
  /** null when this category has no hand-written copy yet. */
  intro: CategoryIntroCopy | null;
}

/** Heading for a category KeyCRM returned with a blank name. */
const FALLBACK_HEADING = "Каталог";

// Two fallbacks, because there are two different failures. A category with a
// name but no copy can still be described by template. A category with no
// usable name cannot: feeding the placeholder heading through the template
// produces «Купуйте каталог від INVITUS…», a sentence that reads as broken to
// anyone — search engine or human — who sees it in a result.
const NAMELESS_DESCRIPTION =
  "Екіпірування INVITUS для пауерліфтингу та важкої атлетики. Українське виробництво, доставка по всій Україні.";

function describeByTemplate(categoryName: string): string {
  return `Купуйте ${categoryName.toLowerCase()} від INVITUS. Українська якість для пауерліфтингу та важкої атлетики.`;
}

export function resolveCategoryCopy(
  slug: string,
  categoryName: string,
): ResolvedCategoryCopy {
  const copy = categoryCopy[slug];
  if (copy) return copy;

  const name = categoryName.trim();
  if (!name) {
    return {
      h1: FALLBACK_HEADING,
      metaDescription: NAMELESS_DESCRIPTION,
      intro: null,
    };
  }

  return {
    h1: name,
    metaDescription: describeByTemplate(name),
    intro: null,
  };
}
